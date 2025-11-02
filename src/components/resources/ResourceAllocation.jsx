/**
 * @file ResourceAllocation.jsx
 * @description Main resource allocation component with request management and approval workflow
 * @module components/resources/ResourceAllocation
 * 
 * Features:
 * - Resource request submission form
 * - Approval workflow management
 * - Request tracking and filtering
 * - Budget utilization monitoring
 * - Disbursement recording
 */

import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, TrendingUp, Clock, CheckCircle, DollarSign } from "lucide-react";
import { useResourceRequests } from "@/hooks/useResourceRequests";
import { useResourceAllocations } from "@/hooks/useResourceAllocations";
import RequestSubmissionDialog from "./RequestSubmissionDialog";
import RequestsTable from "./RequestsTable";
import AllocationOverview from "./AllocationOverview";
import BudgetUtilizationCard from "./BudgetUtilizationCard";
import PendingApprovalsCard from "./PendingApprovalsCard";

/**
 * Resource Allocation Component
 * 
 * Manages the complete resource allocation workflow including:
 * - Request submission
 * - Approval processing
 * - Budget tracking
 * - Disbursement management
 * 
 * @returns {JSX.Element} Resource allocation interface
 */
export default function ResourceAllocation() {
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [initialized, setInitialized] = useState(false);

  // Fetch resource requests data
  const {
    requests,
    requestsByStatus,
    pendingApprovals,
    statistics,
    loading: requestsLoading,
    submitRequest,
    updateRequestStatus,
    recordDisbursement,
    refresh: refreshRequests,
  } = useResourceRequests({ autoFetch: !initialized });

  // Fetch allocation analytics
  const {
    budgetUtilization,
    topPrograms,
    allocationsByProgram,
    loading: allocationsLoading,
    refresh: refreshAllocations,
  } = useResourceAllocations({ autoFetch: !initialized });

  const loading = requestsLoading || allocationsLoading;

  // Initialize on mount
  useEffect(() => {
    if (!initialized) {
      refreshRequests();
      refreshAllocations();
      setInitialized(true);
    }
  }, [initialized, refreshRequests, refreshAllocations]);

  /**
   * Handle new request submission
   */
  const handleSubmitRequest = async (requestData) => {
    try {
      await submitRequest(requestData);
      setShowSubmitDialog(false);
      refreshRequests();
      refreshAllocations();
    } catch (error) {
      console.error("Failed to submit request:", error);
    }
  };

  /**
   * Handle request approval/rejection
   */
  const handleUpdateStatus = async (requestId, newStatus, notes) => {
    try {
      await updateRequestStatus(requestId, newStatus, notes);
      refreshRequests();
      refreshAllocations();
    } catch (error) {
      console.error("Failed to update request status:", error);
    }
  };

  /**
   * Handle disbursement recording
   */
  const handleRecordDisbursement = async (requestId, disbursementData) => {
    try {
      await recordDisbursement(requestId, disbursementData);
      refreshRequests();
      refreshAllocations();
    } catch (error) {
      console.error("Failed to record disbursement:", error);
    }
  };

  return (
    <div className="space-y-4">
      {/* Action Bar */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Resource Management</h3>
          <p className="text-sm text-muted-foreground">
            Submit requests, track approvals, and manage disbursements
          </p>
        </div>
        <Button onClick={() => setShowSubmitDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Submit Resource Request
        </Button>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics?.total_requests || 0}</div>
            <p className="text-xs text-muted-foreground">
              {requestsByStatus?.submitted?.length || 0} pending
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingApprovals?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting review
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved Requests</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(requestsByStatus?.head_approved?.length || 0) + (requestsByStatus?.disbursed?.length || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {requestsByStatus?.disbursed?.length || 0} disbursed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Allocated</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₱{(statistics?.total_approved_amount || 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {budgetUtilization?.utilization_rate?.toFixed(1) || 0}% utilization
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="requests">All Requests</TabsTrigger>
          <TabsTrigger value="pending">Pending Approvals</TabsTrigger>
          <TabsTrigger value="budget">Budget Utilization</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <BudgetUtilizationCard budgetUtilization={budgetUtilization} />
            <PendingApprovalsCard 
              pendingApprovals={pendingApprovals} 
              onUpdateStatus={handleUpdateStatus}
            />
          </div>
          <AllocationOverview 
            allocations={allocationsByProgram}
            topPrograms={topPrograms}
            loading={loading}
          />
        </TabsContent>

        {/* All Requests Tab */}
        <TabsContent value="requests" className="space-y-4">
          <RequestsTable
            requests={requests}
            loading={loading}
            onUpdateStatus={handleUpdateStatus}
            onRecordDisbursement={handleRecordDisbursement}
          />
        </TabsContent>

        {/* Pending Approvals Tab */}
        <TabsContent value="pending" className="space-y-4">
          <RequestsTable
            requests={pendingApprovals}
            loading={loading}
            onUpdateStatus={handleUpdateStatus}
            showApprovalActions={true}
          />
        </TabsContent>

        {/* Budget Utilization Tab */}
        <TabsContent value="budget" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Budget Overview</CardTitle>
              <CardDescription>
                Overall budget allocation and utilization across all programs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">Total Budget</p>
                    <p className="text-2xl font-bold">
                      ₱{(budgetUtilization?.total_budget || 0).toLocaleString()}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">Total Used</p>
                    <p className="text-2xl font-bold">
                      ₱{(budgetUtilization?.total_used || 0).toLocaleString()}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">Remaining</p>
                    <p className="text-2xl font-bold">
                      ₱{(budgetUtilization?.remaining || 0).toLocaleString()}
                    </p>
                  </div>
                </div>
                
                <AllocationOverview 
                  allocations={allocationsByProgram}
                  topPrograms={topPrograms}
                  loading={loading}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Request Submission Dialog */}
      <RequestSubmissionDialog
        open={showSubmitDialog}
        onOpenChange={setShowSubmitDialog}
        onSubmit={handleSubmitRequest}
      />
    </div>
  );
}
