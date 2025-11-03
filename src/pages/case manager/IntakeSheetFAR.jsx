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
import { submitFARCase, updateFARCase } from "@/lib/farSubmission";
import { toast } from "sonner";

export default function IntakeSheetFAR({ open, setOpen, onSuccess, editingRecord }) {
  const { getAllData, resetAll, setSectionField } = useIntakeFormStore();
  const [isSaving, setIsSaving] = useState(false);
  const isEditMode = !!editingRecord;

  /**
   * Pre-fill form with editing record data
   */
  useEffect(() => {
    if (open && editingRecord) {
      console.log("🔄 Pre-filling FAR form with:", editingRecord);
      
      // Map database fields to form fields
      const formData = {
        date: editingRecord.date || "",
        receivingMember: editingRecord.receiving_member || "",
        emergency: editingRecord.emergency || "",
        emergencyOther: editingRecord.emergency_other || "",
        assistance: editingRecord.assistance || "",
        assistanceOther: editingRecord.assistance_other || "",
        unit: editingRecord.unit || "",
        quantity: editingRecord.quantity?.toString() || "",
        cost: editingRecord.cost?.toString() || "",
        provider: editingRecord.provider || "",
        caseManager: editingRecord.case_manager || "",
        status: editingRecord.status || "",
        priority: editingRecord.priority || "",
        // Store caseDetails separately
        caseDetails: {
          caseManager: editingRecord.case_manager || "",
          status: editingRecord.status || "",
          priority: editingRecord.priority || "",
        },
      };

      // Pre-fill the form store
      setSectionField("familyAssistanceRecord", formData);
    }
  }, [open, editingRecord, setSectionField]);

  /**
   * Handle FAR case creation or update
   * Validates form data, submits to Supabase, and handles success/error states
   */
  const handleSubmit = async () => {
    try {
      setIsSaving(true);
      const allData = getAllData() || {};

      console.log("🔍 Full FAR intake data:", allData);

      if (isEditMode) {
        // Update existing record
        const { error } = await updateFARCase(editingRecord.id, allData);

        if (error) {
          console.error("❌ Failed to update FAR case:", error);
          toast.error("Failed to update Family Assistance Record", {
            description: error.message || "An unexpected error occurred. Please try again.",
          });
          return;
        }

        console.log("✅ FAR case updated successfully:", editingRecord.id);
        toast.success("Family Assistance Record updated successfully!", {
          description: `Case ID: ${editingRecord.id}`,
        });
      } else {
        // Create new record
        const { caseId, error } = await submitFARCase(allData);

        if (error) {
          console.error("❌ Failed to create FAR case:", error);
          toast.error("Failed to create Family Assistance Record", {
            description: error.message || "An unexpected error occurred. Please try again.",
          });
          return;
        }

        console.log("✅ FAR case created successfully:", caseId);
        toast.success("Family Assistance Record created successfully!", {
          description: `Case ID: ${caseId}`,
        });
      }

      // Reset form and close dialog
      resetAll();
      setOpen(false);
      
      // Trigger reload of FAR data if callback provided
      if (onSuccess) {
        onSuccess();
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