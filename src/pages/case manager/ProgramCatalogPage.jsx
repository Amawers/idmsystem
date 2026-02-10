/**
 * Program catalog page.
 *
 * Responsibilities:
 * - Render `ProgramCatalog`, delegating listing/filtering/edit flows.
 * - Gate program creation via `PermissionGuard`.
 * - Remount `ProgramCatalog` after successful creation to refetch fresh data.
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import ProgramCatalog from "@/components/programs/ProgramCatalog";
import CreateProgramDialog from "@/components/programs/CreateProgramDialog";
import PermissionGuard from "@/components/PermissionGuard";

/**
 * Program catalog management view.
 * @returns {JSX.Element}
 */
export default function ProgramCatalogPage() {
	const [createDialogOpen, setCreateDialogOpen] = useState(false);
	const [catalogKey, setCatalogKey] = useState(0);

	/**
	 * After creating a program, remount the catalog to refetch fresh data.
	 * @returns {void}
	 */
	const handleProgramCreated = () => {
		setCatalogKey((prev) => prev + 1);
	};

	return (
		<div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
			<div className="flex items-center justify-between">
				<div>
					<h2 className="text-3xl font-bold tracking-tight">
						Program Catalog
					</h2>
					<p className="text-muted-foreground">
						Manage intervention programs and services
					</p>
				</div>
				<PermissionGuard permission="create_program">
					<Button
						onClick={() => setCreateDialogOpen(true)}
						className="cursor-pointer"
					>
						<Plus className="mr-2 h-4 w-4" />
						Create Program
					</Button>
				</PermissionGuard>
			</div>

			<ProgramCatalog key={catalogKey} />

			<CreateProgramDialog
				open={createDialogOpen}
				onOpenChange={setCreateDialogOpen}
				onSuccess={handleProgramCreated}
			/>
		</div>
	);
}
