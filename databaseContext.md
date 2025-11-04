===================
# TABLE DEFINITIONS
===================
create table public.audit_log (
  id uuid not null default gen_random_uuid (),
  user_id uuid not null,
  user_email text not null,
  user_role text null,
  action_type text not null,
  action_category text not null,
  resource_type text null,
  resource_id text null,
  description text not null,
  metadata jsonb null,
  severity text null default 'info'::text,
  created_at timestamp with time zone null default now(),
  constraint audit_log_pkey primary key (id),
  constraint audit_log_user_id_fkey foreign KEY (user_id) references auth.users (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_audit_log_user_id on public.audit_log using btree (user_id) TABLESPACE pg_default;

create index IF not exists idx_audit_log_action_type on public.audit_log using btree (action_type) TABLESPACE pg_default;

create index IF not exists idx_audit_log_action_category on public.audit_log using btree (action_category) TABLESPACE pg_default;

create index IF not exists idx_audit_log_created_at on public.audit_log using btree (created_at desc) TABLESPACE pg_default;

create index IF not exists idx_audit_log_severity on public.audit_log using btree (severity) TABLESPACE pg_default;

create index IF not exists idx_audit_log_resource_type on public.audit_log using btree (resource_type) TABLESPACE pg_default;


create table public.case (
  id uuid not null default gen_random_uuid (),
  case_manager text null,
  status text null,
  priority text null,
  identifying_intake_date timestamp with time zone null,
  identifying_name text null,
  identifying_referral_source text null,
  identifying_alias text null,
  identifying_age text null,
  identifying_status text null,
  identifying_occupation text null,
  identifying_income text null,
  identifying_sex text null,
  identifying_address text null,
  identifying_case_type text null,
  identifying_religion text null,
  identifying_educational_attainment text null,
  identifying_contact_person text null,
  identifying_birth_place text null,
  identifying_respondent_name text null,
  identifying_birthday date null,
  perpetrator_name text null,
  perpetrator_age text null,
  perpetrator_alias text null,
  perpetrator_sex text null,
  perpetrator_address text null,
  perpetrator_victim_relation text null,
  perpetrator_offence_type text null,
  perpetrator_commission_datetime timestamp with time zone null,
  presenting_problem text null,
  background_info text null,
  community_info text null,
  assessment text null,
  recommendation text null,
  identifying2_intake_date date null,
  identifying2_name text null,
  identifying2_referral_source text null,
  identifying2_alias text null,
  identifying2_age text null,
  identifying2_status text null,
  identifying2_occupation text null,
  identifying2_income text null,
  identifying2_sex text null,
  identifying2_address text null,
  identifying2_case_type text null,
  identifying2_religion text null,
  identifying2_educational_attainment text null,
  identifying2_contact_person text null,
  identifying2_birth_place text null,
  identifying2_respondent_name text null,
  identifying2_birthday date null,
  victim2_name text null,
  victim2_age text null,
  victim2_alias text null,
  victim2_sex text null,
  victim2_address text null,
  victim2_victim_relation text null,
  victim2_offence_type text null,
  victim2_commission_datetime timestamp with time zone null,
  presenting_problem2 text null,
  background_info2 text null,
  community_info2 text null,
  assessment2 text null,
  recommendation2 text null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint case_pkey primary key (id)
) TABLESPACE pg_default;

create table public.case_family_member (
  id uuid not null default gen_random_uuid (),
  case_id uuid null,
  group_no integer not null,
  name text null,
  age text null,
  relation text null,
  status text null,
  education text null,
  occupation text null,
  income text null,
  constraint case_family_member_pkey primary key (id),
  constraint case_family_member_case_id_fkey foreign KEY (case_id) references "case" (id) on delete CASCADE
) TABLESPACE pg_default;


create table public.ciclcar_case (
  id uuid not null default gen_random_uuid (),
  case_manager text null,
  status text null,
  priority text null,
  profile_name text null,
  profile_alias text null,
  profile_sex text null,
  profile_gender text null,
  profile_birth_date date null,
  profile_age text null,
  profile_status text null,
  profile_religion text null,
  profile_address text null,
  profile_client_category text null,
  profile_ip_group text null,
  profile_nationality text null,
  profile_disability text null,
  profile_contact_number text null,
  profile_educational_attainment text null,
  profile_educational_status text null,
  violation text null,
  violation_date_time_committed timestamp with time zone null,
  specific_violation text null,
  violation_place_committed text null,
  violation_status text null,
  violation_admission_date date null,
  repeat_offender text null,
  violation_previous_offense text null,
  record_details text null,
  complainant_name text null,
  complainant_alias text null,
  complainant_victim text null,
  complainant_relationship text null,
  complainant_contact_number text null,
  complainant_sex text null,
  complainant_birth_date date null,
  complainant_address text null,
  remarks text null,
  referral_region text null,
  referral_province text null,
  referral_city text null,
  referral_barangay text null,
  referral_referred_to text null,
  referral_date_referred date null,
  referral_reason text null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint ciclcar_case_pkey primary key (id)
) TABLESPACE pg_default;

create table public.ciclcar_family_background (
  id uuid not null default gen_random_uuid (),
  ciclcar_case_id uuid null,
  name text null,
  relationship text null,
  age text null,
  sex text null,
  status text null,
  contact_number text null,
  educational_attainment text null,
  employment text null,
  constraint ciclcar_family_background_pkey primary key (id),
  constraint ciclcar_family_background_fkey foreign KEY (ciclcar_case_id) references ciclcar_case (id) on delete CASCADE
) TABLESPACE pg_default;

create table public.ciclcar_service (
  id uuid not null default gen_random_uuid (),
  ciclcar_case_id uuid null,
  service_type text null,
  service text null,
  service_date_provided date null,
  service_date_completed date null,
  constraint ciclcar_ciclcar_service_pkey primary key (id),
  constraint ciclcar_service_fkey foreign KEY (ciclcar_case_id) references ciclcar_case (id) on delete CASCADE
) TABLESPACE pg_default;

create table public.fac_case (
  id uuid not null default gen_random_uuid (),
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  location_region text null,
  location_province text null,
  location_district text null,
  location_city_municipality text null,
  location_barangay text null,
  location_evacuation_center text null,
  head_last_name text not null,
  head_first_name text not null,
  head_middle_name text null,
  head_name_extension text null,
  head_birthdate date null,
  head_age integer null,
  head_birthplace text null,
  head_sex text null,
  head_civil_status text null,
  head_mothers_maiden_name text null,
  head_religion text null,
  head_occupation text null,
  head_monthly_income numeric(12, 2) null,
  head_id_card_presented text null,
  head_id_card_number text null,
  head_contact_number text null,
  head_permanent_address text null,
  head_alternate_contact_number text null,
  head_4ps_beneficiary boolean null default false,
  head_ip_ethnicity boolean null default false,
  head_ip_ethnicity_type text null,
  vulnerable_older_persons integer null default 0,
  vulnerable_pregnant_women integer null default 0,
  vulnerable_lactating_women integer null default 0,
  vulnerable_pwds integer null default 0,
  house_ownership text null,
  shelter_damage text null,
  barangay_captain text null,
  date_registered date null,
  lswdo_name text null,
  case_manager text null,
  status text null default 'active'::text,
  priority text null default 'normal'::text,
  visibility text null default 'visible'::text,
  constraint fac_case_pkey primary key (id),
  constraint fac_case_head_sex_check check (
    (
      head_sex = any (array['male'::text, 'female'::text])
    )
  ),
  constraint fac_case_house_ownership_check check (
    (
      house_ownership = any (
        array['owner'::text, 'renter'::text, 'sharer'::text]
      )
    )
  ),
  constraint fac_case_priority_check check (
    (
      priority = any (
        array[
          'low'::text,
          'normal'::text,
          'high'::text,
          'urgent'::text
        ]
      )
    )
  ),
  constraint fac_case_shelter_damage_check check (
    (
      shelter_damage = any (
        array[
          'partially-damaged'::text,
          'totally-damaged'::text
        ]
      )
    )
  ),
  constraint fac_case_status_check check (
    (
      status = any (
        array['active'::text, 'closed'::text, 'pending'::text]
      )
    )
  ),
  constraint fac_case_head_civil_status_check check (
    (
      head_civil_status = any (
        array[
          'single'::text,
          'married'::text,
          'widowed'::text,
          'separated'::text,
          'divorced'::text
        ]
      )
    )
  ),
  constraint fac_case_visibility_check check (
    (
      visibility = any (
        array['visible'::text, 'hidden'::text, 'archived'::text]
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_fac_case_created_at on public.fac_case using btree (created_at desc) TABLESPACE pg_default;

create index IF not exists idx_fac_case_status on public.fac_case using btree (status) TABLESPACE pg_default;

create index IF not exists idx_fac_case_barangay on public.fac_case using btree (location_barangay) TABLESPACE pg_default;

create index IF not exists idx_fac_case_date_registered on public.fac_case using btree (date_registered) TABLESPACE pg_default;

create trigger update_fac_case_updated_at BEFORE
update on fac_case for EACH row
execute FUNCTION update_updated_at_column ();


create table public.fac_family_member (
  id uuid not null default gen_random_uuid (),
  fac_case_id uuid not null,
  family_member_name text not null,
  relation_to_head text null,
  birthdate date null,
  age integer null,
  sex text null,
  educational_attainment text null,
  occupation text null,
  remarks text null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint fac_family_member_pkey primary key (id),
  constraint fac_family_member_fac_case_id_fkey foreign KEY (fac_case_id) references fac_case (id) on delete CASCADE,
  constraint fac_family_member_sex_check check ((sex = any (array['male'::text, 'female'::text])))
) TABLESPACE pg_default;

create index IF not exists idx_fac_family_member_case_id on public.fac_family_member using btree (fac_case_id) TABLESPACE pg_default;

create trigger update_fac_family_member_updated_at BEFORE
update on fac_family_member for EACH row
execute FUNCTION update_updated_at_column ();

create table public.far_case (
  id uuid not null default gen_random_uuid (),
  case_manager text null,
  status text null,
  priority text null,
  date date not null,
  receiving_member text not null,
  emergency text not null,
  emergency_other text null,
  assistance text not null,
  assistance_other text null,
  unit text not null,
  quantity numeric not null,
  cost numeric(10, 2) not null,
  provider text not null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint far_case_pkey primary key (id),
  constraint far_case_cost_check check ((cost >= (0)::numeric)),
  constraint far_case_priority_check check (
    (
      priority = any (array['Low'::text, 'Medium'::text, 'High'::text])
    )
  ),
  constraint far_case_quantity_check check ((quantity > (0)::numeric)),
  constraint far_case_status_check check (
    (
      status = any (
        array[
          'Filed'::text,
          'Assessed'::text,
          'In Process'::text,
          'Resolved'::text
        ]
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_far_case_manager on public.far_case using btree (case_manager) TABLESPACE pg_default;

create index IF not exists idx_far_status on public.far_case using btree (status) TABLESPACE pg_default;

create index IF not exists idx_far_date on public.far_case using btree (date desc) TABLESPACE pg_default;

create trigger trigger_update_far_case_updated_at BEFORE
update on far_case for EACH row
execute FUNCTION update_far_case_updated_at ();

create table public.ivac_cases (
  id uuid not null default gen_random_uuid (),
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  created_by uuid null,
  updated_by uuid null,
  province text not null default 'Misamis Oriental'::text,
  municipality text not null default 'Villanueva'::text,
  reporting_period date null,
  records jsonb not null default '[]'::jsonb,
  case_managers jsonb not null default '[]'::jsonb,
  status text not null default 'Active'::text,
  notes text null,
  constraint ivac_cases_pkey primary key (id),
  constraint ivac_cases_created_by_fkey foreign KEY (created_by) references auth.users (id) on delete set null,
  constraint ivac_cases_updated_by_fkey foreign KEY (updated_by) references auth.users (id) on delete set null,
  constraint valid_status check (
    (
      status = any (array['Active'::text, 'Inactive'::text])
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_ivac_cases_reporting_period on public.ivac_cases using btree (reporting_period) TABLESPACE pg_default;

create index IF not exists idx_ivac_cases_status on public.ivac_cases using btree (status) TABLESPACE pg_default;

create index IF not exists idx_ivac_cases_created_at on public.ivac_cases using btree (created_at desc) TABLESPACE pg_default;

create index IF not exists idx_ivac_cases_created_by on public.ivac_cases using btree (created_by) TABLESPACE pg_default;

create index IF not exists idx_ivac_cases_updated_at on public.ivac_cases using btree (updated_at desc) TABLESPACE pg_default;

create index IF not exists idx_ivac_cases_records on public.ivac_cases using gin (records) TABLESPACE pg_default;

create index IF not exists idx_ivac_cases_case_managers on public.ivac_cases using gin (case_managers) TABLESPACE pg_default;

create trigger trigger_set_ivac_cases_created_by BEFORE INSERT on ivac_cases for EACH row
execute FUNCTION set_ivac_cases_created_by ();

create trigger trigger_update_ivac_cases_updated_at BEFORE
update on ivac_cases for EACH row
execute FUNCTION update_ivac_cases_updated_at ();

create table public.permissions (
  id uuid not null default gen_random_uuid (),
  name text not null,
  display_name text not null,
  description text null,
  category text not null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint permissions_pkey primary key (id),
  constraint permissions_name_key unique (name)
) TABLESPACE pg_default;

create index IF not exists idx_permissions_category on public.permissions using btree (category) TABLESPACE pg_default;

create table public.profile (
  id uuid not null,
  full_name text null,
  email text null,
  role text null,
  avatar_url text null,
  created_at timestamp with time zone null default now(),
  status character varying(20) null default 'active'::character varying,
  banned_at timestamp with time zone null,
  banned_by uuid null,
  created_by uuid null,
  updated_at timestamp with time zone null default now(),
  constraint profile_pkey primary key (id),
  constraint profile_email_key unique (email),
  constraint profile_full_name_key unique (full_name),
  constraint profile_banned_by_fkey foreign KEY (banned_by) references auth.users (id),
  constraint profile_id_fkey foreign KEY (id) references auth.users (id) on delete CASCADE,
  constraint profile_created_by_fkey foreign KEY (created_by) references auth.users (id),
  constraint profile_status_check check (
    (
      (status)::text = any (
        (
          array[
            'active'::character varying,
            'inactive'::character varying,
            'banned'::character varying
          ]
        )::text[]
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_profile_role on public.profile using btree (role) TABLESPACE pg_default;

create index IF not exists idx_profile_created_by on public.profile using btree (created_by) TABLESPACE pg_default;

create index IF not exists idx_profile_status on public.profile using btree (status) TABLESPACE pg_default;

create trigger update_profile_updated_at BEFORE
update on profile for EACH row
execute FUNCTION update_updated_at_column ();


create table public.program_enrollments (
  id uuid not null default extensions.uuid_generate_v4 (),
  case_id uuid not null,
  case_number text not null,
  case_type text not null,
  beneficiary_name text not null,
  program_id uuid not null,
  enrollment_date date not null default CURRENT_DATE,
  expected_completion_date date null,
  completion_date date null,
  status text not null default 'active'::text,
  progress_percentage integer null default 0,
  progress_level text null,
  sessions_total integer not null default 0,
  sessions_attended integer not null default 0,
  sessions_completed integer not null default 0,
  attendance_rate numeric(5, 2) null default 0,
  assigned_by uuid null,
  assigned_by_name text null,
  case_worker text null,
  notes text null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint program_enrollments_pkey primary key (id),
  constraint program_enrollments_program_id_fkey foreign KEY (program_id) references programs (id) on delete CASCADE,
  constraint program_enrollments_assigned_by_fkey foreign KEY (assigned_by) references profile (id) on delete set null,
  constraint program_enrollments_progress_level_check check (
    (
      progress_level = any (
        array[
          'excellent'::text,
          'good'::text,
          'fair'::text,
          'poor'::text
        ]
      )
    )
  ),
  constraint program_enrollments_progress_percentage_check check (
    (
      (progress_percentage >= 0)
      and (progress_percentage <= 100)
    )
  ),
  constraint program_enrollments_status_check check (
    (
      status = any (
        array[
          'active'::text,
          'completed'::text,
          'dropped'::text,
          'at_risk'::text
        ]
      )
    )
  ),
  constraint valid_completion check (
    (
      (completion_date is null)
      or (completion_date >= enrollment_date)
    )
  ),
  constraint valid_expected_completion check (
    (
      (expected_completion_date is null)
      or (expected_completion_date >= enrollment_date)
    )
  ),
  constraint valid_sessions check (
    (
      (sessions_attended <= sessions_total)
      and (sessions_completed <= sessions_total)
    )
  ),
  constraint program_enrollments_attendance_rate_check check (
    (
      (attendance_rate >= (0)::numeric)
      and (attendance_rate <= (100)::numeric)
    )
  ),
  constraint program_enrollments_case_type_check check (
    (
      case_type = any (
        array[
          'CICL/CAR'::text,
          'VAC'::text,
          'FAC'::text,
          'FAR'::text,
          'IVAC'::text
        ]
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_enrollments_case_id on public.program_enrollments using btree (case_id) TABLESPACE pg_default;

create index IF not exists idx_enrollments_program_id on public.program_enrollments using btree (program_id) TABLESPACE pg_default;

create index IF not exists idx_enrollments_status on public.program_enrollments using btree (status) TABLESPACE pg_default;

create index IF not exists idx_enrollments_case_type on public.program_enrollments using btree (case_type) TABLESPACE pg_default;

create index IF not exists idx_enrollments_enrollment_date on public.program_enrollments using btree (enrollment_date desc) TABLESPACE pg_default;

create trigger trigger_update_program_enrollment_count
after INSERT
or DELETE
or
update on program_enrollments for EACH row
execute FUNCTION update_program_enrollment_count ();

create trigger update_enrollments_updated_at BEFORE
update on program_enrollments for EACH row
execute FUNCTION update_updated_at_column ();

create table public.programs (
  id uuid not null default extensions.uuid_generate_v4 (),
  program_name text not null,
  program_type text not null,
  description text null,
  target_beneficiary text[] not null,
  duration_weeks integer not null,
  budget_allocated numeric(12, 2) not null default 0,
  budget_spent numeric(12, 2) not null default 0,
  capacity integer not null,
  current_enrollment integer not null default 0,
  status text not null default 'active'::text,
  start_date date not null,
  end_date date null,
  coordinator text not null,
  coordinator_id uuid null,
  location text null,
  schedule text null,
  success_rate integer null default 0,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint programs_pkey primary key (id),
  constraint programs_coordinator_id_fkey foreign KEY (coordinator_id) references profile (id) on delete set null,
  constraint programs_capacity_check check ((capacity > 0)),
  constraint programs_current_enrollment_check check ((current_enrollment >= 0)),
  constraint programs_duration_weeks_check check ((duration_weeks > 0)),
  constraint programs_program_type_check check (
    (
      program_type = any (
        array[
          'counseling'::text,
          'legal'::text,
          'medical'::text,
          'educational'::text,
          'financial'::text,
          'prevention'::text,
          'livelihood'::text,
          'shelter'::text,
          'recreational'::text
        ]
      )
    )
  ),
  constraint programs_status_check check (
    (
      status = any (
        array[
          'active'::text,
          'inactive'::text,
          'completed'::text
        ]
      )
    )
  ),
  constraint programs_success_rate_check check (
    (
      (success_rate >= 0)
      and (success_rate <= 100)
    )
  ),
  constraint valid_budget check ((budget_spent <= budget_allocated)),
  constraint valid_dates check (
    (
      (end_date is null)
      or (end_date >= start_date)
    )
  ),
  constraint programs_budget_allocated_check check ((budget_allocated >= (0)::numeric)),
  constraint valid_enrollment check ((current_enrollment <= capacity)),
  constraint programs_budget_spent_check check ((budget_spent >= (0)::numeric))
) TABLESPACE pg_default;

create index IF not exists idx_programs_status on public.programs using btree (status) TABLESPACE pg_default;

create index IF not exists idx_programs_program_type on public.programs using btree (program_type) TABLESPACE pg_default;

create index IF not exists idx_programs_coordinator_id on public.programs using btree (coordinator_id) TABLESPACE pg_default;

create index IF not exists idx_programs_created_at on public.programs using btree (created_at desc) TABLESPACE pg_default;

create index IF not exists idx_programs_target_beneficiary on public.programs using gin (target_beneficiary) TABLESPACE pg_default;

create trigger update_programs_updated_at BEFORE
update on programs for EACH row
execute FUNCTION update_updated_at_column ();

create table public.service_delivery (
  id uuid not null default extensions.uuid_generate_v4 (),
  enrollment_id uuid not null,
  case_id uuid not null,
  case_number text not null,
  beneficiary_name text not null,
  program_id uuid not null,
  program_name text not null,
  program_type text not null,
  service_date date not null default CURRENT_DATE,
  service_type text not null,
  service_provider text not null,
  service_provider_id uuid null,
  attendance boolean not null default false,
  attendance_status text not null default 'absent'::text,
  duration_minutes integer null,
  progress_notes text null,
  milestones_achieved text[] null,
  next_steps text null,
  delivered_by uuid null,
  delivered_by_name text null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint service_delivery_pkey primary key (id),
  constraint service_delivery_delivered_by_fkey foreign KEY (delivered_by) references profile (id) on delete set null,
  constraint service_delivery_enrollment_id_fkey foreign KEY (enrollment_id) references program_enrollments (id) on delete CASCADE,
  constraint service_delivery_program_id_fkey foreign KEY (program_id) references programs (id) on delete CASCADE,
  constraint service_delivery_service_provider_id_fkey foreign KEY (service_provider_id) references profile (id) on delete set null,
  constraint service_delivery_attendance_status_check check (
    (
      attendance_status = any (
        array['present'::text, 'absent'::text, 'excused'::text]
      )
    )
  ),
  constraint service_delivery_duration_minutes_check check ((duration_minutes > 0))
) TABLESPACE pg_default;

create index IF not exists idx_service_delivery_enrollment_id on public.service_delivery using btree (enrollment_id) TABLESPACE pg_default;

create index IF not exists idx_service_delivery_case_id on public.service_delivery using btree (case_id) TABLESPACE pg_default;

create index IF not exists idx_service_delivery_program_id on public.service_delivery using btree (program_id) TABLESPACE pg_default;

create index IF not exists idx_service_delivery_service_date on public.service_delivery using btree (service_date desc) TABLESPACE pg_default;

create index IF not exists idx_service_delivery_attendance on public.service_delivery using btree (attendance) TABLESPACE pg_default;

create trigger trigger_update_enrollment_attendance
after INSERT
or DELETE
or
update on service_delivery for EACH row
execute FUNCTION update_enrollment_attendance ();

create trigger update_service_delivery_updated_at BEFORE
update on service_delivery for EACH row
execute FUNCTION update_updated_at_column ();

create view public.user_management_view as
select
  p.id,
  u.email,
  p.role,
  p.status,
  p.avatar_url,
  p.banned_at,
  p.banned_by,
  p.created_by,
  p.created_at,
  p.updated_at,
  creator.email as created_by_email,
  banner.email as banned_by_email
from
  profile p
  left join auth.users u on p.id = u.id
  left join profile creator on p.created_by = creator.id
  left join profile banner on p.banned_by = banner.id;

  create table public.user_permissions (
  id uuid not null default gen_random_uuid (),
  user_id uuid not null,
  permission_id uuid not null,
  granted_at timestamp with time zone null default now(),
  granted_by uuid null,
  constraint user_permissions_pkey primary key (id),
  constraint user_permissions_user_id_permission_id_key unique (user_id, permission_id),
  constraint user_permissions_granted_by_fkey foreign KEY (granted_by) references auth.users (id),
  constraint user_permissions_permission_id_fkey foreign KEY (permission_id) references permissions (id) on delete CASCADE,
  constraint user_permissions_user_id_fkey foreign KEY (user_id) references auth.users (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_user_permissions_user_id on public.user_permissions using btree (user_id) TABLESPACE pg_default;

create index IF not exists idx_user_permissions_permission_id on public.user_permissions using btree (permission_id) TABLESPACE pg_default;


======================
# FUNCTION DEFINITIONS
======================
check_user_banned
RETURN TYPE: trigger
BEGIN
    IF NEW.status = 'banned' THEN
        RAISE EXCEPTION 'Your account has been suspended. Please contact an administrator.';
    END IF;
    RETURN NEW;
END;
======================

get_user_role
RETURN TYPE: character varying
BEGIN
    RETURN (SELECT role FROM profile WHERE id = auth.uid());
END;
======================

get_user_status
RETURN TYPE: character varying

BEGIN
    RETURN (SELECT status FROM profile WHERE id = auth.uid());
END;
======================

handle_new_user
RETURN TYPE: trigger

begin
  insert into public.profile (id, full_name, email, role, created_at)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.email,
    new.raw_user_meta_data->>'role',
    now()
  );
  return new;
end;
======================

is_head
RETURN TYPE: boolean

BEGIN
    RETURN EXISTS (
        SELECT 1 FROM profile
        WHERE id = auth.uid() AND role = 'head'
    );
END;
======================

set_ivac_cases_created_by
RETURN TYPE: trigger

BEGIN
    NEW.created_by = auth.uid();
    NEW.updated_by = auth.uid();
    RETURN NEW;
END;
======================

update_enrollment_attendance
RETURN TYPE: trigger

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
======================

update_far_case_updated_at
RETURN TYPE: trigger
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
======================

update_ivac_cases_updated_at
RETURN TYPE: trigger
BEGIN
    NEW.updated_at = NOW();
    NEW.updated_by = auth.uid();
    RETURN NEW;
END;
======================

update_program_enrollment_count
RETURN TYPE: trigger

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
======================

update_updated_at_column
RETURN TYPE: trigger
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
