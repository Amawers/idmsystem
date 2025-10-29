/**
 * @file IntakeSheetIVAC.jsx
 * @description Incidence on Violence Against Children (IVAC) intake form dialog
 * Manages IVAC case creation and editing with form validation and Supabase submission
 * 
 * @author IDM System
 * @date 2025-10-29
 */

"use client";
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { IncidenceVACForm } from "@/components/intake sheet IVAC/IncidenceVACForm";
import { useIntakeFormStore } from "@/store/useIntakeFormStore";
import { submitIVACCase, updateIVACCase } from "@/lib/ivacSubmission";
import { toast } from "sonner";
import { IconCircleCheck, IconAlertCircle } from "@tabler/icons-react";

export default function IntakeSheetIVAC({ open, setOpen, onSuccess, editingRecord }) {
  const { getAllData, resetAll, setSectionField } = useIntakeFormStore();
  const [isSaving, setIsSaving] = useState(false);
  const isEditMode = !!editingRecord;

  /**
   * Pre-fill form with editing record data
   */
  useEffect(() => {
    if (open && editingRecord) {
      console.log("🔄 Pre-filling IVAC form with:", editingRecord);
      
      // Map database fields to form fields
      const formData = {
        province: editingRecord.province || "Misamis Oriental",
        municipality: editingRecord.municipality || "Villanueva",
        records: editingRecord.records || [],
        caseManagers: editingRecord.case_managers || [],
        status: editingRecord.status || "",
        // Store caseDetails separately
        caseDetails: {
          caseManagers: editingRecord.case_managers || [],
          status: editingRecord.status || "",
        },
      };

      // Pre-fill the form store
      setSectionField("incidenceOnVAC", formData);
    }
  }, [open, editingRecord, setSectionField]);

  /**
   * Handle IVAC case creation or update
   * Validates form data, submits to Supabase, and handles success/error states
   */
  const handleSubmit = async () => {
    try {
      setIsSaving(true);
      const allData = getAllData() || {};

      console.log("🔍 Full IVAC intake data:", allData);

      if (isEditMode) {
        // Update existing record
        const { error } = await updateIVACCase(editingRecord.id, allData);

        if (error) {
          console.error("❌ Failed to update IVAC case:", error);
          toast.error("Failed to update Incidence on VAC record", {
            description: error.message || "An unexpected error occurred. Please try again.",
          });
          return;
        }

        console.log("✅ IVAC case updated successfully:", editingRecord.id);
        toast.success("Incidence on VAC record updated successfully!", {
          description: `Case ID: ${editingRecord.id}`,
        });
      } else {
        // Create new record
        const { caseId, error } = await submitIVACCase(allData);

        if (error) {
          console.error("❌ Failed to create IVAC case:", error);
          toast.error("Failed to create Incidence on VAC record", {
            description: error.message || "An unexpected error occurred. Please try again.",
          });
          return;
        }

        console.log("✅ IVAC case created successfully:", caseId);
        toast.success("Incidence on VAC record created successfully!", {
          description: `Case ID: ${caseId}`,
        });
      }

      // Reset form and close dialog
      resetAll();
      setOpen(false);
      
      // Trigger reload of IVAC data if callback provided
      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      console.error("❌ Unexpected error:", err);
      toast.error(`Failed to ${isEditMode ? 'update' : 'create'} Incidence on VAC record`, {
        description: "An unexpected error occurred. Please try again.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Navigation functions
  const goNext = async () => {
    // Form completed - submit to database
    await handleSubmit();
  };

  const goBack = () => {
    // Close dialog when going back (since there's only one form)
    resetAll();
    setOpen(false);
  };

  // Reset form when dialog opens (only for create mode)
  useEffect(() => {
    if (open && !editingRecord) {
      resetAll();
    }
  }, [open, editingRecord, resetAll]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-h-[90vh] min-w-[90vw] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span>{isEditMode ? "Edit Incidence on VAC" : "Incidence on Violence Against Children"}</span>
            {isEditMode && editingRecord?.status && (
              editingRecord.status === "Inactive" ? (
                <Badge variant="outline" className="flex items-center gap-1.5 px-3 py-1 border-2 border-red-600 bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400 dark:border-red-500">
                  <IconAlertCircle className="h-4 w-4" />
                  <span className="text-xs font-medium">Inactive Record</span>
                </Badge>
              ) : editingRecord.status === "Active" ? (
                <Badge variant="outline" className="flex items-center gap-1.5 px-3 py-1 border-2 border-green-600 bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400 dark:border-green-500">
                  <IconCircleCheck className="h-4 w-4" />
                  <span className="text-xs font-medium">Active Record</span>
                </Badge>
              ) : null
            )}
          </DialogTitle>
        </DialogHeader>
        {/* main content: make this fill remaining vertical space and scroll when needed */}
        <div className="overflow-auto p-4">
          <IncidenceVACForm
            sectionKey="incidenceOnVAC"
            goNext={goNext}
            goBack={goBack}
            isSaving={isSaving}
            isEditMode={isEditMode}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
