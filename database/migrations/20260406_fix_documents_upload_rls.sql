-- Migration: Fix documents upload RLS policy
-- Date: 2026-04-06
--
-- Why this exists:
-- The storage upload policy previously queried public.documents directly.
-- If documents table RLS hides the placeholder row from the caller, upload fails
-- even when metadata was inserted correctly.

BEGIN;

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- Ensure authenticated clients can insert metadata via PostgREST.
GRANT INSERT ON TABLE public.documents TO authenticated;

-- Allow users with upload permission to create their own metadata placeholder.
DROP POLICY IF EXISTS "Documents: insert own metadata" ON public.documents;
CREATE POLICY "Documents: insert own metadata"
ON public.documents
FOR INSERT
TO authenticated
WITH CHECK (
  storage_bucket = 'documents'
  AND uploaded_by = auth.uid()
  AND deleted_at IS NULL
  AND has_permission('upload_documents'::text)
);

-- SECURITY DEFINER helper avoids depending on caller visibility of
-- public.documents rows when evaluating storage.objects insert policy.
CREATE OR REPLACE FUNCTION public.can_upload_document_object(object_name text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    EXISTS (
      SELECT 1
      FROM public.documents d
      WHERE d.storage_bucket = 'documents'
        AND d.storage_path = object_name
        AND d.deleted_at IS NULL
        AND d.uploaded_by = auth.uid()
    );
$$;

REVOKE ALL ON FUNCTION public.can_upload_document_object(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_upload_document_object(text) TO authenticated;

DROP POLICY IF EXISTS "Documents bucket: upload" ON storage.objects;
CREATE POLICY "Documents bucket: upload"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documents'
  AND public.can_upload_document_object(name)
);

COMMIT;
