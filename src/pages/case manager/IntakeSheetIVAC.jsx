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
import { buildIVACCasePayload, validateIVACData } from "@/lib/ivacSubmission";
import { createOrUpdateLocalIvacCase, getIvacCaseById, getIvacCaseByLocalId } from "@/services/ivacOfflineService";
import { toast } from "sonner";
import { IconCircleCheck, IconAlertCircle } from "@tabler/icons-react";

const isBrowserOnline = () => (typeof navigator !== "undefined" ? navigator.onLine : true);
const forceIvacTabReload = () => {
  if (typeof window === "undefined") return;
  sessionStorage.setItem("caseManagement.activeTab", "IVAC");
  sessionStorage.setItem("caseManagement.forceTabAfterReload", "IVAC");
  sessionStorage.setItem("caseManagement.forceIvacSync", "true");
  window.location.reload();
};

export default function IntakeSheetIVAC({ open, setOpen, onSuccess, editingRecord }) {
  const { getAllData, resetAll, setSectionField } = useIntakeFormStore();
  const [isSaving, setIsSaving] = useState(false);
  const isEditMode = !!editingRecord;

  /**
   * Pre-fill form with editing record data
   */
  useEffect(() => {
    let isActive = true;
    async function hydrateForm() {
      if (!open) return;

      if (!editingRecord) {
        resetAll();
        return;
      }

      console.log("🔄 Pre-filling IVAC form with:", editingRecord);
      try {
        let sourceRecord = editingRecord;
        if (editingRecord?.localId != null) {
          const local = await getIvacCaseByLocalId(editingRecord.localId);
          if (local) sourceRecord = local;
        } else if (editingRecord?.id) {
          const cached = await getIvacCaseById(editingRecord.id);
          if (cached) sourceRecord = cached;
        }

        if (!isActive) return;

        const formData = {
          province: sourceRecord?.province || "Misamis Oriental",
          municipality: sourceRecord?.municipality || "Villanueva",
          records: sourceRecord?.records || [],
          caseManagers: sourceRecord?.case_managers || [],
          status: sourceRecord?.status || "",
          caseDetails: {
            caseManagers: sourceRecord?.case_managers || [],
            status: sourceRecord?.status || "",
          },
        };

        setSectionField("incidenceOnVAC", formData);
      } catch (err) {
        if (!isActive) return;
        console.error("❌ Failed to load IVAC case:", err);
        toast.error("Error loading Incidence on VAC record", {
          description: err.message || "An unexpected error occurred.",
        });
      }
    }

    hydrateForm();
    return () => {
      isActive = false;
    };
  }, [open, editingRecord, resetAll, setSectionField]);

  /**
   * Handle IVAC case creation or update
   * Validates form data, submits to Supabase, and handles success/error states
   */
  const handleSubmit = async () => {
    try {
      setIsSaving(true);
      const allData = getAllData() || {};

      console.log("🔍 Full IVAC intake data:", allData);

      const validation = validateIVACData(allData);
      if (!validation.valid) {
        toast.error("IVAC form incomplete", {
          description: validation.errors.join(", "),
        });
        return;
      }

      const casePayload = buildIVACCasePayload(allData);
      await createOrUpdateLocalIvacCase({
        casePayload,
        targetId: editingRecord?.id ?? null,
        localId: editingRecord?.localId ?? null,
        mode: isEditMode ? "update" : "create",
      });

      const online = isBrowserOnline();
      toast.success(
        isEditMode ? "Incidence on VAC saved" : "Incidence on VAC queued",
        {
          description: online
            ? "Sync queued and will push shortly."
            : "Stored locally. Sync once you're online.",
        },
      );

      resetAll();
      setOpen(false);
      if (onSuccess) {
        onSuccess();
      }

      if (online) {
        setTimeout(forceIvacTabReload, 0);
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
