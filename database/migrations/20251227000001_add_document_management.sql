-- Migration: Add Document and File Management
-- Description: Adds document metadata table + permissions + RLS policies + Supabase Storage bucket policies
-- Date: 2025-12-27
-- Author: System

-- =============================
-- 1) Seed permissions
-- =============================
INSERT INTO public.permissions (name, display_name, description, category) VALUES
  ('view_documents', 'View Documents', 'Allows viewing and downloading documents attached to cases/programs/operations', 'Document Management'),
  ('upload_documents', 'Upload Documents', 'Allows uploading and attaching documents to cases/programs/operations', 'Document Management'),
  ('delete_documents', 'Delete Documents', 'Allows deleting documents (limited by RLS rules)', 'Document Management')
ON CONFLICT (name) DO NOTHING;

-- =============================
-- 2) Helper functions for RLS
-- =============================
CREATE OR REPLACE FUNCTION public.is_head()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profile
    WHERE profile.id = auth.uid()
      AND profile.role = 'head'
  );
$$;

CREATE OR REPLACE FUNCTION public.has_permission(permission_name text)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT public.is_head()
  OR EXISTS (
    SELECT 1
    FROM public.user_permissions up
    JOIN public.permissions p ON p.id = up.permission_id
    WHERE up.user_id = auth.uid()
      AND p.name = permission_name
  );
$$;

-- =============================
-- 3) Documents table
-- =============================
CREATE TABLE IF NOT EXISTS public.documents (
  id UUID NOT NULL DEFAULT gen_random_uuid(),

  -- Attachment scope
  related_type TEXT NOT NULL,
  related_id UUID NULL,

  -- User-facing metadata
  title TEXT NULL,
  description TEXT NULL,
  original_filename TEXT NOT NULL,

  -- Storage metadata
  storage_bucket TEXT NOT NULL DEFAULT 'documents',
  storage_path TEXT NOT NULL,
  mime_type TEXT NULL,
  size_bytes BIGINT NULL,

  -- Ownership and lifecycle
  uploaded_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL,
  deleted_by UUID NULL,

  CONSTRAINT documents_pkey PRIMARY KEY (id),
  CONSTRAINT documents_related_type_check CHECK (related_type IN ('case', 'program', 'operation')),
  CONSTRAINT documents_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES auth.users (id) ON DELETE RESTRICT,
  CONSTRAINT documents_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES auth.users (id) ON DELETE SET NULL,
  CONSTRAINT documents_storage_unique UNIQUE (storage_bucket, storage_path)
);

CREATE INDEX IF NOT EXISTS idx_documents_related ON public.documents USING btree (related_type, related_id);
CREATE INDEX IF NOT EXISTS idx_documents_uploaded_by ON public.documents USING btree (uploaded_by);
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON public.documents USING btree (created_at);

-- =============================
-- 4) Row Level Security for documents
-- =============================
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- SELECT: must have view permission; for case-related docs, also respect hidden_cases
CREATE POLICY "Documents: view"
  ON public.documents
  FOR SELECT
  USING (
    deleted_at IS NULL
    AND public.has_permission('view_documents')
    AND (
      related_type <> 'case'
      OR NOT EXISTS (
        SELECT 1
        FROM public.hidden_cases hc
        WHERE hc.case_id = related_id
          AND hc.hidden_from_user_id = auth.uid()
      )
    )
  );

-- INSERT: must have upload permission and be the uploader
CREATE POLICY "Documents: upload"
  ON public.documents
  FOR INSERT
  WITH CHECK (
    public.has_permission('upload_documents')
    AND uploaded_by = auth.uid()
    AND deleted_at IS NULL
  );

-- UPDATE: uploader can update their own docs (used for metadata edits if needed)
CREATE POLICY "Documents: update own"
  ON public.documents
  FOR UPDATE
  USING (
    public.has_permission('upload_documents')
    AND uploaded_by = auth.uid()
  )
  WITH CHECK (
    public.has_permission('upload_documents')
    AND uploaded_by = auth.uid()
  );

-- DELETE: head can delete any; otherwise user can delete their own if they have delete permission
CREATE POLICY "Documents: delete"
  ON public.documents
  FOR DELETE
  USING (
    public.has_permission('delete_documents')
    AND (public.is_head() OR uploaded_by = auth.uid())
  );

-- =============================
-- 5) Supabase Storage bucket + RLS policies
-- =============================
-- Note: Supabase Storage uses storage.objects and storage.buckets
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

-- IMPORTANT:
-- Policies on storage.objects require table owner (typically `postgres`/`supabase_admin`).
-- If you run this migration with a non-owner DB role, you'll see: "must be owner of table objects".
-- To keep migrations from hard-failing in that scenario, policy creation is wrapped and will emit
-- a NOTICE if privileges are insufficient.
DO $$
BEGIN
  -- Allow reading only when there is a visible, non-deleted document row referencing the object
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Documents bucket: read'
  ) THEN
    BEGIN
      EXECUTE $POLICY$
        CREATE POLICY "Documents bucket: read"
          ON storage.objects
          FOR SELECT
          USING (
            bucket_id = 'documents'
            AND EXISTS (
              SELECT 1
              FROM public.documents d
              WHERE d.storage_bucket = 'documents'
                AND d.storage_path = storage.objects.name
                AND d.deleted_at IS NULL
                AND public.has_permission('view_documents')
                AND (
                  d.related_type <> 'case'
                  OR NOT EXISTS (
                    SELECT 1
                    FROM public.hidden_cases hc
                    WHERE hc.case_id = d.related_id
                      AND hc.hidden_from_user_id = auth.uid()
                  )
                )
            )
          );
      $POLICY$;
    EXCEPTION WHEN insufficient_privilege THEN
      RAISE NOTICE 'Skipping storage.objects policy "Documents bucket: read" (insufficient privileges). Run as postgres/supabase_admin to apply storage policies.';
    END;
  END IF;

  -- Allow upload only if metadata row exists for this user/path
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Documents bucket: upload'
  ) THEN
    BEGIN
      EXECUTE $POLICY$
        CREATE POLICY "Documents bucket: upload"
          ON storage.objects
          FOR INSERT
          WITH CHECK (
            bucket_id = 'documents'
            AND EXISTS (
              SELECT 1
              FROM public.documents d
              WHERE d.storage_bucket = 'documents'
                AND d.storage_path = storage.objects.name
                AND d.deleted_at IS NULL
                AND d.uploaded_by = auth.uid()
                AND public.has_permission('upload_documents')
            )
          );
      $POLICY$;
    EXCEPTION WHEN insufficient_privilege THEN
      RAISE NOTICE 'Skipping storage.objects policy "Documents bucket: upload" (insufficient privileges). Run as postgres/supabase_admin to apply storage policies.';
    END;
  END IF;

  -- Allow delete if permitted to delete the backing document
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Documents bucket: delete'
  ) THEN
    BEGIN
      EXECUTE $POLICY$
        CREATE POLICY "Documents bucket: delete"
          ON storage.objects
          FOR DELETE
          USING (
            bucket_id = 'documents'
            AND EXISTS (
              SELECT 1
              FROM public.documents d
              WHERE d.storage_bucket = 'documents'
                AND d.storage_path = storage.objects.name
                AND d.deleted_at IS NULL
                AND public.has_permission('delete_documents')
                AND (public.is_head() OR d.uploaded_by = auth.uid())
            )
          );
      $POLICY$;
    EXCEPTION WHEN insufficient_privilege THEN
      RAISE NOTICE 'Skipping storage.objects policy "Documents bucket: delete" (insufficient privileges). Run as postgres/supabase_admin to apply storage policies.';
    END;
  END IF;
END $$;

DO $$
BEGIN
  RAISE NOTICE 'Successfully added document management (documents table, permissions, RLS, and storage policies)';
END $$;
