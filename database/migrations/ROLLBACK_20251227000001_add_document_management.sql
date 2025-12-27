-- ROLLBACK Migration: Remove Document and File Management
-- Description: Drops documents metadata, permissions, and RLS/storage policies created in 20251227000001
-- Date: 2025-12-27
-- Author: System

-- =============================
-- 1) Drop storage policies (if they exist)
-- =============================
DO $$
BEGIN
  BEGIN
    DROP POLICY IF EXISTS "Documents bucket: delete" ON storage.objects;
    DROP POLICY IF EXISTS "Documents bucket: upload" ON storage.objects;
    DROP POLICY IF EXISTS "Documents bucket: read" ON storage.objects;
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE 'Skipping drop of storage.objects document policies (insufficient privileges). Run rollback as postgres/supabase_admin to fully remove storage policies.';
  END;
END $$;

-- Optional: remove bucket (will fail if objects still exist; keep best-effort)
DELETE FROM storage.buckets WHERE id = 'documents';

-- =============================
-- 2) Drop documents table policies + table
-- =============================
DROP POLICY IF EXISTS "Documents: delete" ON public.documents;
DROP POLICY IF EXISTS "Documents: update own" ON public.documents;
DROP POLICY IF EXISTS "Documents: upload" ON public.documents;
DROP POLICY IF EXISTS "Documents: view" ON public.documents;

DROP TABLE IF EXISTS public.documents;

-- =============================
-- 3) Drop helper functions
-- =============================
DROP FUNCTION IF EXISTS public.has_permission(text);
DROP FUNCTION IF EXISTS public.is_head();

-- =============================
-- 4) Remove permissions and assignments
-- =============================
DELETE FROM public.user_permissions
WHERE permission_id IN (
  SELECT id FROM public.permissions WHERE name IN (
    'view_documents',
    'upload_documents',
    'delete_documents'
  )
);

DELETE FROM public.permissions
WHERE name IN (
  'view_documents',
  'upload_documents',
  'delete_documents'
);

DO $$
BEGIN
  RAISE NOTICE 'Successfully rolled back document management';
END $$;
