/**
 * @file CreateProgramDialog.jsx
 * @description Dialog component for creating and editing programs
 * @module components/programs/CreateProgramDialog
 * 
 * Features:
 * - Create new program with validation
 * - Edit existing program
 * - Form validation with react-hook-form and Zod
 * - Multi-select for target beneficiaries
 */

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { usePrograms } from "@/hooks/usePrograms";
import { toast } from "sonner";

// Program form schema
const programSchema = z.object({
  program_name: z.string().min(3, "Program name must be at least 3 characters"),
  program_type: z.string().min(1, "Program type is required"),
  target_beneficiary: z.string().min(1, "Target beneficiary is required"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  duration_weeks: z.coerce.number().min(1, "Duration must be at least 1 week"),
  budget_allocated: z.coerce.number().min(0, "Budget must be a positive number"),
  capacity: z.coerce.number().min(1, "Capacity must be at least 1"),
  coordinator: z.string().min(1, "Coordinator name is required"),
  location: z.string().min(1, "Location is required"),
  schedule: z.string().min(1, "Schedule is required"),
  start_date: z.string().min(1, "Start date is required"),
  status: z.enum(["active", "inactive", "completed"]),
});

const PROGRAM_TYPES = [
  { value: "counseling", label: "Counseling" },
  { value: "legal", label: "Legal Aid" },
  { value: "medical", label: "Medical" },
  { value: "educational", label: "Educational" },
  { value: "financial", label: "Financial" },
  { value: "prevention", label: "Prevention" },
  { value: "livelihood", label: "Livelihood" },
  { value: "shelter", label: "Shelter" },
  { value: "recreational", label: "Recreational" },
];

const BENEFICIARY_TYPES = [
  { value: "CASE", label: "CASE" },
  { value: "CICL/CAR", label: "CICL/CAR" },
];

/**
 * Create Program Dialog Component
 * @param {Object} props - Component props
 * @param {boolean} props.open - Dialog open state
 * @param {Function} props.onOpenChange - Function to toggle dialog
 * @param {Object} props.program - Program to edit (optional)
 * @returns {JSX.Element} Create program dialog
 */
export default function CreateProgramDialog({ open, onOpenChange, program = null }) {
  const [submitting, setSubmitting] = useState(false);
  
  const { createProgram, updateProgram } = usePrograms();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm({
    resolver: zodResolver(programSchema),
    defaultValues: program || {
      status: "active",
    },
  });

  const onSubmit = async (data) => {
    setSubmitting(true);

    try {
      const programData = {
        ...data,
        budget_allocated: parseFloat(data.budget_allocated),
        duration_weeks: parseInt(data.duration_weeks),
        capacity: parseInt(data.capacity),
      };

      if (program) {
        // Update existing program
        await updateProgram(program.id, programData);
        toast.success("Success", {
          description: "Program updated successfully",
        });
      } else {
        // Create new program
        await createProgram(programData);
        toast.success("Success", {
          description: "Program created successfully",
        });
      }

      reset();
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving program:", error);
      toast.error("Error", {
        description: "Failed to save program. Please try again.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="min-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{program ? "Edit Program" : "Create New Program"}</DialogTitle>
          <DialogDescription>
            {program
              ? "Update program details and settings"
              : "Add a new intervention program to the catalog"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Three Column Layout */}
          <div className="grid grid-cols-3 gap-6">
            
            {/* FIRST COLUMN: Program Name, Program Type, Target Beneficiaries, Description */}
            <div className="space-y-4">
              {/* Program Name */}
              <div className="space-y-2">
                <Label htmlFor="program_name">Program Name *</Label>
                <Input
                  id="program_name"
                  {...register("program_name")}
                  placeholder="e.g., Youth Counseling & Rehabilitation"
                />
                {errors.program_name && (
                  <p className="text-sm text-red-600">{errors.program_name.message}</p>
                )}
              </div>

              {/* Program Type */}
              <div className="space-y-2">
                <Label htmlFor="program_type">Program Type *</Label>
                <Select
                  onValueChange={(value) => setValue("program_type", value)}
                  defaultValue={program?.program_type}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select program type" />
                  </SelectTrigger>
                  <SelectContent>
                    {PROGRAM_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.program_type && (
                  <p className="text-sm text-red-600">{errors.program_type.message}</p>
                )}
              </div>

              {/* Target Beneficiaries */}
              <div className="space-y-2">
                <Label htmlFor="target_beneficiary">Target Beneficiaries *</Label>
                <Select
                  onValueChange={(value) => setValue("target_beneficiary", value)}
                  defaultValue={program?.target_beneficiary}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select target beneficiary" />
                  </SelectTrigger>
                  <SelectContent>
                    {BENEFICIARY_TYPES.map((beneficiary) => (
                      <SelectItem key={beneficiary.value} value={beneficiary.value}>
                        {beneficiary.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.target_beneficiary && (
                  <p className="text-sm text-red-600">{errors.target_beneficiary.message}</p>
                )}
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  {...register("description")}
                  placeholder="Describe the program goals and activities..."
                  rows={4}
                />
                {errors.description && (
                  <p className="text-sm text-red-600">{errors.description.message}</p>
                )}
              </div>
            </div>

            {/* SECOND COLUMN: Duration, Capacity, Location, Start Date */}
            <div className="space-y-4">
              {/* Duration */}
              <div className="space-y-2">
                <Label htmlFor="duration_weeks">Duration (weeks) *</Label>
                <Input
                  id="duration_weeks"
                  type="number"
                  {...register("duration_weeks")}
                  placeholder="12"
                />
                {errors.duration_weeks && (
                  <p className="text-sm text-red-600">{errors.duration_weeks.message}</p>
                )}
              </div>

              {/* Capacity */}
              <div className="space-y-2">
                <Label htmlFor="capacity">Capacity *</Label>
                <Input
                  id="capacity"
                  type="number"
                  {...register("capacity")}
                  placeholder="30"
                />
                {errors.capacity && (
                  <p className="text-sm text-red-600">{errors.capacity.message}</p>
                )}
              </div>

              {/* Location */}
              <div className="space-y-2">
                <Label htmlFor="location">Location *</Label>
                <Input
                  id="location"
                  {...register("location")}
                  placeholder="Main Office - Room 201"
                />
                {errors.location && (
                  <p className="text-sm text-red-600">{errors.location.message}</p>
                )}
              </div>

              {/* Start Date */}
              <div className="space-y-2">
                <Label htmlFor="start_date">Start Date *</Label>
                <Input id="start_date" type="date" {...register("start_date")} />
                {errors.start_date && (
                  <p className="text-sm text-red-600">{errors.start_date.message}</p>
                )}
              </div>
            </div>

            {/* THIRD COLUMN: Budget Allocated, Coordinator, Schedule, Status */}
            <div className="space-y-4">
              {/* Budget Allocated */}
              <div className="space-y-2">
                <Label htmlFor="budget_allocated">Budget Allocated *</Label>
                <Input
                  id="budget_allocated"
                  type="number"
                  step="0.01"
                  {...register("budget_allocated")}
                  placeholder="150000.00"
                />
                {errors.budget_allocated && (
                  <p className="text-sm text-red-600">{errors.budget_allocated.message}</p>
                )}
              </div>

              {/* Coordinator */}
              <div className="space-y-2">
                <Label htmlFor="coordinator">Coordinator *</Label>
                <Input
                  id="coordinator"
                  {...register("coordinator")}
                  placeholder="Maria Santos"
                />
                {errors.coordinator && (
                  <p className="text-sm text-red-600">{errors.coordinator.message}</p>
                )}
              </div>

              {/* Schedule */}
              <div className="space-y-2">
                <Label htmlFor="schedule">Schedule *</Label>
                <Input
                  id="schedule"
                  {...register("schedule")}
                  placeholder="Mon, Wed, Fri 2:00 PM - 4:00 PM"
                />
                {errors.schedule && (
                  <p className="text-sm text-red-600">{errors.schedule.message}</p>
                )}
              </div>

              {/* Status */}
              <div className="space-y-2">
                <Label htmlFor="status">Status *</Label>
                <Select
                  onValueChange={(value) => setValue("status", value)}
                  defaultValue={program?.status || "active"}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
                {errors.status && (
                  <p className="text-sm text-red-600">{errors.status.message}</p>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting
                ? "Saving..."
                : program
                ? "Update Program"
                : "Create Program"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
