/**
 * @file ViewServiceDeliveryDialog.jsx
 * @description View details modal for service delivery records
 * @module components/programs/ViewServiceDeliveryDialog
 * 
 * Features:
 * - Display comprehensive service delivery information
 * - Clean, visually grouped layout
 * - Read-only detailed view
 * - Easy navigation and access to information
 */

import { useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Calendar,
  Clock,
  User,
  FileText,
  CheckCircle2,
  XCircle,
  MinusCircle,
  Target,
  ArrowRight,
  Briefcase,
  UserCircle,
  FileCheck,
} from "lucide-react";

/**
 * View Service Delivery Dialog Component
 * @param {Object} props - Component props
 * @param {boolean} props.open - Dialog open state
 * @param {Function} props.onOpenChange - Dialog state change handler
 * @param {Object} props.serviceDelivery - Service delivery record to display
 * @returns {JSX.Element} View service delivery dialog
 */
export default function ViewServiceDeliveryDialog({
  open,
  onOpenChange,
  serviceDelivery,
}) {
  // Close dialog if serviceDelivery becomes null
  useEffect(() => {
    if (!serviceDelivery && open) {
      onOpenChange(false);
    }
  }, [serviceDelivery, open, onOpenChange]);

  if (!serviceDelivery) return null;

  /**
   * Get attendance badge component
   */
  const getAttendanceBadge = () => {
    const status = serviceDelivery.attendance_status;
    
    if (status === "present") {
      return (
        <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-green-200">
          <CheckCircle2 className="mr-1 h-3 w-3" />
          Present
        </Badge>
      );
    } else if (status === "excused") {
      return (
        <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100 border-yellow-200">
          <MinusCircle className="mr-1 h-3 w-3" />
          Excused
        </Badge>
      );
    } else {
      return (
        <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border-red-200">
          <XCircle className="mr-1 h-3 w-3" />
          Absent
        </Badge>
      );
    }
  };

  /**
   * Format date for display
   */
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  /**
   * Format duration
   */
  const formatDuration = (minutes) => {
    if (!minutes) return "Not recorded";
    if (minutes < 60) return `${minutes} minutes`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours} hour${hours > 1 ? 's' : ''}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="min-w-5xl max-h-[90vh] p-0">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle className="text-2xl font-bold">Service Delivery Details</DialogTitle>
          <DialogDescription>
            Complete information for this service delivery session
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-120px)] px-6 pb-6">
          <div className="space-y-6">
            {/* Three Column Layout: Session Overview, Beneficiary Info, Program Details */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Session Overview Section */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 rounded-lg p-5 border border-blue-100 dark:border-blue-900">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <FileCheck className="h-5 w-5 text-blue-600" />
                  Session Overview
                </h3>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-1 p-2 bg-white dark:bg-gray-800 rounded-md">
                      <Calendar className="h-4 w-4 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground">Service Date</p>
                      <p className="font-medium text-sm">{formatDate(serviceDelivery.service_date)}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="mt-1 p-2 bg-white dark:bg-gray-800 rounded-md">
                      <Clock className="h-4 w-4 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground">Duration</p>
                      <p className="font-medium">{formatDuration(serviceDelivery.duration_minutes)}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="mt-1 p-2 bg-white dark:bg-gray-800 rounded-md">
                      <User className="h-4 w-4 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground">Delivered By</p>
                      <p className="font-medium">
                        {serviceDelivery.delivered_by_name || serviceDelivery.service_provider || "Not specified"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="mt-1 p-2 bg-white dark:bg-gray-800 rounded-md">
                      <CheckCircle2 className="h-4 w-4 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground">Attendance</p>
                      <div className="mt-1">
                        {getAttendanceBadge()}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Beneficiary Information Section */}
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 rounded-lg p-5 border border-purple-100 dark:border-purple-900">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <UserCircle className="h-5 w-5 text-purple-600" />
                  Beneficiary Info
                </h3>
                <div className="space-y-4">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Beneficiary Name</p>
                    <p className="font-medium text-base">
                      {serviceDelivery.beneficiary_name || serviceDelivery.case_name}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Case Number</p>
                    <p className="font-medium">
                      {serviceDelivery.case_number || "Not available"}
                    </p>
                  </div>

                  {serviceDelivery.enrollment_id && (
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Enrollment ID</p>
                      <p className="font-mono text-xs">
                        {serviceDelivery.enrollment_id}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Program Details Section */}
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 rounded-lg p-5 border border-green-100 dark:border-green-900">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Briefcase className="h-5 w-5 text-green-600" />
                  Program Details
                </h3>
                <div className="space-y-4">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Program Name</p>
                    <p className="font-medium text-base">
                      {serviceDelivery.program_name || (serviceDelivery.program && serviceDelivery.program.program_name) || "Not specified"}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Program Type</p>
                    <Badge variant="outline" className="bg-white dark:bg-gray-800">
                      {serviceDelivery.program_type || (serviceDelivery.program && serviceDelivery.program.program_type) || "General"}
                    </Badge>
                  </div>

                  {serviceDelivery.service_type && (
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Service Type</p>
                      <Badge variant="outline" className="bg-white dark:bg-gray-800">
                        {serviceDelivery.service_type}
                      </Badge>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Progress Notes Section */}
            {serviceDelivery.progress_notes && (
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 rounded-lg p-5 border border-amber-100 dark:border-amber-900">
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <FileText className="h-5 w-5 text-amber-600" />
                  Progress Notes
                </h3>
                <div className="bg-white dark:bg-gray-800 rounded-md p-4 border">
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">
                    {serviceDelivery.progress_notes}
                  </p>
                </div>
              </div>
            )}

            {/* Milestones Achieved Section */}
            {serviceDelivery.milestones_achieved && serviceDelivery.milestones_achieved.length > 0 && (
              <div className="bg-gradient-to-br from-cyan-50 to-sky-50 dark:from-cyan-950/20 dark:to-sky-950/20 rounded-lg p-5 border border-cyan-100 dark:border-cyan-900">
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Target className="h-5 w-5 text-cyan-600" />
                  Milestones Achieved
                </h3>
                <ul className="space-y-2">
                  {serviceDelivery.milestones_achieved.map((milestone, index) => (
                    <li key={index} className="flex items-start gap-3 bg-white dark:bg-gray-800 rounded-md p-3 border">
                      <CheckCircle2 className="h-5 w-5 text-cyan-600 mt-0.5 flex-shrink-0" />
                      <span className="text-sm">{milestone}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Next Steps Section */}
            {serviceDelivery.next_steps && (
              <div className="bg-gradient-to-br from-rose-50 to-red-50 dark:from-rose-950/20 dark:to-red-950/20 rounded-lg p-5 border border-rose-100 dark:border-rose-900">
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <ArrowRight className="h-5 w-5 text-rose-600" />
                  Next Steps
                </h3>
                <div className="bg-white dark:bg-gray-800 rounded-md p-4 border">
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">
                    {serviceDelivery.next_steps}
                  </p>
                </div>
              </div>
            )}

            {/* Metadata Section */}
            <div className="border rounded-lg p-4 bg-muted/30">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-muted-foreground">
                <div className="flex justify-between">
                  <span>Record ID:</span>
                  <span className="font-mono">{serviceDelivery.id}</span>
                </div>
                {serviceDelivery.enrollment_id && (
                  <div className="flex justify-between">
                    <span>Enrollment ID:</span>
                    <span className="font-mono">{serviceDelivery.enrollment_id}</span>
                  </div>
                )}
                {serviceDelivery.created_at && (
                  <div className="flex justify-between">
                    <span>Created:</span>
                    <span>{new Date(serviceDelivery.created_at).toLocaleDateString()}</span>
                  </div>
                )}
                {serviceDelivery.updated_at && (
                  <div className="flex justify-between">
                    <span>Last Updated:</span>
                    <span>{new Date(serviceDelivery.updated_at).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
