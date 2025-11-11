-- =====================================================
-- ROLLBACK Migration: Update Enrollment Attendance Trigger
-- Description: Reverts the trigger to the original version
-- Date: 2025-11-11
-- =====================================================

-- Drop the updated trigger
DROP TRIGGER IF EXISTS trigger_update_enrollment_attendance ON service_delivery;

-- Recreate the original trigger function
CREATE OR REPLACE FUNCTION update_enrollment_attendance()
RETURNS TRIGGER AS $$
DECLARE
  total_sessions INTEGER;
  attended_sessions INTEGER;
  new_attendance_rate DECIMAL(5,2);
BEGIN
  -- Get total scheduled sessions and attended sessions for this enrollment
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE attendance = true)
  INTO total_sessions, attended_sessions
  FROM service_delivery
  WHERE enrollment_id = COALESCE(NEW.enrollment_id, OLD.enrollment_id);
  
  -- Calculate attendance rate
  IF total_sessions > 0 THEN
    new_attendance_rate := (attended_sessions::DECIMAL / total_sessions::DECIMAL) * 100;
  ELSE
    new_attendance_rate := 0;
  END IF;
  
  -- Update enrollment record
  UPDATE program_enrollments
  SET 
    sessions_total = total_sessions,
    sessions_attended = attended_sessions,
    attendance_rate = new_attendance_rate
  WHERE id = COALESCE(NEW.enrollment_id, OLD.enrollment_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
CREATE TRIGGER trigger_update_enrollment_attendance
  AFTER INSERT OR UPDATE OR DELETE ON service_delivery
  FOR EACH ROW
  EXECUTE FUNCTION update_enrollment_attendance();

-- Remove the comment
COMMENT ON FUNCTION update_enrollment_attendance() IS NULL;
