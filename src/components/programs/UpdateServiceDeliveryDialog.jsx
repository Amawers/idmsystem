/**
 * @file UpdateServiceDeliveryDialog.jsx
 * @description Dialog component for editing existing service delivery records
 * @module components/programs/UpdateServiceDeliveryDialog
 * 
 * Features:
 * - Edit service delivery details
 * - Update attendance status
 * - Modify progress notes and milestones
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
import { CalendarIcon, Loader2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

// Validation schema
const updateServiceDeliverySchema = z.object({
  service_date: z.string().min(1, "Service date is required"),
  service_type: z.string().min(1, "Service type is required"),
  service_provider: z.string().min(1, "Service provider is required"),
  attendance: z.boolean(),
  attendance_status: z.enum(["present", "absent", "excused"]),
  duration_minutes: z.string().optional(),
  progress_notes: z.string().optional(),
  milestones_achieved: z.string().optional(),
  next_steps: z.string().optional(),
});

/**
 * Update Service Delivery Dialog Component
 * @param {Object} props
 * @param {boolean} props.open - Dialog open state
 * @param {Function} props.onOpenChange - Dialog state change handler
 * @param {Object} props.serviceDelivery - Service delivery record to edit
 * @param {Function} props.onSuccess - Callback function called after successful update
 * @returns {JSX.Element}
 */
export default function UpdateServiceDeliveryDialog({
  open,
  onOpenChange,
  serviceDelivery,
  onSuccess,
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serviceDate, setServiceDate] = useState(new Date());

  const { updateServiceDelivery } = useServiceDelivery();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm({
    resolver: zodResolver(updateServiceDeliverySchema),
  });

  const attendance = watch("attendance");

  // Update attendance status based on attendance switch
  useEffect(() => {
    if (attendance) {
      setValue("attendance_status", "present");
    }
  }, [attendance, setValue]);

  // Populate form when serviceDelivery prop changes
  useEffect(() => {
    if (serviceDelivery && open) {
      // Convert milestones array to comma-separated string
      const milestonesString = Array.isArray(serviceDelivery.milestones_achieved)
        ? serviceDelivery.milestones_achieved.join(", ")
        : "";

      const date = serviceDelivery.service_date
        ? parseISO(serviceDelivery.service_date)
        : new Date();
      setServiceDate(date);

      reset({
        service_date: serviceDelivery.service_date || format(new Date(), "yyyy-MM-dd"),
        service_type: serviceDelivery.service_type || "",
        service_provider: serviceDelivery.service_provider || "",
        attendance: serviceDelivery.attendance || false,
        attendance_status: serviceDelivery.attendance_status || "absent",
        duration_minutes: serviceDelivery.duration_minutes?.toString() || "",
        progress_notes: serviceDelivery.progress_notes || "",
        milestones_achieved: milestonesString,
        next_steps: serviceDelivery.next_steps || "",
      });
    }
  }, [serviceDelivery, open, reset]);

  /**
   * Handle form submission
   * @param {Object} data - Form data
   */
  const onSubmit = async (data) => {
    try {
      setIsSubmitting(true);

      // Parse milestones from comma-separated string to array
      const milestonesArray = data.milestones_achieved
        ? data.milestones_achieved.split(",").map((m) => m.trim()).filter(Boolean)
        : [];

      // Prepare update data
      const updates = {
        service_date: data.service_date,
        service_type: data.service_type,
        service_provider: data.service_provider,
        attendance: data.attendance,
        attendance_status: data.attendance_status,
        duration_minutes: data.duration_minutes ? parseInt(data.duration_minutes) : null,
        progress_notes: data.progress_notes || null,
        milestones_achieved: milestonesArray,
        next_steps: data.next_steps || null,
      };

      await updateServiceDelivery(serviceDelivery.id, updates);

      toast.success("Service delivery updated successfully");
      onOpenChange(false);
      
      // Call onSuccess callback if provided
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error("Error updating service delivery:", error);
      toast.error(error.message || "Failed to update service delivery");
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Handle dialog close
   */
  const handleClose = () => {
    reset();
    onOpenChange(false);
  };

  if (!serviceDelivery) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Service Delivery</DialogTitle>
          <DialogDescription>
            Update service delivery record for {serviceDelivery.beneficiary_name}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
                    "w-full justify-start text-left font-normal",
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

          <div className="grid grid-cols-2 gap-4">
            {/* Service Type */}
            <div className="space-y-2">
              <Label htmlFor="service_type">
                Service Type <span className="text-red-500">*</span>
              </Label>
              <Input
                id="service_type"
                placeholder="e.g., Individual Counseling"
                {...register("service_type")}
              />
              {errors.service_type && (
                <p className="text-sm text-red-500">{errors.service_type.message}</p>
              )}
            </div>

            {/* Service Provider */}
            <div className="space-y-2">
              <Label htmlFor="service_provider">
                Service Provider <span className="text-red-500">*</span>
              </Label>
              <Input
                id="service_provider"
                placeholder="Provider name"
                {...register("service_provider")}
              />
              {errors.service_provider && (
                <p className="text-sm text-red-500">{errors.service_provider.message}</p>
              )}
            </div>
          </div>

          {/* Attendance */}
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

          {/* Attendance Status (manual override) */}
          {!attendance && (
            <div className="space-y-2">
              <Label htmlFor="attendance_status">Absence Reason</Label>
              <Select
                onValueChange={(value) => setValue("attendance_status", value)}
                value={watch("attendance_status")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="absent">Absent (Unexcused)</SelectItem>
                  <SelectItem value="excused">Absent (Excused)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Duration */}
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

          {/* Progress Notes */}
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

          {/* Milestones Achieved */}
          <div className="space-y-2">
            <Label htmlFor="milestones_achieved">Milestones Achieved</Label>
            <Textarea
              id="milestones_achieved"
              placeholder="Enter milestones separated by commas"
              rows={2}
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

          {/* Next Steps */}
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

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update Service
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
