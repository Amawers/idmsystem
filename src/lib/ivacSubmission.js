/**
 * @file ivacSubmission.js
 * @description Handles Incidence on VAC (IVAC) case submission to Supabase
 * Manages creation, update, and retrieval of IVAC records with robust error handling
 * 
 * @author IDM System
 * @date 2025-10-29
 */

import supabase from "@/../config/supabase";
import { createAuditLog, AUDIT_ACTIONS, AUDIT_CATEGORIES } from "./auditLog";

/**
 * Validate IVAC form data
 * @param {Object} formData - Form data to validate
 * @returns {Object} - {valid: boolean, errors: Array}
 */
export function validateIVACData(formData) {
  const errors = [];
  
  if (!formData.incidenceOnVAC) {
    errors.push("Missing IVAC form data");
    return { valid: false, errors };
  }

  const ivacData = formData.incidenceOnVAC;

  // Validate province and municipality
  if (!ivacData.province || ivacData.province.trim() === "") {
    errors.push("Province is required");
  }
  if (!ivacData.municipality || ivacData.municipality.trim() === "") {
    errors.push("Municipality is required");
  }

  // Validate records
  if (!ivacData.records || !Array.isArray(ivacData.records)) {
    errors.push("Records must be an array");
  } else if (ivacData.records.length === 0) {
    errors.push("At least one barangay record is required");
  }

  // Validate status
  if (ivacData.status && !['Active', 'Inactive'].includes(ivacData.status)) {
    errors.push("Status must be 'Active' or 'Inactive'");
  }

  return { valid: errors.length === 0, errors };
}

export function buildIVACCasePayload(formData = {}) {
  const ivacData = formData.incidenceOnVAC || {};
  const clonedRecords = Array.isArray(ivacData.records)
    ? ivacData.records.map((record) => ({ ...record }))
    : [];
  const caseManagers = Array.isArray(ivacData.caseManagers)
    ? [...ivacData.caseManagers]
    : Array.isArray(ivacData.case_managers)
    ? [...ivacData.case_managers]
    : [];

  return {
    province: ivacData.province || "Misamis Oriental",
    municipality: ivacData.municipality || "Villanueva",
    records: clonedRecords,
    case_managers: caseManagers,
    status: ivacData.status || "Active",
    reporting_period: ivacData.reportingPeriod || ivacData.reporting_period || null,
    notes: ivacData.notes || null,
  };
}

/**
 * Submit a new IVAC case to Supabase
 * @param {Object} formData - Complete form data from useIntakeFormStore
 * @returns {Promise<{caseId: string|null, error: Error|null}>}
 */
export async function submitIVACCase(formData) {
  try {
    console.log("📋 Validating IVAC case data...");
    
    // Validate data
    const validation = validateIVACData(formData);
    if (!validation.valid) {
      const error = new Error(`Validation failed: ${validation.errors.join(", ")}`);
      console.error("❌ Validation errors:", validation.errors);
      return { caseId: null, error };
    }

    const insertData = buildIVACCasePayload(formData);

    console.log("📤 Submitting IVAC case:", {
      ...insertData,
      records: `${insertData.records.length} records`,
    });

    // Insert into ivac_cases table
    const { data, error } = await supabase
      .from("ivac_cases")
      .insert([insertData])
      .select()
      .single();

    if (error) {
      console.error("❌ Supabase error:", error);
      return { caseId: null, error };
    }

    if (!data || !data.id) {
      const noDataError = new Error("No data returned from Supabase after insert");
      console.error("❌", noDataError.message);
      return { caseId: null, error: noDataError };
    }

    console.log("✅ IVAC case created successfully:", data.id);
    
    // Create audit log for IVAC case creation
    await createAuditLog({
      actionType: AUDIT_ACTIONS.CREATE_CASE,
      actionCategory: AUDIT_CATEGORIES.CASE,
      description: `Created new IVAC (Incidence on VAC) case for ${insertData.name_of_vac || 'N/A'}`,
      resourceType: 'ivac_cases',
      resourceId: data.id,
      metadata: {
        caseType: 'IVAC',
        vacName: insertData.name_of_vac,
        reportDate: insertData.date,
        recordsCount: insertData.records?.length || 0
      },
      severity: 'info'
    });
    
    return { caseId: data.id, error: null };
  } catch (err) {
    console.error("❌ Unexpected error in submitIVACCase:", err);
    return { caseId: null, error: err };
  }
}

/**
 * Update an existing IVAC case in Supabase
 * @param {string} caseId - The ID of the case to update
 * @param {Object} formData - Complete form data from useIntakeFormStore
 * @returns {Promise<{success: boolean, error: Error|null}>}
 */
export async function updateIVACCase(caseId, formData) {
  try {
    if (!caseId) {
      const error = new Error("Case ID is required for update");
      console.error("❌", error.message);
      return { success: false, error };
    }

    console.log("📋 Validating IVAC case data for update...");
    
    // Validate data
    const validation = validateIVACData(formData);
    if (!validation.valid) {
      const error = new Error(`Validation failed: ${validation.errors.join(", ")}`);
      console.error("❌ Validation errors:", validation.errors);
      return { success: false, error };
    }

    const updateData = buildIVACCasePayload(formData);

    console.log("📤 Updating IVAC case:", caseId, {
      ...updateData,
      records: `${updateData.records.length} records`,
    });

    // Update the ivac_cases table
    const { data, error } = await supabase
      .from("ivac_cases")
      .update(updateData)
      .eq("id", caseId)
      .select()
      .single();

    if (error) {
      console.error("❌ Supabase update error:", error);
      return { success: false, error };
    }

    if (!data) {
      const noDataError = new Error("No data returned from Supabase after update");
      console.error("❌", noDataError.message);
      return { success: false, error: noDataError };
    }

    console.log("✅ IVAC case updated successfully:", caseId);
    
    // Create audit log for IVAC case update
    await createAuditLog({
      actionType: AUDIT_ACTIONS.UPDATE_CASE,
      actionCategory: AUDIT_CATEGORIES.CASE,
      description: `Updated IVAC (Incidence on VAC) case`,
      resourceType: 'ivac_cases',
      resourceId: caseId,
      metadata: {
        caseType: 'IVAC',
        status: updateData.status,
        recordsCount: updateData.records?.length || 0
      },
      severity: 'info'
    });
    
    return { success: true, error: null };
  } catch (err) {
    console.error("❌ Unexpected error in updateIVACCase:", err);
    return { success: false, error: err };
  }
}

/**
 * Fetch a single IVAC case by ID
 * @param {string} caseId - The ID of the case to fetch
 * @returns {Promise<{data: Object|null, error: Error|null}>}
 */
export async function fetchIVACCase(caseId) {
  try {
    if (!caseId) {
      const error = new Error("Case ID is required");
      console.error("❌", error.message);
      return { data: null, error };
    }

    console.log("📥 Fetching IVAC case:", caseId);

    const { data, error } = await supabase
      .from("ivac_cases")
      .select("*")
      .eq("id", caseId)
      .single();

    if (error) {
      console.error("❌ Supabase fetch error:", error);
      return { data: null, error };
    }

    if (!data) {
      const noDataError = new Error(`IVAC case not found: ${caseId}`);
      console.error("❌", noDataError.message);
      return { data: null, error: noDataError };
    }

    console.log("✅ IVAC case fetched successfully");
    return { data, error: null };
  } catch (err) {
    console.error("❌ Unexpected error in fetchIVACCase:", err);
    return { data: null, error: err };
  }
}

/**
 * Map database record to form data format
 * @param {Object} dbRecord - Database record from Supabase
 * @returns {Object} - Form data structure
 */
export function mapDbToFormData(dbRecord) {
  if (!dbRecord) {
    console.warn("⚠️ No database record provided to map");
    return null;
  }

  return {
    incidenceOnVAC: {
      province: dbRecord.province || "Misamis Oriental",
      municipality: dbRecord.municipality || "Villanueva",
      records: dbRecord.records || [],
      caseManagers: dbRecord.case_managers || [],
      status: dbRecord.status || "Active",
      reportingPeriod: dbRecord.reporting_period || null,
      notes: dbRecord.notes || null,
    },
  };
}

/**
 * Fetch all IVAC cases with optional filtering
 * @param {Object} filters - Optional filters (status, dateRange, etc.)
 * @returns {Promise<{data: Array|null, error: Error|null, count: number}>}
 */
export async function fetchAllIVACCases(filters = {}) {
  try {
    console.log("📥 Fetching IVAC cases with filters:", filters);

    let query = supabase
      .from("ivac_cases")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false });

    // Apply filters
    if (filters.status) {
      query = query.eq("status", filters.status);
    }
    if (filters.province) {
      query = query.eq("province", filters.province);
    }
    if (filters.municipality) {
      query = query.eq("municipality", filters.municipality);
    }
    if (filters.startDate) {
      query = query.gte("created_at", filters.startDate);
    }
    if (filters.endDate) {
      query = query.lte("created_at", filters.endDate);
    }
    if (filters.reportingPeriod) {
      query = query.eq("reporting_period", filters.reportingPeriod);
    }

    // Pagination
    if (filters.limit) {
      query = query.limit(filters.limit);
    }
    if (filters.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error("❌ Supabase fetch error:", error);
      return { data: null, error, count: 0 };
    }

    console.log(`✅ Fetched ${data?.length || 0} IVAC cases (total: ${count || 0})`);
    return { data: data || [], error: null, count: count || 0 };
  } catch (err) {
    console.error("❌ Unexpected error in fetchAllIVACCases:", err);
    return { data: null, error: err, count: 0 };
  }
}

/**
 * Delete an IVAC case by ID
 * @param {string} caseId - The ID of the case to delete
 * @returns {Promise<{success: boolean, error: Error|null}>}
 */
export async function deleteIVACCase(caseId) {
  try {
    if (!caseId) {
      const error = new Error("Case ID is required for deletion");
      console.error("❌", error.message);
      return { success: false, error };
    }

    console.log("🗑️ Deleting IVAC case:", caseId);

    const { error } = await supabase
      .from("ivac_cases")
      .delete()
      .eq("id", caseId);

    if (error) {
      console.error("❌ Supabase delete error:", error);
      return { success: false, error };
    }

    console.log("✅ IVAC case deleted successfully:", caseId);
    return { success: true, error: null };
  } catch (err) {
    console.error("❌ Unexpected error in deleteIVACCase:", err);
    return { success: false, error: err };
  }
}

/**
 * Bulk delete IVAC cases
 * @param {Array<string>} caseIds - Array of case IDs to delete
 * @returns {Promise<{success: boolean, deletedCount: number, error: Error|null}>}
 */
export async function bulkDeleteIVACCases(caseIds) {
  try {
    if (!caseIds || !Array.isArray(caseIds) || caseIds.length === 0) {
      const error = new Error("Case IDs array is required for bulk deletion");
      console.error("❌", error.message);
      return { success: false, deletedCount: 0, error };
    }

    console.log(`🗑️ Bulk deleting ${caseIds.length} IVAC cases`);

    const { data, error } = await supabase
      .from("ivac_cases")
      .delete()
      .in("id", caseIds)
      .select();

    if (error) {
      console.error("❌ Supabase bulk delete error:", error);
      return { success: false, deletedCount: 0, error };
    }

    const deletedCount = data?.length || 0;
    console.log(`✅ Bulk deleted ${deletedCount} IVAC cases`);
    return { success: true, deletedCount, error: null };
  } catch (err) {
    console.error("❌ Unexpected error in bulkDeleteIVACCases:", err);
    return { success: false, deletedCount: 0, error: err };
  }
}

/**
 * Get IVAC statistics
 * @param {Object} filters - Optional filters for statistics
 * @returns {Promise<{data: Object|null, error: Error|null}>}
 */
export async function getIVACStatistics(filters = {}) {
  try {
    console.log("📊 Fetching IVAC statistics with filters:", filters);

    let query = supabase
      .from("ivac_cases")
      .select("records, status, created_at, reporting_period");

    // Apply filters
    if (filters.status) {
      query = query.eq("status", filters.status);
    }
    if (filters.startDate) {
      query = query.gte("created_at", filters.startDate);
    }
    if (filters.endDate) {
      query = query.lte("created_at", filters.endDate);
    }

    const { data, error } = await query;

    if (error) {
      console.error("❌ Supabase statistics fetch error:", error);
      return { data: null, error };
    }

    // Calculate statistics
    const stats = {
      totalCases: data.length,
      totalVacVictims: 0,
      byBarangay: {},
      byGender: { male: 0, female: 0 },
      byAge: { "0-4": 0, "5-9": 0, "10-14": 0, "15-17": 0, "18+": 0 },
      byViolenceType: {
        physical: 0,
        sexual: 0,
        psychological: 0,
        neglect: 0,
        others: 0,
      },
    };

    data.forEach((caseRecord) => {
      const records = caseRecord.records || [];
      records.forEach((record) => {
        // Total VAC victims
        stats.totalVacVictims += parseInt(record.vacVictims || 0, 10);

        // By barangay
        if (!stats.byBarangay[record.barangay]) {
          stats.byBarangay[record.barangay] = 0;
        }
        stats.byBarangay[record.barangay] += parseInt(record.vacVictims || 0, 10);

        // By gender
        stats.byGender.male += parseInt(record.genderMale || 0, 10);
        stats.byGender.female += parseInt(record.genderFemale || 0, 10);

        // By age
        stats.byAge["0-4"] += parseInt(record.age0to4 || 0, 10);
        stats.byAge["5-9"] += parseInt(record.age5to9 || 0, 10);
        stats.byAge["10-14"] += parseInt(record.age10to14 || 0, 10);
        stats.byAge["15-17"] += parseInt(record.age15to17 || 0, 10);
        stats.byAge["18+"] += parseInt(record.age18Plus || 0, 10);

        // By violence type
        stats.byViolenceType.physical += parseInt(record.physicalAbuse || 0, 10);
        stats.byViolenceType.sexual += parseInt(record.sexualAbuse || 0, 10);
        stats.byViolenceType.psychological += parseInt(record.psychologicalAbuse || 0, 10);
        stats.byViolenceType.neglect += parseInt(record.neglect || 0, 10);
        stats.byViolenceType.others += parseInt(record.violenceOthers || 0, 10);
      });
    });

    console.log("✅ IVAC statistics calculated successfully");
    return { data: stats, error: null };
  } catch (err) {
    console.error("❌ Unexpected error in getIVACStatistics:", err);
    return { data: null, error: err };
  }
}
