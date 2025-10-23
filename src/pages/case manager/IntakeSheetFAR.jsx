/**
 * @file IntakeSheetFAR.jsx
 * @description Family Assistance Record (FAR) intake form dialog
 * Manages FAR case creation with form validation and Supabase submission
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
import { submitFARCase } from "@/lib/farSubmission";
import { toast } from "sonner";

export default function IntakeSheetFAR({ open, setOpen, onSuccess }) {
  const { getAllData, resetAll } = useIntakeFormStore();
  const [isSaving, setIsSaving] = useState(false);

  /**
   * Handle FAR case creation
   * Validates form data, submits to Supabase, and handles success/error states
   */
  const handleCreate = async () => {
    try {
      setIsSaving(true);
      const allData = getAllData() || {};

      console.log("🔍 Full FAR intake data:", allData);

      // Submit to Supabase
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

      // Reset form and close dialog
      resetAll();
      setOpen(false);
      
      // Trigger reload of FAR data if callback provided
      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      console.error("❌ Unexpected error creating FAR case:", err);
      toast.error("Failed to create Family Assistance Record", {
        description: "An unexpected error occurred. Please try again.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Navigation functions
  const goNext = async () => {
    // Form completed - submit to database
    await handleCreate();
  };

  const goBack = () => {
    // Close dialog when going back (since there's only one form)
    setOpen(false);
  };

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      resetAll();
    }
  }, [open, resetAll]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            Family Assistance Record
          </DialogTitle>
        </DialogHeader>
        {/* main content: make this fill remaining vertical space and scroll when needed */}
        <div className="overflow-auto p-4">
          <FamilyAssistanceForm
            sectionKey="familyAssistanceRecord"
            goNext={goNext}
            goBack={goBack}
            isSaving={isSaving}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}