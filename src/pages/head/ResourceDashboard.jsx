/**
 * @file ResourceDashboard.jsx
 * @description Real-Time Resource Inventory Dashboard page
 * @module pages/head/ResourceDashboard
 * 
 * Features:
 * - Real-time resource inventory overview
 * - Auto-updates and refresh functionality
 * - Resource availability tracking
 * - Request submission for case managers
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useResourceStore } from "@/store/useResourceStore";
import { toast } from "sonner";
import RealTimeInventoryDashboard from "@/components/resources/RealTimeInventoryDashboard";
import RequestSubmissionDialog from "@/components/resources/RequestSubmissionDialog";

/**
 * Resource Dashboard Page Component
 * @returns {JSX.Element} Resource Dashboard page
 */
export default function ResourceDashboard() {
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const { role } = useAuthStore();
  const { submitRequest } = useResourceStore();

  const handleSubmitRequest = async (requestData) => {
    try {
      await submitRequest(requestData);
      toast.success("Request submitted successfully!");
      setShowSubmitDialog(false);
    } catch (error) {
      toast.error("Failed to submit request: " + error.message);
    }
  };

  return (
    <div className="flex-1 space-y-3 p-3 md:px-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Resource Dashboard</h2>
          <p className="text-sm text-muted-foreground">
            Real-time resource inventory overview with auto-updates
          </p>
        </div>
        
        {/* New Request Button - Only visible for Case Managers */}
        {role === "case_manager" && (
          <Button onClick={() => setShowSubmitDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Request
          </Button>
        )}
      </div>

      {/* Dashboard Content */}
      <RealTimeInventoryDashboard />

      {/* Request Submission Dialog */}
      <RequestSubmissionDialog
        open={showSubmitDialog}
        onOpenChange={setShowSubmitDialog}
        onSubmit={handleSubmitRequest}
      />
    </div>
  );
}
