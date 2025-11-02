/**
 * @file PendingApprovalsCard.jsx
 * @description Card displaying pending approval requests
 * @module components/resources/PendingApprovalsCard
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Clock } from "lucide-react";

/**
 * Pending Approvals Card Component
 * 
 * @param {Object} props
 * @param {Array} props.pendingApprovals - Array of pending requests
 * @param {Function} props.onUpdateStatus - Status update handler
 * @returns {JSX.Element}
 */
export default function PendingApprovalsCard({ pendingApprovals = [], onUpdateStatus }) {
  const getPriorityColor = (priority) => {
    const colors = {
      critical: "text-red-600",
      high: "text-orange-600",
      medium: "text-blue-600",
      low: "text-gray-600",
    };
    return colors[priority] || "text-gray-600";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Pending Approvals
        </CardTitle>
        <CardDescription>
          {pendingApprovals.length} request{pendingApprovals.length !== 1 ? "s" : ""} awaiting review
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {pendingApprovals.slice(0, 5).map((request) => (
            <div key={request.id} className="flex items-start justify-between gap-4 p-3 border rounded-lg">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-medium truncate">{request.request_number}</p>
                  <Badge variant="outline" className={getPriorityColor(request.priority)}>
                    {request.priority}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground truncate mb-1">
                  {request.item_description}
                </p>
                <p className="text-sm font-bold">₱{request.total_amount?.toLocaleString()}</p>
              </div>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onUpdateStatus(request.id, "head_approved", "Approved")}
                >
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onUpdateStatus(request.id, "rejected", "Rejected")}
                >
                  <XCircle className="h-4 w-4 text-red-600" />
                </Button>
              </div>
            </div>
          ))}
          {pendingApprovals.length === 0 && (
            <p className="text-center text-muted-foreground py-8">No pending approvals</p>
          )}
          {pendingApprovals.length > 5 && (
            <p className="text-xs text-muted-foreground text-center pt-2">
              +{pendingApprovals.length - 5} more
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
