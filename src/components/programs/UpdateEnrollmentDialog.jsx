/**
 * @file UpdateEnrollmentDialog.jsx
 * @description Dialog component for updating existing program enrollments
 * @module components/programs/UpdateEnrollmentDialog
 * 
 * Features:
 * - Update enrollment status and progress
 * - Update attendance metrics
 * - Set completion date
 * - Add notes and case worker updates
 */

import { useState, useEffect } from "react";
import { useEnrollments } from "@/hooks/useEnrollments";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertCircle } from "lucide-react";
import { calculateAttendanceRate, calculateProgressPercentage, determineProgressLevel } from "@/lib/enrollmentSubmission";

/**
 * Update Enrollment Dialog Component
 * @param {Object} props - Component props
 * @param {boolean} props.open - Dialog open state
 * @param {Function} props.onOpenChange - Dialog state change handler
 * @param {Object} props.enrollment - Enrollment to update
 * @param {Function} props.onSuccess - Success callback
 * @returns {JSX.Element} Update enrollment dialog
 */
export default function UpdateEnrollmentDialog({ open, onOpenChange, enrollment, onSuccess }) {
  const { updateEnrollment } = useEnrollments();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const [formData, setFormData] = useState({
    status: '',
    progress_percentage: '',
    progress_level: '',
    sessions_total: '',
    sessions_attended: '',
    sessions_completed: '',
    attendance_rate: '',
    completion_date: '',
    expected_completion_date: '',
    case_worker: '',
    notes: '',
  });

  // Initialize form data when enrollment changes
  useEffect(() => {
    if (enrollment && open) {
      setFormData({
        status: enrollment.status || '',
        progress_percentage: enrollment.progress_percentage?.toString() || '0',
        progress_level: enrollment.progress_level || '',
        sessions_total: enrollment.sessions_total?.toString() || '0',
        sessions_attended: enrollment.sessions_attended?.toString() || '0',
        sessions_completed: enrollment.sessions_completed?.toString() || '0',
        attendance_rate: enrollment.attendance_rate?.toString() || '0',
        completion_date: enrollment.completion_date || '',
        expected_completion_date: enrollment.expected_completion_date || '',
        case_worker: enrollment.case_worker || '',
        notes: enrollment.notes || '',
      });
      setError(null);
    }
  }, [enrollment, open]);

  /**
   * Handle form field changes
   */
  const handleChange = (field, value) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      
      // Auto-calculate metrics when sessions change
      if (field === 'sessions_attended' || field === 'sessions_total') {
        const attended = parseInt(field === 'sessions_attended' ? value : prev.sessions_attended) || 0;
        const total = parseInt(field === 'sessions_total' ? value : prev.sessions_total) || 0;
        updated.attendance_rate = calculateAttendanceRate(attended, total).toString();
      }
      
      if (field === 'sessions_completed' || field === 'sessions_total') {
        const completed = parseInt(field === 'sessions_completed' ? value : prev.sessions_completed) || 0;
        const total = parseInt(field === 'sessions_total' ? value : prev.sessions_total) || 0;
        const percentage = calculateProgressPercentage(completed, total);
        updated.progress_percentage = percentage.toString();
        updated.progress_level = determineProgressLevel(percentage);
      }
      
      // Auto-set completion date when status changes to completed
      if (field === 'status' && value === 'completed' && !prev.completion_date) {
        updated.completion_date = new Date().toISOString().split('T')[0];
      }
      
      return updated;
    });
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Validation
      const sessionsAttended = parseInt(formData.sessions_attended) || 0;
      const sessionsCompleted = parseInt(formData.sessions_completed) || 0;
      const sessionsTotal = parseInt(formData.sessions_total) || 0;

      if (sessionsAttended > sessionsTotal) {
        throw new Error('Sessions attended cannot exceed total sessions');
      }
      if (sessionsCompleted > sessionsTotal) {
        throw new Error('Sessions completed cannot exceed total sessions');
      }

      // Prepare update data
      const updates = {
        status: formData.status,
        progress_percentage: parseInt(formData.progress_percentage) || 0,
        progress_level: formData.progress_level || null,
        sessions_total: sessionsTotal,
        sessions_attended: sessionsAttended,
        sessions_completed: sessionsCompleted,
        attendance_rate: parseFloat(formData.attendance_rate) || 0,
        completion_date: formData.completion_date || null,
        expected_completion_date: formData.expected_completion_date || null,
        case_worker: formData.case_worker?.trim() || null,
        notes: formData.notes?.trim() || null,
      };

      // Update enrollment
      await updateEnrollment(enrollment.id, updates);

      // Success
      if (onSuccess) {
        onSuccess();
      }
      
      onOpenChange(false);
    } catch (err) {
      console.error('Error updating enrollment:', err);
      setError(err.message || 'Failed to update enrollment');
    } finally {
      setLoading(false);
    }
  };

  if (!enrollment) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Update Enrollment</DialogTitle>
          <DialogDescription>
            Update enrollment details for {enrollment.beneficiary_name}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Enrollment Info (Read-only) */}
          <div className="bg-muted p-4 rounded-md space-y-2">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="font-medium">Case Type:</span> {enrollment.case_type}
              </div>
              <div>
                <span className="font-medium">Case Number:</span> {enrollment.case_number}
              </div>
              <div>
                <span className="font-medium">Program:</span> {enrollment.program?.program_name || 'N/A'}
              </div>
              <div>
                <span className="font-medium">Enrollment Date:</span> {new Date(enrollment.enrollment_date).toLocaleDateString()}
              </div>
            </div>
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label htmlFor="status">Status *</Label>
            <Select
              value={formData.status}
              onValueChange={(value) => handleChange('status', value)}
              required
            >
              <SelectTrigger id="status">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="dropped">Dropped</SelectItem>
                <SelectItem value="at_risk">At Risk</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Session Metrics */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sessions_total">Total Sessions</Label>
              <Input
                id="sessions_total"
                type="number"
                min="0"
                value={formData.sessions_total}
                onChange={(e) => handleChange('sessions_total', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sessions_attended">Attended</Label>
              <Input
                id="sessions_attended"
                type="number"
                min="0"
                value={formData.sessions_attended}
                onChange={(e) => handleChange('sessions_attended', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sessions_completed">Completed</Label>
              <Input
                id="sessions_completed"
                type="number"
                min="0"
                value={formData.sessions_completed}
                onChange={(e) => handleChange('sessions_completed', e.target.value)}
              />
            </div>
          </div>

          {/* Calculated Metrics (Read-only) */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="attendance_rate">Attendance Rate (%)</Label>
              <Input
                id="attendance_rate"
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={formData.attendance_rate}
                readOnly
                className="bg-muted"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="progress_percentage">Progress (%)</Label>
              <Input
                id="progress_percentage"
                type="number"
                min="0"
                max="100"
                value={formData.progress_percentage}
                readOnly
                className="bg-muted"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="progress_level">Progress Level</Label>
              <Input
                id="progress_level"
                value={formData.progress_level || 'N/A'}
                readOnly
                className="bg-muted capitalize"
              />
            </div>
          </div>

          {/* Date Fields */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="expected_completion_date">Expected Completion</Label>
              <Input
                id="expected_completion_date"
                type="date"
                value={formData.expected_completion_date}
                onChange={(e) => handleChange('expected_completion_date', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="completion_date">Completion Date</Label>
              <Input
                id="completion_date"
                type="date"
                value={formData.completion_date}
                onChange={(e) => handleChange('completion_date', e.target.value)}
              />
            </div>
          </div>

          {/* Case Worker */}
          <div className="space-y-2">
            <Label htmlFor="case_worker">Case Worker</Label>
            <Input
              id="case_worker"
              value={formData.case_worker}
              onChange={(e) => handleChange('case_worker', e.target.value)}
              placeholder="Enter case worker name"
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              placeholder="Additional notes or comments"
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update Enrollment
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
