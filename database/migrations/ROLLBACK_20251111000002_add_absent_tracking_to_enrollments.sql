-- =====================================================
-- ROLLBACK Migration: Add Absent Session Tracking to Enrollments
-- Description: Removes absent tracking fields and reverts trigger to previous version
-- Date: 2025-11-11
-- =====================================================

-- Revert the trigger function to exclude absent tracking
CREATE OR REPLACE FUNCTION update_enrollment_attendance()
RETURNS TRIGGER AS $$
DECLARE
  total_sessions INTEGER;
  attended_sessions INTEGER;
  completed_sessions INTEGER;
  new_attendance_rate DECIMAL(5,2);
  new_progress_percentage INTEGER;
BEGIN
  -- Get counts for this enrollment from service_delivery table
  SELECT 
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE attendance = true AND attendance_status = 'present') as attended,
    COUNT(*) FILTER (WHERE attendance = true AND attendance_status = 'present') as completed
  INTO 
    total_sessions, 
    attended_sessions, 
    completed_sessions
  FROM service_delivery
  WHERE enrollment_id = COALESCE(NEW.enrollment_id, OLD.enrollment_id);
  
  -- Calculate attendance rate
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
  
  -- Update enrollment record with all calculated values (without absent fields)
  UPDATE program_enrollments
  SET 
    sessions_total = GREATEST(COALESCE(sessions_total, 0), total_sessions),
    sessions_attended = attended_sessions,
    sessions_completed = completed_sessions,
    attendance_rate = new_attendance_rate,
    progress_percentage = new_progress_percentage,
    updated_at = NOW()
  WHERE id = COALESCE(NEW.enrollment_id, OLD.enrollment_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Remove constraints
ALTER TABLE program_enrollments
DROP CONSTRAINT IF EXISTS program_enrollments_sessions_absent_unexcused_check;

ALTER TABLE program_enrollments
DROP CONSTRAINT IF EXISTS program_enrollments_sessions_absent_excused_check;

-- Remove columns
ALTER TABLE program_enrollments
DROP COLUMN IF EXISTS sessions_absent_unexcused,
DROP COLUMN IF EXISTS sessions_absent_excused;

-- Remove comments
COMMENT ON FUNCTION update_enrollment_attendance() IS 
'Automatically updates enrollment attendance metrics when service delivery records are created, updated, or deleted. 
Tracks:
- sessions_total: Total number of service delivery sessions logged
- sessions_attended: Count of sessions where attendance = true AND attendance_status = present
- sessions_completed: Count of sessions where attendance = true AND attendance_status = present (same as attended)
- attendance_rate: Percentage of sessions attended out of total logged
- progress_percentage: Percentage of sessions completed out of expected total';
