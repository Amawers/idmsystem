// =============================================
// DocumentManager Component
// ---------------------------------------------
// Purpose: Reusable UI for attaching and managing documents for a specific entity.
//
// Key Responsibilities:
// - List documents for (relatedType, relatedId)
// - Upload documents (permission-gated)
// - Download documents via signed URL
// - Delete documents (permission-gated)
//
// Notes:
// - Designed to be embedded in dialogs on case/program pages.
// - Uses Supabase RLS for real enforcement; UI uses PermissionGuard for UX.
// =============================================

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { PermissionGuard } from "@/components/PermissionGuard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import {
	createDocumentSignedUrl,
	deleteDocument,
	listDocuments,
	uploadDocument,
} from "@/services/documentService";

function formatBytes(bytes) {
	if (bytes == null || Number.isNaN(bytes)) return "—";
	const units = ["B", "KB", "MB", "GB"];
	let size = bytes;
	let unitIndex = 0;
	while (size >= 1024 && unitIndex < units.length - 1) {
		size /= 1024;
		unitIndex += 1;
	}
	return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

/**
 * @param {Object} props
 * @param {'case'|'program'|'operation'} props.relatedType
 * @param {string|null} props.relatedId
 * @param {boolean} [props.open] When provided, loads only when open becomes true
 */
export default function DocumentManager({ relatedType, relatedId, open }) {
	const isOnline = useNetworkStatus();
	const [rows, setRows] = useState([]);
	const [loading, setLoading] = useState(false);
	const [uploading, setUploading] = useState(false);
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [rowToDelete, setRowToDelete] = useState(null);
	const fileInputRef = useRef(null);

	const canLoad = useMemo(() => {
		if (typeof open === "boolean") return open;
		return true;
	}, [open]);

	const reload = useCallback(async () => {
		if (!canLoad) return;
		setLoading(true);
		try {
			const data = await listDocuments({ relatedType, relatedId });
			setRows(data);
		} catch (err) {
			console.error("Failed to load documents:", err);
			toast.error("Failed to load documents", {
				description: err?.message || "Please try again.",
			});
		} finally {
			setLoading(false);
		}
	}, [canLoad, relatedType, relatedId]);

	useEffect(() => {
		reload();
	}, [reload]);

	const onPickFile = () => {
		fileInputRef.current?.click();
	};

	const onUploadSelected = async (e) => {
		const file = e.target.files?.[0];
		e.target.value = "";
		if (!file) return;
		if (!isOnline) {
			toast.error("Offline", { description: "Connect to the internet to upload documents." });
			return;
		}

		setUploading(true);
		try {
			await uploadDocument({ relatedType, relatedId, file });
			toast.success("Uploaded", { description: file.name });
			await reload();
		} catch (err) {
			console.error("Upload failed:", err);
			toast.error("Upload failed", { description: err?.message || "Please try again." });
		} finally {
			setUploading(false);
		}
	};

	const onDownload = async (row) => {
		if (!row?.storage_path) return;
		if (!isOnline) {
			toast.error("Offline", { description: "Connect to the internet to download documents." });
			return;
		}

		try {
			const signedUrl = await createDocumentSignedUrl({ storagePath: row.storage_path, expiresInSeconds: 300 });
			if (!signedUrl) throw new Error("Failed to create download link");
			window.open(signedUrl, "_blank", "noopener,noreferrer");
		} catch (err) {
			console.error("Download failed:", err);
			toast.error("Download failed", { description: err?.message || "Please try again." });
		}
	};

	const requestDelete = (row) => {
		setRowToDelete(row);
		setDeleteDialogOpen(true);
	};

	const confirmDelete = async () => {
		if (!rowToDelete) return;
		if (!isOnline) {
			toast.error("Offline", { description: "Connect to the internet to delete documents." });
			return;
		}

		try {
			await deleteDocument({ documentRow: rowToDelete });
			toast.success("Deleted", { description: rowToDelete.original_filename });
			setDeleteDialogOpen(false);
			setRowToDelete(null);
			await reload();
		} catch (err) {
			console.error("Delete failed:", err);
			toast.error("Delete failed", { description: err?.message || "Please try again." });
		}
	};

	return (
		<Card>
			<CardHeader className="flex flex-row items-center justify-between">
				<CardTitle>Documents</CardTitle>
				<div className="flex items-center gap-2">
					<input
						ref={fileInputRef}
						type="file"
						className="hidden"
						onChange={onUploadSelected}
					/>
					<PermissionGuard permission="upload_documents" fallback={null}>
						<Button onClick={onPickFile} disabled={!isOnline || uploading}>
							{uploading ? "Uploading..." : "Upload"}
						</Button>
					</PermissionGuard>
					<Button variant="outline" onClick={reload} disabled={loading}>
						Refresh
					</Button>
				</div>
			</CardHeader>
			<CardContent>
				{!isOnline && (
					<div className="mb-3 text-sm text-muted-foreground">
						Offline mode: uploads/downloads are disabled.
					</div>
				)}

				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>File</TableHead>
							<TableHead>Type</TableHead>
							<TableHead>Size</TableHead>
							<TableHead>Date</TableHead>
							<TableHead className="text-right">Actions</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{loading ? (
							<TableRow>
								<TableCell colSpan={5} className="text-sm text-muted-foreground">
									Loading...
								</TableCell>
							</TableRow>
						) : rows.length === 0 ? (
							<TableRow>
								<TableCell colSpan={5} className="text-sm text-muted-foreground">
									No documents found.
								</TableCell>
							</TableRow>
						) : (
							rows.map((row) => (
								<TableRow key={row.id}>
									<TableCell className="font-medium">{row.original_filename}</TableCell>
									<TableCell className="text-sm text-muted-foreground">{row.mime_type || "—"}</TableCell>
									<TableCell className="text-sm text-muted-foreground">{formatBytes(row.size_bytes)}</TableCell>
									<TableCell className="text-sm text-muted-foreground">
										{row.created_at ? new Date(row.created_at).toLocaleString() : "—"}
									</TableCell>
									<TableCell className="text-right">
										<div className="flex items-center justify-end gap-2">
											<PermissionGuard permission="view_documents" fallback={null}>
												<Button
													variant="outline"
													size="sm"
													onClick={() => onDownload(row)}
													disabled={!isOnline}
												>
													Download
												</Button>
											</PermissionGuard>

											<PermissionGuard permission="delete_documents" fallback={null}>
												<Button
													variant="destructive"
													size="sm"
													onClick={() => requestDelete(row)}
													disabled={!isOnline}
												>
													Delete
												</Button>
											</PermissionGuard>
										</div>
									</TableCell>
								</TableRow>
							))
						)
						}
					</TableBody>
				</Table>
			</CardContent>

			<AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete document?</AlertDialogTitle>
						<AlertDialogDescription>
							This will permanently delete the file and its record.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel onClick={() => setRowToDelete(null)}>Cancel</AlertDialogCancel>
						<AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</Card>
	);
}
