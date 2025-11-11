/**
 * @file CreateServiceDeliveryDialog.jsx
 * @description Dialog component for logging new service delivery sessions
 * @module components/programs/CreateServiceDeliveryDialog
 * 
 * Features:
 * - Select enrollment from active enrollments
 * - Log service type and details
 * - Track attendance
 * - Record progress notes and milestones
 * - Form validation with react-hook-form and Zod
 */

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useServiceDelivery } from "@/hooks/useServiceDelivery";
import { useEnrollments } from "@/hooks/useEnrollments";
import { useCaseManagers } from "@/hooks/useCaseManagers";
import { CalendarIcon, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

// Validation schema
const serviceDeliverySchema = z.object({
  enrollment_id: z.string().min(1, "Enrollment is required"),
  service_date: z.string().min(1, "Service date is required"),
  delivered_by_name: z.string().min(1, "Case manager is required"),
  attendance: z.boolean(),
  attendance_status: z.enum(["present", "absent", "excused"]),
  duration_minutes: z.string().optional(),
  progress_notes: z.string().optional(),
  milestones_achieved: z.string().optional(), // Comma-separated values
  next_steps: z.string().optional(),
});

/**
 * Create Service Delivery Dialog Component
 * @param {Object} props
 * @param {boolean} props.open - Dialog open state
 * @param {Function} props.onOpenChange - Dialog state change handler
 * @param {Function} props.onSuccess - Callback function called after successful creation
 * @returns {JSX.Element}
 */
export default function CreateServiceDeliveryDialog({ open, onOpenChange, onSuccess }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedEnrollment, setSelectedEnrollment] = useState(null);
  const [serviceDate, setServiceDate] = useState(new Date());

  const { createServiceDelivery } = useServiceDelivery();
  const { enrollments, loading: enrollmentsLoading } = useEnrollments({
    status: "active",
  });
  const { caseManagers, loading: caseManagersLoading } = useCaseManagers();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm({
    resolver: zodResolver(serviceDeliverySchema),
    defaultValues: {
      enrollment_id: "",
      service_date: format(new Date(), "yyyy-MM-dd"),
      delivered_by_name: "",
      attendance: false,
      attendance_status: "absent",
      duration_minutes: "",
      progress_notes: "",
      milestones_achieved: "",
      next_steps: "",
    },
  });

  const attendance = watch("attendance");

  // Update attendance status based on attendance switch
  useEffect(() => {
    if (attendance) {
      setValue("attendance_status", "present");
    } else {
      setValue("attendance_status", "absent");
    }
  }, [attendance, setValue]);

  /**
   * Handle enrollment selection
   * @param {string} enrollmentId
   */
  const handleEnrollmentChange = (enrollmentId) => {
    const enrollment = enrollments.find((e) => e.id === enrollmentId);
    setSelectedEnrollment(enrollment);
    setValue("enrollment_id", enrollmentId);
  };

  /**
   * Handle form submission
   * @param {Object} data - Form data
   */
  const onSubmit = async (data) => {
    if (!selectedEnrollment) {
      toast.error("Please select an enrollment");
      return;
    }

    try {
      setIsSubmitting(true);

      // Parse milestones from comma-separated string to array
      const milestonesArray = data.milestones_achieved
        ? data.milestones_achieved.split(",").map((m) => m.trim()).filter(Boolean)
        : [];

      // Prepare service delivery data
      const serviceData = {
        enrollment_id: data.enrollment_id,
        case_id: selectedEnrollment.case_id,
        case_number: selectedEnrollment.case_number,
        beneficiary_name: selectedEnrollment.beneficiary_name,
        program_id: selectedEnrollment.program_id,
        program_name: selectedEnrollment.program?.program_name || "",
        program_type: selectedEnrollment.program?.program_type || "",
        service_date: data.service_date,
        delivered_by_name: data.delivered_by_name,
        attendance: data.attendance,
        attendance_status: data.attendance_status,
        duration_minutes: data.duration_minutes ? parseInt(data.duration_minutes) : null,
        progress_notes: data.progress_notes || null,
        milestones_achieved: milestonesArray,
        next_steps: data.next_steps || null,
      };

      await createServiceDelivery(serviceData);

      toast.success("Service delivery logged successfully");
      reset();
      setSelectedEnrollment(null);
      onOpenChange(false);
      
      // Call onSuccess callback if provided
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error("Error creating service delivery:", error);
      toast.error(error.message || "Failed to log service delivery");
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Handle dialog close
   */
  const handleClose = () => {
    reset();
    setSelectedEnrollment(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="min-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Log Service Delivery</DialogTitle>
          <DialogDescription>
            Record a service delivery session for an enrolled case
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Two Column Grid Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* LEFT COLUMN */}
            <div className="space-y-4">
              {/* Row 1: Enrollment, Delivered By */}
              <div className="grid grid-cols-2 gap-4">
                {/* Enrollment Selection */}
                <div className="space-y-2">
                  <Label htmlFor="enrollment_id">
                    Enrollment <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    onValueChange={handleEnrollmentChange}
                    disabled={enrollmentsLoading}
                  >
                    <SelectTrigger className="cursor-pointer">
                      <SelectValue placeholder="Select an enrollment" />
                    </SelectTrigger>
                    <SelectContent>
                      {enrollments.map((enrollment) => (
                        <SelectItem key={enrollment.id} value={enrollment.id}>
                          <div className="flex flex-col">
                            <span className="font-medium">
                              {enrollment.beneficiary_name}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {enrollment.program?.program_name} • {enrollment.case_number}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.enrollment_id && (
                    <p className="text-sm text-red-500">{errors.enrollment_id.message}</p>
                  )}
                </div>

                {/* Case Manager / Delivered By */}
                <div className="space-y-2">
                  <Label htmlFor="delivered_by_name">
                    Delivered By <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    onValueChange={(value) => setValue("delivered_by_name", value)}
                    disabled={caseManagersLoading}
                  >
                    <SelectTrigger className="cursor-pointer">
                      <SelectValue placeholder="Select case manager" />
                    </SelectTrigger>
                    <SelectContent>
                      {caseManagers.map((manager) => (
                        <SelectItem key={manager.id} value={manager.full_name}>
                          {manager.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.delivered_by_name && (
                    <p className="text-sm text-red-500">{errors.delivered_by_name.message}</p>
                  )}
                </div>
              </div>

              {/* Row 2: Attendance */}
              <div className="flex items-center justify-between space-x-2 border rounded-lg p-4">
                <div className="space-y-0.5">
                  <Label htmlFor="attendance">Attendance</Label>
                  <p className="text-sm text-muted-foreground">
                    Mark if beneficiary attended the session
                  </p>
                </div>
                <Switch
                  id="attendance"
                  checked={attendance}
                  onCheckedChange={(checked) => setValue("attendance", checked)}
                />
              </div>

              {/* Row 3: Service Date, Absence Reason (conditional) */}
              <div className={cn("grid gap-4", !attendance ? "grid-cols-2" : "grid-cols-1")}>
                {/* Service Date */}
                <div className="space-y-2">
                  <Label htmlFor="service_date">
                    Service Date <span className="text-red-500">*</span>
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal cursor-pointer",
                          !serviceDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {serviceDate ? format(serviceDate, "PPP") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={serviceDate}
                        onSelect={(date) => {
                          setServiceDate(date);
                          setValue("service_date", format(date, "yyyy-MM-dd"));
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  {errors.service_date && (
                    <p className="text-sm text-red-500">{errors.service_date.message}</p>
                  )}
                </div>

                {/* Attendance Status (manual override) - Conditional */}
                {!attendance && (
                  <div className="space-y-2">
                    <Label htmlFor="attendance_status">Absence Reason</Label>
                    <Select
                      onValueChange={(value) => setValue("attendance_status", value)}
                      defaultValue="absent"
                    >
                      <SelectTrigger className="cursor-pointer">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="absent">Absent (Unexcused)</SelectItem>
                        <SelectItem value="excused">Absent (Excused)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {/* Row 4: Duration */}
              <div className="space-y-2">
                <Label htmlFor="duration_minutes">Duration (minutes)</Label>
                <Input
                  id="duration_minutes"
                  type="number"
                  placeholder="e.g., 60"
                  {...register("duration_minutes")}
                />
                {errors.duration_minutes && (
                  <p className="text-sm text-red-500">{errors.duration_minutes.message}</p>
                )}
              </div>
            </div>

            {/* RIGHT COLUMN */}
            <div className="space-y-4">
              {/* Row 1: Progress Notes */}
              <div className="space-y-2">
                <Label htmlFor="progress_notes">Progress Notes</Label>
                <Textarea
                  id="progress_notes"
                  placeholder="Document progress and observations..."
                  rows={4}
                  {...register("progress_notes")}
                />
                {errors.progress_notes && (
                  <p className="text-sm text-red-500">{errors.progress_notes.message}</p>
                )}
              </div>

              {/* Row 2: Milestones Achieved */}
              <div className="space-y-2">
                <Label htmlFor="milestones_achieved">Milestones Achieved</Label>
                <Textarea
                  id="milestones_achieved"
                  placeholder="Enter milestones separated by commas"
                  rows={3}
                  {...register("milestones_achieved")}
                />
                <p className="text-xs text-muted-foreground">
                  Separate multiple milestones with commas
                </p>
                {errors.milestones_achieved && (
                  <p className="text-sm text-red-500">
                    {errors.milestones_achieved.message}
                  </p>
                )}
              </div>

              {/* Row 3: Next Steps */}
              <div className="space-y-2">
                <Label htmlFor="next_steps">Next Steps</Label>
                <Textarea
                  id="next_steps"
                  placeholder="Plan for next session or follow-up actions..."
                  rows={3}
                  {...register("next_steps")}
                />
                {errors.next_steps && (
                  <p className="text-sm text-red-500">{errors.next_steps.message}</p>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} className="cursor-pointer">
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="cursor-pointer">
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Log Service
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
