/**
 * @file RequestsTable.jsx
 * @description Table component for displaying resource requests
 * @module components/resources/RequestsTable
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Eye } from "lucide-react";
import PermissionGuard from "@/components/PermissionGuard";

/**
 * Requests Table Component
 * 
 * @param {Object} props
 * @param {Array} props.requests - Array of requests
 * @param {boolean} props.loading - Loading state
 * @param {Function} props.onUpdateStatus - Status update handler
 * @param {Function} props.onRecordDisbursement - Disbursement handler
 * @param {boolean} props.showApprovalActions - Show approval buttons
 * @returns {JSX.Element}
 */
export default function RequestsTable({ 
  requests = [], 
  loading, 
  onUpdateStatus, 
  onRecordDisbursement,
  showApprovalActions = false 
}) {
  const getStatusBadge = (status) => {
    const variants = {
      submitted: "secondary",
      head_approved: "default",
      disbursed: "success",
      rejected: "destructive",
    };
    return <Badge variant={variants[status] || "secondary"}>{status?.replace("_", " ")}</Badge>;
  };

  const getPriorityBadge = (priority) => {
    const colors = {
      critical: "destructive",
      high: "orange",
      medium: "default",
      low: "secondary",
    };
    return <Badge variant={colors[priority] || "default"}>{priority}</Badge>;
  };

  if (loading) {
    return <div className="text-center py-8">Loading requests...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Resource Requests</CardTitle>
        <CardDescription>
          {requests.length} request{requests.length !== 1 ? "s" : ""}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Request #</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Program</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests.map((request) => (
              <TableRow key={request.id}>
                <TableCell className="font-medium">{request.request_number}</TableCell>
                <TableCell>{request.request_type}</TableCell>
                <TableCell className="max-w-xs truncate">{request.item_description}</TableCell>
                <TableCell>₱{request.total_amount?.toLocaleString()}</TableCell>
                <TableCell>{getPriorityBadge(request.priority)}</TableCell>
                <TableCell>{getStatusBadge(request.status)}</TableCell>
                <TableCell className="max-w-xs truncate">{request.program_name}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    {showApprovalActions && request.status === "submitted" && (
                      <>
                        <PermissionGuard permission="approve_resource_request">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onUpdateStatus(request.id, "head_approved", "Approved")}
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                        </PermissionGuard>
                        <PermissionGuard permission="reject_resource_request">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onUpdateStatus(request.id, "rejected", "Rejected")}
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </PermissionGuard>
                      </>
                    )}
                    <Button size="sm" variant="outline">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {requests.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                  No requests found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
