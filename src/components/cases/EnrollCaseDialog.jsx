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
import { useAuthStore } from "@/store/authStore";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
  
  const [selectedProgramId, setSelectedProgramId] = useState("");
  const [enrollmentDate, setEnrollmentDate] = useState(new Date());
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
        case_worker: null,
        notes: null,
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
      <DialogContent className="min-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Enroll Case in Program</DialogTitle>
          <DialogDescription>
            Select a program to enroll this {beneficiaryType} case into.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Two Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-4">
              {/* Case Information */}
              <div className="rounded-lg border p-3 bg-muted/50">
                <div className="flex items-center gap-2 mb-2">
                  <Info className="h-4 w-4 text-blue-600" />
                  <h3 className="font-semibold text-sm">Case Information</h3>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <Label className="text-muted-foreground">Case ID:</Label>
                    <span className="font-medium">{caseData?.id || "N/A"}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <Label className="text-muted-foreground">Type:</Label>
                    <Badge variant="outline" className="text-xs">{beneficiaryType}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <Label className="text-muted-foreground">Beneficiary:</Label>
                    <span className="font-medium truncate ml-2 max-w-[180px]" title={getBeneficiaryName()}>
                      {getBeneficiaryName()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Existing Enrollments */}
              {existingEnrollments.length > 0 && (
                <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="h-4 w-4 text-yellow-600" />
                    <h4 className="font-semibold text-sm text-yellow-900">
                      Active Enrollments ({existingEnrollments.length})
                    </h4>
                  </div>
                  <div className="space-y-1 text-xs text-yellow-800 max-h-[72px] overflow-y-auto">
                    {existingEnrollments.map(enrollment => (
                      <div key={enrollment.id} className="flex items-center gap-2">
                        <CheckCircle2 className="h-3 w-3 shrink-0" />
                        <span className="truncate">{enrollment.program?.program_name}</span>
                      </div>
                    ))}
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
                        "w-full justify-start text-left font-normal cursor-pointer",
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
            </div>

            {/* Right Column - Program Selection */}
            <div className="space-y-2">
              <Label>
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
                <div className="space-y-2 max-h-[240px] overflow-y-auto rounded-lg border p-2 bg-muted/30">
                  {compatiblePrograms.map(program => {
                    const isEnrolled = existingEnrollments.some(e => e.program_id === program.id);
                    const spotsLeft = program.capacity - program.current_enrollment;
                    const isSelected = selectedProgramId === program.id;
                    
                    return (
                      <div
                        key={program.id}
                        onClick={() => {
                          if (!isEnrolled) {
                            // Toggle selection: if already selected, unselect; otherwise select
                            setSelectedProgramId(isSelected ? "" : program.id);
                          }
                        }}
                        className={cn(
                          "rounded-md border p-2.5 cursor-pointer transition-all",
                          isSelected && "border-primary bg-primary/10 shadow-sm ring-1 ring-primary/50",
                          !isSelected && "hover:border-primary/50 hover:bg-muted/50",
                          isEnrolled && "opacity-50 cursor-not-allowed"
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm truncate">{program.program_name}</div>
                            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                              <Badge variant="secondary" className="text-xs px-1.5 py-0">
                                {program.program_type}
                              </Badge>
                              <span className="text-xs text-muted-foreground">•</span>
                              <span className="text-xs text-muted-foreground">
                                {program.duration_weeks}w
                              </span>
                              <span className="text-xs text-muted-foreground">•</span>
                              <span className="text-xs text-green-600 font-medium">
                                {program.success_rate}%
                              </span>
                              {isEnrolled && (
                                <>
                                  <span className="text-xs text-muted-foreground">•</span>
                                  <Badge variant="default" className="text-xs bg-green-600 px-1.5 py-0">
                                    Enrolled
                                  </Badge>
                                </>
                              )}
                            </div>
                            {selectedProgramId === program.id && (
                              <div className="mt-2 pt-2 border-t space-y-1 text-xs">
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Coordinator:</span>
                                  <span className="font-medium">{program.coordinator}</span>
                                </div>
                                {program.schedule && (
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Schedule:</span>
                                    <span className="font-medium">{program.schedule}</span>
                                  </div>
                                )}
                                {program.location && (
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Location:</span>
                                    <span className="font-medium truncate ml-2" title={program.location}>
                                      {program.location}
                                    </span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-xs text-muted-foreground">
                              {program.current_enrollment}/{program.capacity}
                            </div>
                            <div className={cn(
                              "text-xs font-semibold mt-0.5",
                              spotsLeft > 10 ? "text-green-600" : 
                              spotsLeft > 5 ? "text-orange-600" : 
                              "text-red-600"
                            )}>
                              {spotsLeft} left
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              
              {isAlreadyEnrolled && (
                <p className="text-xs text-red-600">
                  This case is already enrolled in the selected program.
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="cursor-pointer"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting || !selectedProgramId || isAlreadyEnrolled || compatiblePrograms.length === 0}
              className="cursor-pointer"
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
