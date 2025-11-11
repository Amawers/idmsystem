-- =====================================================
-- Migration: Add Absent Session Tracking to Enrollments
-- Description: Adds fields to track absent (unexcused) and absent (excused) sessions
-- Date: 2025-11-11
-- =====================================================

-- Add new columns to program_enrollments table
ALTER TABLE program_enrollments
ADD COLUMN IF NOT EXISTS sessions_absent_unexcused INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS sessions_absent_excused INTEGER NOT NULL DEFAULT 0;

-- Add check constraints to ensure non-negative values
ALTER TABLE program_enrollments
ADD CONSTRAINT program_enrollments_sessions_absent_unexcused_check 
  CHECK (sessions_absent_unexcused >= 0);

ALTER TABLE program_enrollments
ADD CONSTRAINT program_enrollments_sessions_absent_excused_check 
  CHECK (sessions_absent_excused >= 0);

-- Add comment to columns
COMMENT ON COLUMN program_enrollments.sessions_absent_unexcused IS 
'Auto-calculated count of service delivery sessions where attendance_status = absent (unexcused)';

COMMENT ON COLUMN program_enrollments.sessions_absent_excused IS 
'Auto-calculated count of service delivery sessions where attendance_status = excused';

-- =====================================================
-- Update the trigger function to include absent tracking
-- =====================================================

CREATE OR REPLACE FUNCTION update_enrollment_attendance()
RETURNS TRIGGER AS $$
DECLARE
  total_sessions INTEGER;
  attended_sessions INTEGER;
  completed_sessions INTEGER;
  absent_unexcused_sessions INTEGER;
  absent_excused_sessions INTEGER;
  new_attendance_rate DECIMAL(5,2);
  new_progress_percentage INTEGER;
BEGIN
  -- Get counts for this enrollment from service_delivery table
  SELECT 
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE attendance = true AND attendance_status = 'present') as attended,
    COUNT(*) FILTER (WHERE attendance = true AND attendance_status = 'present') as completed,
    COUNT(*) FILTER (WHERE attendance_status = 'absent') as absent_unexcused,
    COUNT(*) FILTER (WHERE attendance_status = 'excused') as absent_excused
  INTO 
    total_sessions, 
    attended_sessions, 
    completed_sessions,
    absent_unexcused_sessions,
    absent_excused_sessions
  FROM service_delivery
  WHERE enrollment_id = COALESCE(NEW.enrollment_id, OLD.enrollment_id);
  
  -- Calculate attendance rate based on attended vs total sessions
  IF total_sessions > 0 THEN
    new_attendance_rate := (attended_sessions::DECIMAL / total_sessions::DECIMAL) * 100;
  ELSE
    new_attendance_rate := 0;
  END IF;
  
  -- Calculate progress percentage based on sessions_completed
  -- Get the expected sessions_total from enrollment
  DECLARE
    expected_total INTEGER;
  BEGIN
    SELECT sessions_total INTO expected_total
    FROM program_enrollments
    WHERE id = COALESCE(NEW.enrollment_id, OLD.enrollment_id);
    
    -- Use the greater of: (1) expected_total or (2) total_sessions logged
    IF expected_total IS NULL OR expected_total < total_sessions THEN
      expected_total := total_sessions;
    END IF;
    
    -- Calculate progress percentage
    IF expected_total > 0 THEN
      new_progress_percentage := ROUND((completed_sessions::DECIMAL / expected_total::DECIMAL) * 100);
    ELSE
      new_progress_percentage := 0;
    END IF;
  END;
  
  -- Update enrollment record with all calculated values
  UPDATE program_enrollments
  SET 
    sessions_total = GREATEST(COALESCE(sessions_total, 0), total_sessions),
    sessions_attended = attended_sessions,
    sessions_completed = completed_sessions,
    sessions_absent_unexcused = absent_unexcused_sessions,
    sessions_absent_excused = absent_excused_sessions,
    attendance_rate = new_attendance_rate,
    progress_percentage = new_progress_percentage,
    updated_at = NOW()
  WHERE id = COALESCE(NEW.enrollment_id, OLD.enrollment_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- Comments and Documentation
-- =====================================================

COMMENT ON FUNCTION update_enrollment_attendance() IS 
'Automatically updates enrollment attendance metrics when service delivery records are created, updated, or deleted. 
Tracks:
- sessions_total: Total number of service delivery sessions logged
- sessions_attended: Count of sessions where attendance = true AND attendance_status = present
- sessions_completed: Count of sessions where attendance = true AND attendance_status = present (same as attended)
- sessions_absent_unexcused: Count of sessions where attendance_status = absent
- sessions_absent_excused: Count of sessions where attendance_status = excused
- attendance_rate: Percentage of sessions attended out of total logged
- progress_percentage: Percentage of sessions completed out of expected total';

-- =====================================================
-- Verify the changes
-- =====================================================

-- You can verify the new columns with:
-- SELECT column_name, data_type, column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'program_enrollments' 
-- AND column_name LIKE 'sessions_absent%';
