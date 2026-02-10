/**
 * Operations-scoped document management page.
 *
 * Uses the shared `DocumentManager` component to list/upload/download/delete documents
 * under the "operation" scope (policies, memos, templates, etc.). Access is gated by
 * `PermissionGuard`.
 */
import DocumentManager from "@/components/documents/DocumentManager";
import PermissionGuard from "@/components/PermissionGuard";

export default function DocumentManagement() {
	return (
		<div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
			<div>
				<h2 className="text-3xl font-bold tracking-tight">
					Document Management
				</h2>
				<p className="text-muted-foreground">
					Manage operational documents and files.
				</p>
			</div>

			<PermissionGuard
				permission="view_documents"
				fallback={
					<div className="text-sm text-muted-foreground">
						Access denied.
					</div>
				}
			>
				<DocumentManager relatedType="operation" relatedId={null} />
			</PermissionGuard>
		</div>
	);
}
