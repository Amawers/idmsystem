/**
 * @file ProgramCatalogPage.jsx
 * @description Program catalog management page
 * @module pages/case-manager/ProgramCatalogPage
 * 
 * Features:
 * - View all programs
 * - Create new programs
 * - Edit/delete programs
 * - Filter and search programs
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import ProgramCatalog from "@/components/programs/ProgramCatalog";
import CreateProgramDialog from "@/components/programs/CreateProgramDialog";

/**
 * Program Catalog Page Component
 * @returns {JSX.Element} Program catalog page
 */
export default function ProgramCatalogPage() {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [catalogKey, setCatalogKey] = useState(0);

  const handleProgramCreated = () => {
    // Force ProgramCatalog to remount and fetch fresh data
    setCatalogKey(prev => prev + 1);
  };

  return (
    <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Program Catalog</h2>
          <p className="text-muted-foreground">
            Manage intervention programs and services
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)} className="cursor-pointer">
          <Plus className="mr-2 h-4 w-4" />
          Create Program
        </Button>
      </div>

      {/* Catalog Component */}
      <ProgramCatalog key={catalogKey} />

      {/* Create Program Dialog */}
      <CreateProgramDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={handleProgramCreated}
      />
    </div>
  );
}
