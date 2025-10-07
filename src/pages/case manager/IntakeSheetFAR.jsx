"use client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FamilyAssistanceForm } from "@/components/intake sheet FAR/FamilyAssistanceForm";

export default function IntakeSheetFAR({ open, setOpen }) {
  // Navigation functions
  const goNext = () => {
    // Form completed - close dialog
    setOpen(false);
  };

  const goBack = () => {
    // Close dialog when going back (since there's only one form)
    setOpen(false);
  };

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
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}