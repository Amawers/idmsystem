/**
 * Centralized API for document metadata + Supabase Storage operations.
 *
 * Responsibilities:
 * - Create a metadata row in `public.documents`.
 * - Upload file bytes to the Supabase Storage bucket `documents`.
 * - List documents for a related entity (case/program/operation).
 * - Create signed download URLs.
 * - Delete a document (storage object + metadata row).
 *
 * Notes:
 * - Uses a two-step flow: insert metadata -> upload file.
 *   This matches common Storage RLS patterns where uploads are permitted only if a
 *   corresponding metadata row exists for (user, bucket, path).
 */

import supabase from "@/../config/supabase";

const DOCUMENT_BUCKET = "documents";

/**
 * @typedef {"case"|"program"|"operation"} DocumentRelatedType
 */

/**
 * @typedef {Object} DocumentRow
 * @property {string} id
 * @property {DocumentRelatedType} related_type
 * @property {string|null} related_id
 * @property {string|null} title
 * @property {string|null} description
 * @property {string} original_filename
 * @property {string} storage_bucket
 * @property {string} storage_path
 * @property {string|null} mime_type
 * @property {number|null} size_bytes
 * @property {string|null} uploaded_by
 * @property {string} created_at
 * @property {string|null} deleted_at
 * @property {string|null} deleted_by
 */

/**
 * Normalizes a user-provided filename for safe use in storage paths.
 * @param {string} name
 * @returns {string}
 */
function sanitizeFilename(name) {
	if (!name) return "file";
	return name
		.replace(/[/\\]/g, "-")
		.replace(/\s+/g, " ")
		.trim()
		.slice(0, 180);
}

/**
 * Infers MIME type from a browser `File` object.
 * @param {File} file
 * @returns {string|null}
 */
function inferMimeType(file) {
	return file?.type || null;
}

/**
 * Builds a unique storage path for a document.
 * @param {{ relatedType: DocumentRelatedType, relatedId: string|null, originalFilename: string }} params
 * @returns {string}
 */
function buildStoragePath({ relatedType, relatedId, originalFilename }) {
	const safeName = sanitizeFilename(originalFilename);
	const uuid =
		globalThis.crypto && typeof globalThis.crypto.randomUUID === "function"
			? globalThis.crypto.randomUUID()
			: `${Date.now()}_${Math.random().toString(16).slice(2)}`;

	const scope = relatedType;
	const idPart = relatedId || "general";
	return `${scope}/${idPart}/${uuid}_${safeName}`;
}

/**
 * Lists active (non-deleted) documents for a given related entity.
 *
 * @param {Object} params
 * @param {DocumentRelatedType} params.relatedType
 * @param {string|null} params.relatedId
 * @returns {Promise<DocumentRow[]>}
 */
export async function listDocuments({ relatedType, relatedId }) {
	const query = supabase
		.from("documents")
		.select(
			"id, related_type, related_id, title, description, original_filename, storage_bucket, storage_path, mime_type, size_bytes, uploaded_by, created_at, deleted_at, deleted_by",
		)
		.eq("related_type", relatedType)
		.is("deleted_at", null)
		.order("created_at", { ascending: false });

	if (relatedId) query.eq("related_id", relatedId);
	else query.is("related_id", null);

	const { data, error } = await query;
	if (error) throw error;
	return data || [];
}

/**
 * Creates a metadata placeholder row. Storage upload policy expects this row to exist first.
 *
 * @param {Object} params
 * @param {DocumentRelatedType} params.relatedType
 * @param {string|null} params.relatedId
 * @param {File} params.file
 * @param {string|null} [params.title]
 * @param {string|null} [params.description]
 * @returns {Promise<DocumentRow>}
 */
export async function createDocumentMetadata({
	relatedType,
	relatedId,
	file,
	title = null,
	description = null,
}) {
	if (!file) throw new Error("No file provided");

	const storagePath = buildStoragePath({
		relatedType,
		relatedId,
		originalFilename: file.name,
	});

	const { data: userData, error: userError } = await supabase.auth.getUser();
	if (userError) throw userError;
	const userId = userData?.user?.id;
	if (!userId) throw new Error("Not authenticated");

	const payload = {
		related_type: relatedType,
		related_id: relatedId || null,
		title,
		description,
		original_filename: file.name,
		storage_bucket: DOCUMENT_BUCKET,
		storage_path: storagePath,
		mime_type: inferMimeType(file),
		size_bytes: typeof file.size === "number" ? file.size : null,
		uploaded_by: userId,
	};

	const { data, error } = await supabase
		.from("documents")
		.insert(payload)
		.select()
		.single();

	if (error) throw error;
	return data;
}

/**
 * Uploads the file into storage at the document's storage path.
 *
 * @param {Object} params
 * @param {string} params.storagePath
 * @param {File} params.file
 * @returns {Promise<true>}
 */
export async function uploadDocumentFile({ storagePath, file }) {
	const { error } = await supabase.storage
		.from(DOCUMENT_BUCKET)
		.upload(storagePath, file, {
			upsert: false,
			contentType: inferMimeType(file) || undefined,
		});

	if (error) throw error;
	return true;
}

/**
 * Creates a signed URL for downloading.
 *
 * @param {Object} params
 * @param {string} params.storagePath
 * @param {number} [params.expiresInSeconds=300]
 * @returns {Promise<string|null>}
 */
export async function createDocumentSignedUrl({
	storagePath,
	expiresInSeconds = 300,
}) {
	const { data, error } = await supabase.storage
		.from(DOCUMENT_BUCKET)
		.createSignedUrl(storagePath, expiresInSeconds);

	if (error) throw error;
	return data?.signedUrl || null;
}

/**
 * Deletes the storage object and then deletes the metadata row.
 *
 * @param {Object} params
 * @param {DocumentRow} params.documentRow
 * @returns {Promise<true>}
 */
export async function deleteDocument({ documentRow }) {
	if (!documentRow?.id) throw new Error("Invalid document");
	if (!documentRow?.storage_path) throw new Error("Missing storage path");

	// Best-effort: delete storage first, then metadata.
	const { error: storageError } = await supabase.storage
		.from(DOCUMENT_BUCKET)
		.remove([documentRow.storage_path]);

	if (storageError) throw storageError;

	const { error: dbError } = await supabase
		.from("documents")
		.delete()
		.eq("id", documentRow.id);

	if (dbError) throw dbError;

	return true;
}

/**
 * Full upload helper: creates metadata -> uploads file.
 * Cleans up metadata if upload fails.
 *
 * @param {Object} params
 * @param {DocumentRelatedType} params.relatedType
 * @param {string|null} params.relatedId
 * @param {File} params.file
 * @param {string|null} [params.title]
 * @param {string|null} [params.description]
 * @returns {Promise<DocumentRow>}
 */
export async function uploadDocument({
	relatedType,
	relatedId,
	file,
	title = null,
	description = null,
}) {
	const doc = await createDocumentMetadata({
		relatedType,
		relatedId,
		file,
		title,
		description,
	});
	try {
		await uploadDocumentFile({ storagePath: doc.storage_path, file });
		return doc;
	} catch (err) {
		// Cleanup: delete the metadata row if the file upload fails.
		try {
			await supabase.from("documents").delete().eq("id", doc.id);
		} catch {
			// ignore cleanup error
		}
		throw err;
	}
}
