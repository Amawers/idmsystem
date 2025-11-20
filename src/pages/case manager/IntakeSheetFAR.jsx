/**
 * @file IntakeSheetFAR.jsx
 * @description Family Assistance Record (FAR) intake form dialog
 * Manages FAR case creation and editing with form validation and Supabase submission
 * 
 * @author IDM System
 * @date 2025-10-23
 */

"use client";
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FamilyAssistanceForm } from "@/components/intake sheet FAR/FamilyAssistanceForm";
import { useIntakeFormStore } from "@/store/useIntakeFormStore";
import { buildFARCasePayload } from "@/lib/farSubmission";
import { createOrUpdateLocalFarCase, getFarCaseById, getFarCaseByLocalId } from "@/services/farOfflineService";
import { toast } from "sonner";

const isBrowserOnline = () => (typeof navigator !== "undefined" ? navigator.onLine : true);
const forceFarTabReload = () => {
  if (typeof window === "undefined") return;
  sessionStorage.setItem("caseManagement.activeTab", "FAR");
  sessionStorage.setItem("caseManagement.forceTabAfterReload", "FAR");
  sessionStorage.setItem("caseManagement.forceFarSync", "true");
  window.location.reload();
};

export default function IntakeSheetFAR({ open, setOpen, onSuccess, editingRecord }) {
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

      console.log("🔄 Pre-filling FAR form with:", editingRecord);
      try {
        let sourceRecord = editingRecord;
        if (editingRecord?.localId != null) {
          const local = await getFarCaseByLocalId(editingRecord.localId);
          if (local) sourceRecord = local;
        } else if (editingRecord?.id) {
          const cached = await getFarCaseById(editingRecord.id);
          if (cached) sourceRecord = cached;
        }

        if (!isActive) return;

        const formData = {
          date: sourceRecord?.date || "",
          receivingMember: sourceRecord?.receiving_member || "",
          emergency: sourceRecord?.emergency || "",
          emergencyOther: sourceRecord?.emergency_other || "",
          assistance: sourceRecord?.assistance || "",
          assistanceOther: sourceRecord?.assistance_other || "",
          unit: sourceRecord?.unit || "",
          quantity: sourceRecord?.quantity?.toString() || "",
          cost: sourceRecord?.cost?.toString() || "",
          provider: sourceRecord?.provider || "",
          caseManager: sourceRecord?.case_manager || "",
          status: sourceRecord?.status || "",
          priority: sourceRecord?.priority || "",
          caseDetails: {
            caseManager: sourceRecord?.case_manager || "",
            status: sourceRecord?.status || "",
            priority: sourceRecord?.priority || "",
          },
        };

        setSectionField("familyAssistanceRecord", formData);
      } catch (err) {
        if (!isActive) return;
        console.error("❌ Failed to load FAR case:", err);
        toast.error("Error loading Family Assistance Record", {
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
   * Handle FAR case creation or update
   * Validates form data, submits to Supabase, and handles success/error states
   */
  const handleSubmit = async () => {
    try {
      setIsSaving(true);
      const allData = getAllData() || {};

      console.log("🔍 Full FAR intake data:", allData);

      const casePayload = buildFARCasePayload(allData);
      await createOrUpdateLocalFarCase({
        casePayload,
        targetId: editingRecord?.id ?? null,
        localId: editingRecord?.localId ?? null,
        mode: isEditMode ? "update" : "create",
      });

      const online = isBrowserOnline();
      toast.success(
        isEditMode ? "Family Assistance Record saved" : "Family Assistance Record queued",
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
        setTimeout(forceFarTabReload, 0);
      }
    } catch (err) {
      console.error("❌ Unexpected error:", err);
      toast.error(`Failed to ${isEditMode ? 'update' : 'create'} Family Assistance Record`, {
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
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? "Edit Family Assistance Record" : "Family Assistance Record"}
          </DialogTitle>
        </DialogHeader>
        {/* main content: make this fill remaining vertical space and scroll when needed */}
        <div className="overflow-auto p-4">
          <FamilyAssistanceForm
            sectionKey="familyAssistanceRecord"
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