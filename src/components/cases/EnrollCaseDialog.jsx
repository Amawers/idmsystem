/**
 * @file EnrollCaseDialog.jsx
 * @description Dialog component for enrolling cases into programs
 * @module components/cases/EnrollCaseDialog
 * 
 * Features:
 * - Select available programs with capacity
 * - Filter programs by type and beneficiary compatibility
 * - View program details before enrollment
 * - Set enrollment date and case worker
 * - Validate program capacity and case eligibility
 * - Create audit log entries
 */

import { useState, useEffect, useMemo } from "react";
import { usePrograms } from "@/hooks/usePrograms";
import { useEnrollments } from "@/hooks/useEnrollments";
import { useAuthStore } from "@/store/authStore";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, AlertCircle, CheckCircle2, Info } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import supabase from "@/../config/supabase";
import { createAuditLog, AUDIT_ACTIONS, AUDIT_CATEGORIES } from "@/lib/auditLog";

/**
 * Enroll Case Dialog Component
 * @param {Object} props - Component props
 * @param {boolean} props.open - Dialog open state
 * @param {Function} props.onOpenChange - Dialog open state change handler
 * @param {Object} props.caseData - Case data to enroll
 * @param {string} props.caseType - Type of case (CASE, CICLCAR, FAC, FAR, IVAC)
 * @param {Function} props.onSuccess - Success callback
 * @returns {JSX.Element} Enroll case dialog
 */
export default function EnrollCaseDialog({ 
  open, 
  onOpenChange, 
  caseData, 
  caseType,
  onSuccess 
}) {
  const { user } = useAuthStore();
  const { programs, loading: programsLoading } = usePrograms({ status: "active" });
  const { createEnrollment, getEnrollmentsByCaseId } = useEnrollments();
  
  const [selectedProgramId, setSelectedProgramId] = useState("");
  const [enrollmentDate, setEnrollmentDate] = useState(new Date());
  const [caseWorker, setCaseWorker] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [existingEnrollments, setExistingEnrollments] = useState([]);

  // Map case types to beneficiary types for program filtering (must match program target_beneficiary values)
  const caseTypeToBeneficiary = {
    CASE: "CASE", // Regular cases
    CICLCAR: "CICL/CAR", // Children in Conflict with the Law / Children at Risk (for program matching)
    FAC: "FAC",
    FAR: "FAR",
    IVAC: "IVAC",
  };

  // Map case types to enrollment case_type (must match database constraint)
  const caseTypeToEnrollmentType = {
    CASE: "VAC", // Regular cases stored as VAC in enrollments
    CICLCAR: "CICL/CAR", // CICL/CAR cases stored as CICL/CAR in enrollments
    FAC: "FAC",
    FAR: "FAR",
    IVAC: "IVAC",
  };

  const beneficiaryType = caseTypeToBeneficiary[caseType] || caseType;
  const enrollmentCaseType = caseTypeToEnrollmentType[caseType] || caseType;

  // Get beneficiary name based on case type
  const getBeneficiaryName = () => {
    if (!caseData) return "";
    
    switch (caseType) {
      case "CASE":
        return caseData.identifying_name || caseData.identifying2_name || "N/A";
      case "CICLCAR":
        return caseData.profile_name || "N/A";
      case "FAC":
        return `${caseData.head_first_name || ""} ${caseData.head_last_name || ""}`.trim() || "N/A";
      case "FAR":
        return caseData.receiving_member || "N/A";
      case "IVAC":
        return `${caseData.municipality || ""} - ${caseData.province || ""}`.trim() || "N/A";
      default:
        return "N/A";
    }
  };

  // Filter programs compatible with this case type
  const compatiblePrograms = useMemo(() => {
    if (!programs || programs.length === 0) return [];
    
    return programs.filter(program => {
      // Check if program targets this beneficiary type
      const targetsThisBeneficiary = program.target_beneficiary?.includes(beneficiaryType);
      
      // Check if program has capacity
      const hasCapacity = (program.current_enrollment || 0) < (program.capacity || 0);
      
      // Check if program is active
      const isActive = program.status === "active";
      
      return targetsThisBeneficiary && hasCapacity && isActive;
    });
  }, [programs, beneficiaryType]);

  const selectedProgram = useMemo(() => {
    return compatiblePrograms.find(p => p.id === selectedProgramId);
  }, [compatiblePrograms, selectedProgramId]);

  // Fetch existing enrollments for this case
  useEffect(() => {
    if (open && caseData) {
      fetchExistingEnrollments();
    }
  }, [open, caseData]);

  const fetchExistingEnrollments = async () => {
    try {
      const { data, error } = await supabase
        .from("program_enrollments")
        .select(`
          *,
          program:programs(program_name, program_type)
        `)
        .eq("case_id", caseData.id)
        .eq("status", "active");

      if (error) throw error;
      setExistingEnrollments(data || []);
    } catch (error) {
      console.error("Error fetching existing enrollments:", error);
      setExistingEnrollments([]);
    }
  };

  // Check if case is already enrolled in selected program
  const isAlreadyEnrolled = useMemo(() => {
    if (!selectedProgramId) return false;
    return existingEnrollments.some(e => e.program_id === selectedProgramId);
  }, [existingEnrollments, selectedProgramId]);

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setSelectedProgramId("");
      setEnrollmentDate(new Date());
      setCaseWorker("");
      setNotes("");
      setExistingEnrollments([]);
    }
  }, [open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedProgramId) {
      toast.error("Please select a program");
      return;
    }

    if (isAlreadyEnrolled) {
      toast.error("Case is already enrolled in this program");
      return;
    }

    setIsSubmitting(true);

    try {
      const beneficiaryName = getBeneficiaryName();
      
      // Prepare enrollment data - ONLY include columns that exist in program_enrollments table
      const enrollmentData = {
        case_id: caseData.id,
        case_number: caseData.id, // Using ID as case number for now
        case_type: enrollmentCaseType, // Use DB-compliant case type (CICL, VAC, etc.)
        beneficiary_name: beneficiaryName,
        program_id: selectedProgramId,
        enrollment_date: format(enrollmentDate, "yyyy-MM-dd"),
        expected_completion_date: null, // Can be calculated based on program duration
        status: "active",
        progress_percentage: 0,
        sessions_total: 0,
        sessions_attended: 0,
        sessions_completed: 0,
        attendance_rate: 0,
        assigned_by: user?.id,
        assigned_by_name: user?.email,
        case_worker: caseWorker || null,
        notes: notes || null,
      };

      // Insert enrollment into Supabase
      const { data: newEnrollment, error } = await supabase
        .from("program_enrollments")
        .insert([enrollmentData])
        .select()
        .single();

      if (error) throw error;

      // Create audit log entry
      await createAuditLog({
        actionType: AUDIT_ACTIONS.CREATE_ENROLLMENT,
        actionCategory: AUDIT_CATEGORIES.PROGRAM,
        description: `Enrolled ${beneficiaryName} (${enrollmentCaseType}) in program: ${selectedProgram.program_name}`,
        resourceType: "enrollment",
        resourceId: newEnrollment.id,
        metadata: {
          caseId: caseData.id,
          caseType: enrollmentCaseType,
          beneficiaryName,
          programId: selectedProgramId,
          programName: selectedProgram.program_name,
          enrollmentDate: enrollmentData.enrollment_date,
          assignedBy: user?.email,
          caseWorker: caseWorker,
        },
        severity: "info",
      });

      toast.success("Enrollment Created", {
        description: `Successfully enrolled ${beneficiaryName} in ${selectedProgram.program_name}`,
      });

      // Call success callback
      if (onSuccess) {
        onSuccess(newEnrollment);
      }

      // Close dialog
      onOpenChange(false);
    } catch (error) {
      console.error("Error creating enrollment:", error);
      toast.error("Enrollment Failed", {
        description: error.message || "Failed to create enrollment. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Enroll Case in Program</DialogTitle>
          <DialogDescription>
            Select a program to enroll this {beneficiaryType} case into.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Case Information */}
          <div className="rounded-lg border p-4 bg-muted/50">
            <div className="flex items-center gap-2 mb-3">
              <Info className="h-4 w-4 text-blue-600" />
              <h3 className="font-semibold text-sm">Case Information</h3>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <Label className="text-muted-foreground">Case ID</Label>
                <div className="font-medium">{caseData?.id || "N/A"}</div>
              </div>
              <div>
                <Label className="text-muted-foreground">Case Type</Label>
                <Badge variant="outline">{beneficiaryType}</Badge>
              </div>
              <div className="col-span-2">
                <Label className="text-muted-foreground">Beneficiary Name</Label>
                <div className="font-medium">{getBeneficiaryName()}</div>
              </div>
            </div>
          </div>

          {/* Existing Enrollments Warning */}
          {existingEnrollments.length > 0 && (
            <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="h-4 w-4 text-yellow-600" />
                <h4 className="font-semibold text-sm text-yellow-900">
                  Active Enrollments ({existingEnrollments.length})
                </h4>
              </div>
              <div className="space-y-1 text-sm text-yellow-800">
                {existingEnrollments.map(enrollment => (
                  <div key={enrollment.id} className="flex items-center gap-2">
                    <CheckCircle2 className="h-3 w-3" />
                    <span>{enrollment.program?.program_name}</span>
                    <Badge variant="secondary" className="text-xs">
                      {enrollment.program?.program_type}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Program Selection */}
          <div className="space-y-2">
            <Label htmlFor="program">
              Select Program <span className="text-red-500">*</span>
            </Label>
            {programsLoading ? (
              <div className="text-sm text-muted-foreground">Loading programs...</div>
            ) : compatiblePrograms.length === 0 ? (
              <div className="rounded-lg border border-orange-200 bg-orange-50 p-4">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-orange-600" />
                  <p className="text-sm text-orange-900">
                    No compatible programs available for {beneficiaryType} cases with capacity.
                  </p>
                </div>
              </div>
            ) : (
              <Select value={selectedProgramId} onValueChange={setSelectedProgramId}>
                <SelectTrigger id="program">
                  <SelectValue placeholder="Choose a program..." />
                </SelectTrigger>
                <SelectContent>
                  {compatiblePrograms.map(program => {
                    const capacityPercent = (program.current_enrollment / program.capacity * 100).toFixed(0);
                    const isEnrolled = existingEnrollments.some(e => e.program_id === program.id);
                    const spotsLeft = program.capacity - program.current_enrollment;
                    
                    return (
                      <SelectItem 
                        key={program.id} 
                        value={program.id}
                        disabled={isEnrolled}
                        className="py-3"
                      >
                        <div className="flex flex-col gap-1 w-full">
                          <div className="flex items-center justify-between gap-4 w-full">
                            <div className="flex-1">
                              <div className="font-medium">{program.program_name}</div>
                              <div className="flex items-center gap-2 mt-0.5">
                                <Badge variant="secondary" className="text-xs">
                                  {program.program_type}
                                </Badge>
                                {isEnrolled && (
                                  <Badge variant="default" className="text-xs bg-green-600">
                                    Already Enrolled
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <div className="text-right text-xs">
                              <div className="text-muted-foreground">
                                {program.current_enrollment}/{program.capacity}
                              </div>
                              <div className={cn(
                                "font-medium",
                                spotsLeft > 10 ? "text-green-600" : 
                                spotsLeft > 5 ? "text-orange-600" : 
                                "text-red-600"
                              )}>
                                {spotsLeft} spots left
                              </div>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground mt-1">
                            <div className="flex items-center gap-1">
                              <span className="font-medium">Duration:</span> {program.duration_weeks} weeks
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="font-medium">Success:</span> {program.success_rate}%
                            </div>
                            <div className="col-span-2 flex items-center gap-1">
                              <span className="font-medium">Coordinator:</span> {program.coordinator}
                            </div>
                            {program.schedule && (
                              <div className="col-span-2 flex items-center gap-1">
                                <span className="font-medium">Schedule:</span> {program.schedule}
                              </div>
                            )}
                            {program.location && (
                              <div className="col-span-2 flex items-center gap-1">
                                <span className="font-medium">Location:</span> {program.location}
                              </div>
                            )}
                          </div>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            )}
            
            {isAlreadyEnrolled && (
              <p className="text-sm text-red-600">
                This case is already enrolled in the selected program.
              </p>
            )}
          </div>

          {/* Selected Program Details */}
          {selectedProgram && (
            <div className="rounded-lg border p-4 bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-900">
              <h4 className="font-semibold text-sm mb-3 text-blue-900 dark:text-blue-100">
                Program Details
              </h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <Label className="text-blue-700 dark:text-blue-400">Program Type</Label>
                  <div className="font-medium text-blue-900 dark:text-blue-100 capitalize">
                    {selectedProgram.program_type}
                  </div>
                </div>
                <div>
                  <Label className="text-blue-700 dark:text-blue-400">Duration</Label>
                  <div className="font-medium text-blue-900 dark:text-blue-100">
                    {selectedProgram.duration_weeks} weeks
                  </div>
                </div>
                <div>
                  <Label className="text-blue-700 dark:text-blue-400">Coordinator</Label>
                  <div className="font-medium text-blue-900 dark:text-blue-100">
                    {selectedProgram.coordinator || "N/A"}
                  </div>
                </div>
                <div>
                  <Label className="text-blue-700 dark:text-blue-400">Success Rate</Label>
                  <div className="font-medium text-blue-900 dark:text-blue-100">
                    {selectedProgram.success_rate}%
                  </div>
                </div>
                <div>
                  <Label className="text-blue-700 dark:text-blue-400">Capacity</Label>
                  <div className="font-medium text-blue-900 dark:text-blue-100">
                    {selectedProgram.current_enrollment}/{selectedProgram.capacity} enrolled
                    <span className="text-xs ml-1">
                      ({selectedProgram.capacity - selectedProgram.current_enrollment} spots left)
                    </span>
                  </div>
                </div>
                <div>
                  <Label className="text-blue-700 dark:text-blue-400">Budget Status</Label>
                  <div className="font-medium text-blue-900 dark:text-blue-100">
                    ₱{(selectedProgram.budget_spent || 0).toLocaleString()} / 
                    ₱{(selectedProgram.budget_allocated || 0).toLocaleString()}
                  </div>
                </div>
                {selectedProgram.schedule && (
                  <div className="col-span-2">
                    <Label className="text-blue-700 dark:text-blue-400">Schedule</Label>
                    <div className="font-medium text-blue-900 dark:text-blue-100">
                      {selectedProgram.schedule}
                    </div>
                  </div>
                )}
                {selectedProgram.location && (
                  <div className="col-span-2">
                    <Label className="text-blue-700 dark:text-blue-400">Location</Label>
                    <div className="font-medium text-blue-900 dark:text-blue-100">
                      {selectedProgram.location}
                    </div>
                  </div>
                )}
                {selectedProgram.start_date && (
                  <div>
                    <Label className="text-blue-700 dark:text-blue-400">Start Date</Label>
                    <div className="font-medium text-blue-900 dark:text-blue-100">
                      {new Date(selectedProgram.start_date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </div>
                  </div>
                )}
                {selectedProgram.end_date && (
                  <div>
                    <Label className="text-blue-700 dark:text-blue-400">End Date</Label>
                    <div className="font-medium text-blue-900 dark:text-blue-100">
                      {new Date(selectedProgram.end_date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </div>
                  </div>
                )}
                {selectedProgram.description && (
                  <div className="col-span-2">
                    <Label className="text-blue-700 dark:text-blue-400">Description</Label>
                    <div className="font-medium text-blue-900 dark:text-blue-100 text-xs">
                      {selectedProgram.description}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Enrollment Date */}
          <div className="space-y-2">
            <Label htmlFor="enrollment-date">
              Enrollment Date <span className="text-red-500">*</span>
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !enrollmentDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {enrollmentDate ? format(enrollmentDate, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={enrollmentDate}
                  onSelect={setEnrollmentDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Case Worker */}
          <div className="space-y-2">
            <Label htmlFor="case-worker">Case Worker</Label>
            <Input
              id="case-worker"
              placeholder="Enter case worker name (optional)"
              value={caseWorker}
              onChange={(e) => setCaseWorker(e.target.value)}
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Add any additional notes about this enrollment..."
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting || !selectedProgramId || isAlreadyEnrolled || compatiblePrograms.length === 0}
            >
              {isSubmitting ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Enrolling...
                </>
              ) : (
                "Enroll in Program"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
