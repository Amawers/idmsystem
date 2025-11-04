/**
 * @file ProgramEnrollmentBadge.jsx
 * @description Badge component displaying program enrollment count with detailed popover
 * @module components/cases/ProgramEnrollmentBadge
 * 
 * Features:
 * - Green badge showing number of active program enrollments
 * - Hover popover with detailed program information
 * - Shows program names, types, progress, and attendance
 * - Handles loading and empty states
 * - Click to open full enrollment details
 * 
 * @param {Object} props - Component props
 * @param {string} props.caseId - Case ID to fetch enrollments for
 * @param {string} props.caseType - Case type (CASE, CICLCAR, etc.)
 * @param {Function} props.onEnrollClick - Callback when enrollment action is clicked
 * @returns {JSX.Element} Program enrollment badge
 */

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CheckCircle2, Info, TrendingUp, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import supabase from "@/../config/supabase";
import { Skeleton } from "@/components/ui/skeleton";

export default function ProgramEnrollmentBadge({ caseId, caseType, onEnrollClick }) {
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (caseId) {
      fetchEnrollments();
    }
  }, [caseId]);

  const fetchEnrollments = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from("program_enrollments")
        .select(`
          *,
          program:programs(
            id,
            program_name,
            program_type,
            duration_weeks,
            coordinator,
            location,
            schedule
          )
        `)
        .eq("case_id", caseId)
        .eq("status", "active")
        .order("enrollment_date", { ascending: false });

      if (error) throw error;

      setEnrollments(data || []);
    } catch (error) {
      console.error("Error fetching enrollments:", error);
      setEnrollments([]);
    } finally {
      setLoading(false);
    }
  };

  // Loading state
  if (loading) {
    return <Skeleton className="h-5 w-16" />;
  }

  // No enrollments
  if (enrollments.length === 0) {
    return (
      <Badge 
        variant="outline" 
        className="text-muted-foreground border-dashed"
        onClick={(e) => {
          e.stopPropagation(); // Prevent row click handler
        }}
      >
        Not Enrolled
      </Badge>
    );
  }

  // Has enrollments
  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Badge 
          variant="default" 
          className={cn(
            "cursor-pointer gap-1.5 bg-green-600 hover:bg-green-700 border-green-700",
            "transition-colors duration-200"
          )}
          onClick={(e) => {
            e.stopPropagation(); // Prevent row click handler
          }}
        >
          <CheckCircle2 className="h-3 w-3" />
          <span>{enrollments.length} {enrollments.length === 1 ? 'Program' : 'Programs'}</span>
        </Badge>
      </PopoverTrigger>
      <PopoverContent 
        className="w-96 p-0" 
        align="start"
        side="right"
      >
        <div className="flex flex-col">
          {/* Header */}
          <div className="px-4 py-3 border-b bg-green-50 dark:bg-green-950">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-700 dark:text-green-400" />
              <h4 className="font-semibold text-sm text-green-900 dark:text-green-100">
                Active Program Enrollments
              </h4>
            </div>
            <p className="text-xs text-green-700 dark:text-green-400 mt-1">
              {enrollments.length} active {enrollments.length === 1 ? 'program' : 'programs'}
            </p>
          </div>

          {/* Enrollment List */}
          <div className="max-h-80 overflow-y-auto">
            {enrollments.map((enrollment, index) => (
              <div 
                key={enrollment.id} 
                className={cn(
                  "px-4 py-3 hover:bg-muted/50 transition-colors",
                  index !== enrollments.length - 1 && "border-b"
                )}
              >
                {/* Program Name & Type */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1 min-w-0">
                    <h5 className="font-semibold text-sm truncate">
                      {enrollment.program?.program_name || "Unknown Program"}
                    </h5>
                    <Badge variant="secondary" className="text-xs mt-1">
                      {enrollment.program?.program_type || "N/A"}
                    </Badge>
                  </div>
                </div>

                {/* Program Details Grid */}
                <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                  {/* Enrollment Date */}
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    <span className="truncate">
                      {enrollment.enrollment_date 
                        ? new Date(enrollment.enrollment_date).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric', 
                            year: 'numeric' 
                          })
                        : "N/A"}
                    </span>
                  </div>

                  {/* Progress */}
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <TrendingUp className="h-3 w-3" />
                    <span>
                      {enrollment.progress_percentage || 0}% Complete
                    </span>
                  </div>

                  {/* Sessions */}
                  <div className="flex items-center gap-1.5 text-muted-foreground col-span-2">
                    <Info className="h-3 w-3" />
                    <span>
                      {enrollment.sessions_attended || 0}/{enrollment.sessions_total || 0} Sessions
                      {enrollment.attendance_rate ? 
                        ` (${enrollment.attendance_rate}% attendance)` : 
                        ''
                      }
                    </span>
                  </div>

                  {/* Coordinator */}
                  {enrollment.program?.coordinator && (
                    <div className="col-span-2 text-muted-foreground">
                      <span className="font-medium">Coordinator:</span> {enrollment.program.coordinator}
                    </div>
                  )}

                  {/* Location */}
                  {enrollment.program?.location && (
                    <div className="col-span-2 text-muted-foreground">
                      <span className="font-medium">Location:</span> {enrollment.program.location}
                    </div>
                  )}

                  {/* Schedule */}
                  {enrollment.program?.schedule && (
                    <div className="col-span-2 text-muted-foreground">
                      <span className="font-medium">Schedule:</span> {enrollment.program.schedule}
                    </div>
                  )}

                  {/* Case Worker */}
                  {enrollment.case_worker && (
                    <div className="col-span-2 text-muted-foreground">
                      <span className="font-medium">Case Worker:</span> {enrollment.case_worker}
                    </div>
                  )}
                </div>

                {/* Notes */}
                {enrollment.notes && (
                  <div className="mt-2 p-2 bg-muted rounded text-xs">
                    <p className="text-muted-foreground italic line-clamp-2">
                      {enrollment.notes}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="px-4 py-3 border-t bg-muted/30">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(false);
                if (onEnrollClick) onEnrollClick();
              }}
              className="w-full text-xs font-medium text-primary hover:underline text-center"
            >
              + Enroll in Another Program
            </button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
