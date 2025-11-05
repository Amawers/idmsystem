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

import { useState } from "react";
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

// Sample data for testing
const SAMPLE_REQUESTS = [
  {
    id: 1,
    request_number: "REQ-2025-001",
    item_description: "Rice 25kg - NFA Quality",
    quantity: 50,
    unit: "sacks",
    unit_cost: 1850,
    total_amount: 92500,
    requester_name: "Maria Santos",
    program_name: "Food Assistance Program",
    beneficiary_name: "Juan Dela Cruz",
    request_type: "material",
    request_category: "food",
    priority: "urgent",
    status: "submitted",
    purpose: "Monthly food assistance for 50 beneficiary families",
    justification: "Stock depletion due to increased demand from new beneficiaries",
    created_at: "2025-11-01T10:30:00",
  },
  {
    id: 2,
    request_number: "REQ-2025-002",
    item_description: "Educational Supplies Bundle",
    quantity: 100,
    unit: "sets",
    unit_cost: 450,
    total_amount: 45000,
    requester_name: "Pedro Reyes",
    program_name: "Education Support Program",
    beneficiary_name: "Ana Garcia",
    request_type: "material",
    request_category: "supplies",
    priority: "normal",
    status: "approved",
    purpose: "School supplies for children enrolled in the program",
    justification: "School year preparation for Q2 2025",
    created_at: "2025-10-28T14:20:00",
  },
  {
    id: 3,
    request_number: "REQ-2025-003",
    item_description: "Medical Supplies - First Aid Kits",
    quantity: 30,
    unit: "boxes",
    unit_cost: 2500,
    total_amount: 75000,
    requester_name: "Dr. Rosa Cruz",
    program_name: "Health Services Program",
    beneficiary_name: null,
    request_type: "material",
    request_category: "medicine",
    priority: "urgent",
    status: "submitted",
    purpose: "Replenishment of medical supplies for health centers",
    justification: "Current stock below minimum threshold, critical for emergency response",
    created_at: "2025-11-02T09:15:00",
  },
  {
    id: 4,
    request_number: "REQ-2025-004",
    item_description: "Relief Goods Packs",
    quantity: 200,
    unit: "packs",
    unit_cost: 850,
    total_amount: 170000,
    requester_name: "Carlos Martinez",
    program_name: "Disaster Response Program",
    beneficiary_name: null,
    request_type: "material",
    request_category: "relief_goods",
    priority: "urgent",
    status: "submitted",
    purpose: "Emergency relief distribution for affected areas",
    justification: "Typhoon preparation and response requirements",
    created_at: "2025-11-03T11:45:00",
  },
  {
    id: 5,
    request_number: "REQ-2025-005",
    item_description: "Office Supplies - Paper, Pens, Folders",
    quantity: 1,
    unit: "lot",
    unit_cost: 15000,
    total_amount: 15000,
    requester_name: "Linda Gomez",
    program_name: null,
    beneficiary_name: null,
    request_type: "material",
    request_category: "supplies",
    priority: "normal",
    status: "rejected",
    purpose: "Office administrative supplies for Q4",
    justification: "Standard quarterly procurement",
    rejection_reason: "Budget allocation for office supplies has been exhausted for this quarter",
    created_at: "2025-10-25T16:00:00",
  },
  {
    id: 6,
    request_number: "REQ-2025-006",
    item_description: "Financial Assistance - Livelihood Grant",
    quantity: 20,
    unit: "grants",
    unit_cost: 5000,
    total_amount: 100000,
    requester_name: "Elena Torres",
    program_name: "Livelihood Development Program",
    beneficiary_name: "Multiple Beneficiaries",
    request_type: "financial",
    request_category: "financial",
    priority: "normal",
    status: "approved",
    purpose: "Seed capital for beneficiaries starting small businesses",
    justification: "Part of Q4 livelihood program implementation plan",
    created_at: "2025-10-30T13:30:00",
  },
  {
    id: 7,
    request_number: "REQ-2025-007",
    item_description: "Transportation Allowance",
    quantity: 15,
    unit: "beneficiaries",
    unit_cost: 500,
    total_amount: 7500,
    requester_name: "Miguel Santos",
    program_name: "Skills Training Program",
    beneficiary_name: "Training Participants",
    request_type: "financial",
    request_category: "financial",
    priority: "normal",
    status: "submitted",
    purpose: "Transportation support for training attendees",
    justification: "Required for November training sessions",
    created_at: "2025-11-04T08:00:00",
  },
  {
    id: 8,
    request_number: "REQ-2025-008",
    item_description: "Vitamin Supplements for Children",
    quantity: 500,
    unit: "bottles",
    unit_cost: 280,
    total_amount: 140000,
    requester_name: "Dr. Carmen Reyes",
    program_name: "Nutrition Program",
    beneficiary_name: null,
    request_type: "material",
    request_category: "medicine",
    priority: "urgent",
    status: "submitted",
    purpose: "Nutritional supplementation for malnourished children",
    justification: "High malnutrition rate detected in recent health assessments",
    created_at: "2025-11-05T07:30:00",
  },
  {
    id: 9,
    request_number: "REQ-2025-009",
    item_description: "Hygiene Kits",
    quantity: 150,
    unit: "kits",
    unit_cost: 650,
    total_amount: 97500,
    requester_name: "Sofia Lopez",
    program_name: "Community Health Program",
    beneficiary_name: null,
    request_type: "material",
    request_category: "supplies",
    priority: "normal",
    status: "disbursed",
    purpose: "Distribution to low-income families",
    justification: "Part of community health initiative",
    created_at: "2025-10-20T10:00:00",
  },
  {
    id: 10,
    request_number: "REQ-2025-010",
    item_description: "Construction Materials for House Repair",
    quantity: 10,
    unit: "sets",
    unit_cost: 8500,
    total_amount: 85000,
    requester_name: "Roberto Cruz",
    program_name: "Housing Assistance Program",
    beneficiary_name: "Storm-affected Families",
    request_type: "material",
    request_category: "supplies",
    priority: "urgent",
    status: "approved",
    purpose: "Emergency housing repairs for typhoon-damaged homes",
    justification: "Urgent need to provide shelter before rainy season",
    created_at: "2025-11-01T15:00:00",
  },
];

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
                <p className="text-xs font-medium">{request.requester_name}</p>
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

  const {
    requests: storeRequests,
    updateRequestStatus,
    loading,
  } = useResourceStore();

  const { role } = useAuthStore();

  // Use sample data if store is empty, otherwise use store data
  const requests = storeRequests.length > 0 ? storeRequests : SAMPLE_REQUESTS;

  // Filter requests based on user role and filter selection
  const filteredRequests = requests.filter(req => {
    if (filter === "pending" && req.status !== "submitted") return false;
    if (filter === "approved" && !["approved", "disbursed"].includes(req.status)) return false;
    if (filter === "rejected" && req.status !== "rejected") return false;
    return true;
  });

  const pendingCount = requests.filter(r => r.status === "submitted").length;

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
      

      {/* Filters */}
      <div className="flex gap-2">
        <Button
          variant={filter === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("all")}
        >
          All ({requests.length})
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
          Approved ({requests.filter(r => ["approved", "disbursed"].includes(r.status)).length})
        </Button>
        <Button
          variant={filter === "rejected" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("rejected")}
        >
          Rejected ({requests.filter(r => r.status === "rejected").length})
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
                    <TableCell>{request.requester_name}</TableCell>
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
