-- Migration: Program Management Tables
-- Description: Create tables for managing programs, enrollments, and service delivery
-- Date: 2025-11-01

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- PROGRAMS TABLE
-- =====================================================
-- Stores intervention programs and services catalog
CREATE TABLE IF NOT EXISTS programs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  program_name TEXT NOT NULL,
  program_type TEXT NOT NULL CHECK (program_type IN (
    'counseling', 'legal', 'medical', 'educational', 
    'financial', 'prevention', 'livelihood', 'shelter', 'recreational'
  )),
  description TEXT,
  target_beneficiary TEXT[] NOT NULL, -- Array of beneficiary types: CICL, VAC, FAC, FAR, IVAC
  duration_weeks INTEGER NOT NULL CHECK (duration_weeks > 0),
  budget_allocated DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (budget_allocated >= 0),
  budget_spent DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (budget_spent >= 0),
  capacity INTEGER NOT NULL CHECK (capacity > 0),
  current_enrollment INTEGER NOT NULL DEFAULT 0 CHECK (current_enrollment >= 0),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'completed')),
  start_date DATE NOT NULL,
  end_date DATE,
  coordinator TEXT NOT NULL,
  coordinator_id UUID REFERENCES profile(id) ON DELETE SET NULL,
  location TEXT,
  schedule TEXT,
  success_rate INTEGER DEFAULT 0 CHECK (success_rate >= 0 AND success_rate <= 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_enrollment CHECK (current_enrollment <= capacity),
  CONSTRAINT valid_budget CHECK (budget_spent <= budget_allocated),
  CONSTRAINT valid_dates CHECK (end_date IS NULL OR end_date >= start_date)
);

-- Indexes for programs table
CREATE INDEX idx_programs_status ON programs(status);
CREATE INDEX idx_programs_program_type ON programs(program_type);
CREATE INDEX idx_programs_coordinator_id ON programs(coordinator_id);
CREATE INDEX idx_programs_created_at ON programs(created_at DESC);
CREATE INDEX idx_programs_target_beneficiary ON programs USING GIN(target_beneficiary);

-- =====================================================
-- PROGRAM_ENROLLMENTS TABLE
-- =====================================================
-- Stores case enrollments in programs
CREATE TABLE IF NOT EXISTS program_enrollments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  case_id UUID NOT NULL, -- References case from cases/cicl_car/fac/far/ivac tables
  case_number TEXT NOT NULL,
  case_type TEXT NOT NULL CHECK (case_type IN ('CICL', 'VAC', 'FAC', 'FAR', 'IVAC')),
  beneficiary_name TEXT NOT NULL,
  program_id UUID NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  enrollment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expected_completion_date DATE,
  completion_date DATE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'dropped', 'at_risk')),
  progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  progress_level TEXT CHECK (progress_level IN ('excellent', 'good', 'fair', 'poor')),
  sessions_total INTEGER NOT NULL DEFAULT 0,
  sessions_attended INTEGER NOT NULL DEFAULT 0,
  sessions_completed INTEGER NOT NULL DEFAULT 0,
  attendance_rate DECIMAL(5,2) DEFAULT 0 CHECK (attendance_rate >= 0 AND attendance_rate <= 100),
  assigned_by UUID REFERENCES profile(id) ON DELETE SET NULL,
  assigned_by_name TEXT,
  case_worker TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_completion CHECK (completion_date IS NULL OR completion_date >= enrollment_date),
  CONSTRAINT valid_sessions CHECK (sessions_attended <= sessions_total AND sessions_completed <= sessions_total),
  CONSTRAINT valid_expected_completion CHECK (expected_completion_date IS NULL OR expected_completion_date >= enrollment_date)
);

-- Indexes for program_enrollments table
CREATE INDEX idx_enrollments_case_id ON program_enrollments(case_id);
CREATE INDEX idx_enrollments_program_id ON program_enrollments(program_id);
CREATE INDEX idx_enrollments_status ON program_enrollments(status);
CREATE INDEX idx_enrollments_case_type ON program_enrollments(case_type);
CREATE INDEX idx_enrollments_enrollment_date ON program_enrollments(enrollment_date DESC);

-- =====================================================
-- SERVICE_DELIVERY TABLE
-- =====================================================
-- Stores service delivery logs and session tracking
CREATE TABLE IF NOT EXISTS service_delivery (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  enrollment_id UUID NOT NULL REFERENCES program_enrollments(id) ON DELETE CASCADE,
  case_id UUID NOT NULL,
  case_number TEXT NOT NULL,
  beneficiary_name TEXT NOT NULL,
  program_id UUID NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  program_name TEXT NOT NULL,
  program_type TEXT NOT NULL,
  service_date DATE NOT NULL DEFAULT CURRENT_DATE,
  service_type TEXT NOT NULL, -- e.g., Individual Counseling, Group Therapy, etc.
  service_provider TEXT NOT NULL,
  service_provider_id UUID REFERENCES profile(id) ON DELETE SET NULL,
  attendance BOOLEAN NOT NULL DEFAULT false,
  attendance_status TEXT NOT NULL DEFAULT 'absent' CHECK (attendance_status IN ('present', 'absent', 'excused')),
  duration_minutes INTEGER CHECK (duration_minutes > 0),
  progress_notes TEXT,
  milestones_achieved TEXT[],
  next_steps TEXT,
  delivered_by UUID REFERENCES profile(id) ON DELETE SET NULL,
  delivered_by_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for service_delivery table
CREATE INDEX idx_service_delivery_enrollment_id ON service_delivery(enrollment_id);
CREATE INDEX idx_service_delivery_case_id ON service_delivery(case_id);
CREATE INDEX idx_service_delivery_program_id ON service_delivery(program_id);
CREATE INDEX idx_service_delivery_service_date ON service_delivery(service_date DESC);
CREATE INDEX idx_service_delivery_attendance ON service_delivery(attendance);

-- =====================================================
-- TRIGGERS & FUNCTIONS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_programs_updated_at
  BEFORE UPDATE ON programs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_enrollments_updated_at
  BEFORE UPDATE ON program_enrollments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_service_delivery_updated_at
  BEFORE UPDATE ON service_delivery
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically update program enrollment count
CREATE OR REPLACE FUNCTION update_program_enrollment_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'active' THEN
    UPDATE programs
    SET current_enrollment = current_enrollment + 1
    WHERE id = NEW.program_id;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status = 'active' AND NEW.status != 'active' THEN
      UPDATE programs
      SET current_enrollment = current_enrollment - 1
      WHERE id = NEW.program_id;
    ELSIF OLD.status != 'active' AND NEW.status = 'active' THEN
      UPDATE programs
      SET current_enrollment = current_enrollment + 1
      WHERE id = NEW.program_id;
    END IF;
  ELSIF TG_OP = 'DELETE' AND OLD.status = 'active' THEN
    UPDATE programs
    SET current_enrollment = current_enrollment - 1
    WHERE id = OLD.program_id;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger to update enrollment count
CREATE TRIGGER trigger_update_program_enrollment_count
  AFTER INSERT OR UPDATE OR DELETE ON program_enrollments
  FOR EACH ROW
  EXECUTE FUNCTION update_program_enrollment_count();

-- Function to update enrollment attendance rate
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

-- Trigger to update attendance after service delivery log
CREATE TRIGGER trigger_update_enrollment_attendance
  AFTER INSERT OR UPDATE OR DELETE ON service_delivery
  FOR EACH ROW
  EXECUTE FUNCTION update_enrollment_attendance();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_delivery ENABLE ROW LEVEL SECURITY;

-- Policies for programs table
CREATE POLICY "Allow all authenticated users to view programs"
  ON programs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow case managers and head to insert programs"
  ON programs FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profile
      WHERE profile.id = auth.uid()
      AND profile.role IN ('case manager', 'head')
    )
  );

CREATE POLICY "Allow case managers and head to update programs"
  ON programs FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profile
      WHERE profile.id = auth.uid()
      AND profile.role IN ('case manager', 'head')
    )
  );

-- Policies for program_enrollments table
CREATE POLICY "Allow all authenticated users to view enrollments"
  ON program_enrollments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow case managers to create enrollments"
  ON program_enrollments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profile
      WHERE profile.id = auth.uid()
      AND profile.role IN ('case manager', 'head')
    )
  );

CREATE POLICY "Allow case managers to update enrollments"
  ON program_enrollments FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profile
      WHERE profile.id = auth.uid()
      AND profile.role IN ('case manager', 'head')
    )
  );

-- Policies for service_delivery table
CREATE POLICY "Allow all authenticated users to view service delivery"
  ON service_delivery FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow case managers to log service delivery"
  ON service_delivery FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profile
      WHERE profile.id = auth.uid()
      AND profile.role IN ('case manager', 'head')
    )
  );

CREATE POLICY "Allow case managers to update service delivery"
  ON service_delivery FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profile
      WHERE profile.id = auth.uid()
      AND profile.role IN ('case manager', 'head')
    )
  );

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE programs IS 'Stores intervention programs and services catalog';
COMMENT ON TABLE program_enrollments IS 'Stores case enrollments in programs';
COMMENT ON TABLE service_delivery IS 'Stores service delivery logs and session tracking';

COMMENT ON COLUMN programs.target_beneficiary IS 'Array of beneficiary types: CICL, VAC, FAC, FAR, IVAC';
COMMENT ON COLUMN programs.success_rate IS 'Program success rate percentage (0-100)';
COMMENT ON COLUMN program_enrollments.progress_level IS 'Qualitative progress assessment: excellent, good, fair, poor';
COMMENT ON COLUMN service_delivery.attendance_status IS 'Attendance status: present, absent, excused';
