/**
 * @file ApprovalWorkflowManager.jsx
 * @description Request & Approval Workflow management component
 * @module components/resources/ApprovalWorkflowManager
 * 
 * Features:
 * - Multi-level approval workflow
 * - Request review and approval/rejection
 * - Status tracking and history
 * - Bulk approval actions
 */

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  FileText,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useResourceStore } from "@/store/useResourceStore";
import { useAuthStore } from "@/store/authStore";

/**
 * Status Badge Component
 */
function StatusBadge({ status }) {
  const variants = {
    submitted: { variant: "secondary", icon: Clock, label: "Pending" },
    under_review: { variant: "default", icon: Eye, label: "Under Review" },
    approved: { variant: "success", icon: CheckCircle, label: "Approved" },
    rejected: { variant: "destructive", icon: XCircle, label: "Rejected" },
    disbursed: { variant: "success", icon: CheckCircle, label: "Disbursed" },
  };

  const config = variants[status] || variants.submitted;
  const Icon = config.icon;

  return (
    <Badge variant={config.variant} className="flex items-center gap-1 w-fit">
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}

/**
 * Request Details Dialog
 */
function RequestDetailsDialog({ request, open, onOpenChange, onApprove, onReject }) {
  const [notes, setNotes] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const { role } = useAuthStore();

  if (!request) return null;

  const canApprove = role === 'head' && request.status === 'submitted';

  const handleApprove = async () => {
    setActionLoading(true);
    try {
      await onApprove(request.id, notes);
      setNotes("");
      onOpenChange(false);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!notes.trim()) {
      alert("Please provide a reason for rejection");
      return;
    }
    setActionLoading(true);
    try {
      await onReject(request.id, notes);
      setNotes("");
      onOpenChange(false);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="min-w-5xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Request Details</DialogTitle>
          <DialogDescription>
            Review request information and take action
          </DialogDescription>
        </DialogHeader>

        {/* Two-Column Layout */}
        <div className="grid md:grid-cols-2 gap-4">
          {/* LEFT COLUMN - Request Information */}
          <div className="space-y-3">
            {/* Request Header */}
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-base">{request.request_number}</h3>
                <p className="text-xs text-muted-foreground">
                  Submitted {new Date(request.created_at).toLocaleDateString()}
                </p>
              </div>
              <StatusBadge status={request.status} />
            </div>

            {/* Request Info Grid */}
            <div className="grid gap-2 p-3 bg-muted/50 rounded-lg">
              <div>
                <Label className="text-[10px] text-muted-foreground">Request Type</Label>
                <p className="text-xs font-medium capitalize">{request.request_type.replace('_', ' ')}</p>
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground">Category</Label>
                <p className="text-xs font-medium capitalize">{request.request_category.replace('_', ' ')}</p>
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground">Requester</Label>
                <p className="text-xs font-medium">{request.requester?.full_name || 'Unknown'}</p>
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground">Program</Label>
                <p className="text-xs font-medium">{request.program_name || 'N/A'}</p>
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground">Beneficiary</Label>
                <p className="text-xs font-medium">{request.beneficiary_name || 'N/A'}</p>
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground">Priority</Label>
                <Badge variant={request.priority === 'urgent' ? 'destructive' : 'default'} className="text-xs">
                  {request.priority}
                </Badge>
              </div>
            </div>

            <div className="grid gap-2 grid-cols-3 p-3 bg-muted/50 rounded-lg">
              <div>
                <Label className="text-[10px] text-muted-foreground">Quantity</Label>
                <p className="text-xs font-medium">{request.quantity} {request.unit}</p>
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground">Unit Cost</Label>
                <p className="text-xs font-medium">₱{request.unit_cost?.toLocaleString()}</p>
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground">Total Amount</Label>
                <p className="text-sm font-bold">₱{request.total_amount?.toLocaleString()}</p>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN - Item Description, Purpose, Justification, Notes */}
          <div className="space-y-3">
            {/* Item Description */}
            <div className="space-y-1">
              <Label className="text-xs">Item Description</Label>
              <div className="text-xs p-2 bg-muted/50 rounded min-h-[50px]">
                {request.item_description}
              </div>
            </div>

            {/* Purpose */}
            <div className="space-y-1">
              <Label className="text-xs">Purpose</Label>
              <div className="text-xs p-2 bg-muted/50 rounded min-h-[60px]">
                {request.purpose}
              </div>
            </div>

            {/* Justification */}
            <div className="space-y-1">
              <Label className="text-xs">Justification</Label>
              <div className="text-xs p-2 bg-muted/50 rounded min-h-[60px]">
                {request.justification}
              </div>
            </div>

            {/* Approval Actions */}
            {canApprove && (
              <div className="space-y-1 pt-3 border-t">
                <Label htmlFor="notes" className="text-xs">
                  {notes ? "Approval/Rejection Notes" : "Notes (required for rejection)"}
                </Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add your review notes here..."
                  rows={3}
                  className="text-xs"
                />
              </div>
            )}

            {/* Rejection Reason (if rejected) */}
            {request.status === 'rejected' && request.rejection_reason && (
              <div className="space-y-1 p-3 bg-red-50 border border-red-200 rounded">
                <div className="flex items-center gap-2 text-red-900">
                  <AlertCircle className="h-3 w-3" />
                  <Label className="text-xs">Rejection Reason</Label>
                </div>
                <p className="text-xs text-red-800">{request.rejection_reason}</p>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          {canApprove ? (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleReject}
                disabled={actionLoading}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Reject
              </Button>
              <Button onClick={handleApprove} disabled={actionLoading}>
                <CheckCircle className="h-4 w-4 mr-2" />
                Approve
              </Button>
            </>
          ) : (
            <Button onClick={() => onOpenChange(false)}>Close</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Main Approval Workflow Manager
 */
export default function ApprovalWorkflowManager() {
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(8);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const {
    requests: storeRequests,
    updateRequestStatus,
    fetchRequests,
    loading,
  } = useResourceStore();

  const { role } = useAuthStore();

  // Fetch requests on component mount
  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  // Handle refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await fetchRequests();
    } catch (error) {
      console.error("Error refreshing requests:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Filter requests based on user role and filter selection
  const filteredRequests = storeRequests.filter(req => {
    if (filter === "pending" && req.status !== "submitted") return false;
    if (filter === "approved" && !["approved", "disbursed"].includes(req.status)) return false;
    if (filter === "rejected" && req.status !== "rejected") return false;
    return true;
  });

  const pendingCount = storeRequests.filter(r => r.status === "submitted").length;

  // Pagination calculations
  const totalFiltered = filteredRequests.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / rowsPerPage));
  
  // Reset to first page if filters change and current page is out of range
  if (page > totalPages) {
    setPage(1);
  }

  const sliceStart = (page - 1) * rowsPerPage;
  const sliceEnd = sliceStart + rowsPerPage;
  const pageRequests = filteredRequests.slice(sliceStart, sliceEnd);
  const displayStart = totalFiltered === 0 ? 0 : sliceStart + 1;
  const displayEnd = Math.min(totalFiltered, sliceEnd);

  const handleViewDetails = (request) => {
    setSelectedRequest(request);
    setShowDetailsDialog(true);
  };

  const handleApprove = async (requestId, notes) => {
    await updateRequestStatus(requestId, "approved", notes);
  };

  const handleReject = async (requestId, notes) => {
    await updateRequestStatus(requestId, "rejected", notes);
  };

  return (
    <div className="space-y-4">
      {/* Filters and Refresh Button */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Button
            variant={filter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("all")}
          >
            All ({storeRequests.length})
          </Button>
          <Button
            variant={filter === "pending" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("pending")}
          >
            Pending ({pendingCount})
          </Button>
          <Button
            variant={filter === "approved" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("approved")}
          >
            Approved ({storeRequests.filter(r => ["approved", "disbursed"].includes(r.status)).length})
          </Button>
          <Button
            variant={filter === "rejected" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("rejected")}
          >
            Rejected ({storeRequests.filter(r => r.status === "rejected").length})
          </Button>
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isRefreshing || loading}
          className="cursor-pointer"
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Requests Table */}
      <Card>
        <CardContent className="px-4">
          <div className={`rounded-md border px-4 ${pageRequests.length > 8 ? 'overflow-y-auto max-h-[472px]' : ''}`}>
            <Table>
              <TableHeader>
              <TableRow>
                <TableHead>Request #</TableHead>
                <TableHead>Item</TableHead>
                <TableHead>Requester</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
              </TableHeader>
              <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredRequests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No requests found
                  </TableCell>
                </TableRow>
              ) : (
                pageRequests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell className="font-medium">{request.request_number}</TableCell>
                    <TableCell>
                      <div className="max-w-xs truncate">{request.item_description}</div>
                      <div className="text-xs text-muted-foreground">
                        {request.quantity} {request.unit}
                      </div>
                    </TableCell>
                    <TableCell>{request.requester?.full_name || 'Unknown'}</TableCell>
                    <TableCell className="font-medium">
                      ₱{request.total_amount?.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={request.priority === "urgent" ? "destructive" : "secondary"}
                      >
                        {request.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={request.status} />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(request.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewDetails(request)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between px-2 py-4">
            <div className="flex items-center gap-2">
              <p className="text-sm text-muted-foreground">
                Showing {displayStart} to {displayEnd} of {totalFiltered} request{totalFiltered !== 1 ? 's' : ''}
              </p>
              <Select
                value={rowsPerPage.toString()}
                onValueChange={(value) => {
                  setRowsPerPage(Number(value));
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-8 w-[125px] cursor-pointer">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="8">8 per page</SelectItem>
                  <SelectItem value="10">10 per page</SelectItem>
                  <SelectItem value="20">20 per page</SelectItem>
                  <SelectItem value="50">50 per page</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
                className="cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <div className="flex items-center gap-1">
                <span className="text-sm">
                  Page {page} of {totalPages}
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(page + 1)}
                disabled={page === totalPages}
                className="cursor-pointer"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Request Details Dialog */}
      <RequestDetailsDialog
        request={selectedRequest}
        open={showDetailsDialog}
        onOpenChange={setShowDetailsDialog}
        onApprove={handleApprove}
        onReject={handleReject}
      />
    </div>
  );
}
