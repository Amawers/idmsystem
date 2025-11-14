/**
 * @file facSubmission.js
 * @description Helper functions for submitting and updating Family Assistance Card (FAC) data to Supabase
 * 
 * This module provides functions to:
 * - Map intake form data to the fac_case and fac_family_member tables
 * - Insert new FAC records
 * - Update existing FAC records
 * - Handle related family member records
 * 
 * @author IDM System
 * @date 2025-10-28
 */

import supabase from "../../config/supabase";
import { createAuditLog, AUDIT_ACTIONS, AUDIT_CATEGORIES } from "./auditLog";
import { createAuditLog, AUDIT_ACTIONS, AUDIT_CATEGORIES } from "./auditLog";
import { createAuditLog, AUDIT_ACTIONS, AUDIT_CATEGORIES } from "./auditLog";

/**
 * Maps intake form store data to fac_case table schema
 * 
 * @param {Object} data - Complete intake form data from useIntakeFormStore
 * @returns {Object} Payload suitable for Supabase fac_case table insert/update
 * 
 * @example
 * const payload = buildFacCasePayload(formData);
 * // Returns: { head_first_name: "John", location_region: "Region X", ... }
 */
function buildFacCasePayload(data) {
  // Extract sections from store
  const location = data.locationOfAffectedFamily || {};
  const head = data.headOfFamily || {};
  const vulnerable = data.vulnerableMembers || {};
  const final = data.finalDetails || {};

  // Build complete payload
  const payload = {
    // Location information
    location_region: location.region || null,
    location_province: location.province || null,
    location_district: location.district || null,
    location_city_municipality: location.cityMunicipality || null,
    location_barangay: location.barangay || null,
    location_evacuation_center: location.evacuationCenter || null,

    // Head of family information
    head_last_name: head.lastName || null,
    head_first_name: head.firstName || null,
    head_middle_name: head.middleName || null,
    head_name_extension: head.nameExtension || null,
    head_birthdate: head.birthdate || null,
    head_age: head.age ? parseInt(head.age) : null,
    head_birthplace: head.birthplace || null,
    head_sex: head.sex || null,
    head_civil_status: head.civilStatus || null,
    head_mothers_maiden_name: head.mothersMaidenName || null,
    head_religion: head.religion || null,
    head_occupation: head.occupation || null,
    head_monthly_income: head.monthlyIncome ? parseFloat(head.monthlyIncome) : null,
    head_id_card_presented: head.idCardPresented || null,
    head_id_card_number: head.idCardNumber || null,
    head_contact_number: head.contactNumber || null,
    head_permanent_address: head.permanentAddress || null,
    head_alternate_contact_number: head.alternateContactNumber || null,
    head_4ps_beneficiary: head.fourPsBeneficiary || false,
    head_ip_ethnicity: head.ipEthnicity || false,
    head_ip_ethnicity_type: head.ipEthnicityType || null,

    // Vulnerable members count
    vulnerable_older_persons: vulnerable.noOfOlderPersons ? parseInt(vulnerable.noOfOlderPersons) : 0,
    vulnerable_pregnant_women: vulnerable.noOfPregnantWomen ? parseInt(vulnerable.noOfPregnantWomen) : 0,
    vulnerable_lactating_women: vulnerable.noOfLactatingWomen ? parseInt(vulnerable.noOfLactatingWomen) : 0,
    vulnerable_pwds: vulnerable.noOfPWDs ? parseInt(vulnerable.noOfPWDs) : 0,

    // Final details
    house_ownership: final.houseOwnership || null,
    shelter_damage: final.shelterDamage || null,
    barangay_captain: final.barangayCaptain || null,
    date_registered: final.dateRegistered || null,
    lswdo_name: final.lswdoName || null,

    // Metadata
    status: 'active',
    priority: 'normal',
    visibility: 'visible',
  };

  return payload;
}

/**
 * Builds family member rows for fac_family_member table
 * 
 * @param {Array} members - Array of family member objects from form
 * @param {string} facCaseId - UUID of the parent fac_case record
 * @returns {Array} Array of family member records ready for insert
 * 
 * @example
 * const memberRows = buildFamilyMemberRows(familyData.members, caseId);
 */
function buildFamilyMemberRows(members, facCaseId) {
  if (!Array.isArray(members) || members.length === 0) {
    return [];
  }

  return members.map((member) => ({
    fac_case_id: facCaseId,
    family_member_name: member.familyMember || null,
    relation_to_head: member.relationToHead || null,
    birthdate: member.birthdate || null,
    age: member.age ? parseInt(member.age) : null,
    sex: member.sex || null,
    educational_attainment: member.educationalAttainment || null,
    occupation: member.occupation || null,
    remarks: member.remarks || null,
  }));
}

/**
 * Submits a new Family Assistance Card to the database
 * 
 * @param {Object} formData - Complete form data from useIntakeFormStore
 * @returns {Promise<{facCaseId: string|null, error: any}>} Result object with case ID or error
 * 
 * @example
 * const { facCaseId, error } = await submitFacCase(finalData);
 * if (error) {
 *   console.error("Submission failed:", error);
 * } else {
 *   console.log("Created FAC case:", facCaseId);
 * }
 */
export async function submitFacCase(formData) {
  try {
    console.log("📝 Submitting FAC case...", formData);

    // Build main case payload
    const casePayload = buildFacCasePayload(formData);

    // Insert main fac_case record
    const { data: insertedCase, error: caseError } = await supabase
      .from("fac_case")
      .insert(casePayload)
      .select()
      .single();

    if (caseError) {
      console.error("❌ Error inserting fac_case:", caseError);
      return { facCaseId: null, error: caseError };
    }

    const facCaseId = insertedCase?.id;
    console.log("✅ Created fac_case:", facCaseId);

    // Create audit log for FAC case creation
    await createAuditLog({
      actionType: AUDIT_ACTIONS.CREATE_CASE,
      actionCategory: AUDIT_CATEGORIES.CASE,
      description: `Created new FAC (Family Assistance Card) case for ${casePayload.head_first_name || ''} ${casePayload.head_last_name || 'N/A'}`,
      resourceType: 'fac_case',
      resourceId: facCaseId,
      metadata: {
        caseType: 'FAC',
        headOfFamily: `${casePayload.head_first_name || ''} ${casePayload.head_last_name || ''}`.trim(),
        location: casePayload.location_barangay,
        familyMembersCount: formData.familyInformation?.members?.length || 0
      },
      severity: 'info'
    });

    // Insert family members if any
    const familyMembers = formData.familyInformation?.members || [];
    if (familyMembers.length > 0) {
      const memberRows = buildFamilyMemberRows(familyMembers, facCaseId);
      
      const { error: memberError } = await supabase
        .from("fac_family_member")
        .insert(memberRows);

      if (memberError) {
        console.error("❌ Error inserting family members:", memberError);
        return { facCaseId, error: memberError };
      }

      console.log(`✅ Inserted ${memberRows.length} family members`);
    }

    return { facCaseId, error: null };
  } catch (err) {
    console.error("❌ Unexpected error in submitFacCase:", err);
    return { facCaseId: null, error: err };
  }
}

/**
 * Updates an existing Family Assistance Card in the database
 * 
 * @param {string} facCaseId - UUID of the fac_case to update
 * @param {Object} formData - Complete form data from useIntakeFormStore
 * @returns {Promise<{success: boolean, error: any}>} Result object
 * 
 * @example
 * const { success, error } = await updateFacCase(caseId, updatedData);
 * if (success) {
 *   console.log("FAC case updated successfully");
 * }
 */
export async function updateFacCase(facCaseId, formData) {
  try {
    console.log("📝 Updating FAC case:", facCaseId);

    // Build updated case payload
    const casePayload = buildFacCasePayload(formData);

    // Update main fac_case record
    const { error: updateError } = await supabase
      .from("fac_case")
      .update(casePayload)
      .eq("id", facCaseId);

    if (updateError) {
      console.error("❌ Error updating fac_case:", updateError);
      return { success: false, error: updateError };
    }

    console.log("✅ Updated fac_case:", facCaseId);

    // Create audit log for FAC case update
    await createAuditLog({
      actionType: AUDIT_ACTIONS.UPDATE_CASE,
      actionCategory: AUDIT_CATEGORIES.CASE,
      description: `Updated FAC (Family Assistance Card) case for ${casePayload.head_first_name || ''} ${casePayload.head_last_name || 'N/A'}`,
      resourceType: 'fac_case',
      resourceId: facCaseId,
      metadata: {
        caseType: 'FAC',
        headOfFamily: `${casePayload.head_first_name || ''} ${casePayload.head_last_name || ''}`.trim(),
        location: casePayload.location_barangay
      },
      severity: 'info'
    });

    // Handle family members: delete existing and insert new ones
    // This is a simple strategy - delete all and re-insert
    const { error: deleteError } = await supabase
      .from("fac_family_member")
      .delete()
      .eq("fac_case_id", facCaseId);

    if (deleteError) {
      console.error("❌ Error deleting old family members:", deleteError);
      return { success: false, error: deleteError };
    }

    // Insert updated family members
    const familyMembers = formData.familyInformation?.members || [];
    if (familyMembers.length > 0) {
      const memberRows = buildFamilyMemberRows(familyMembers, facCaseId);
      
      const { error: memberError } = await supabase
        .from("fac_family_member")
        .insert(memberRows);

      if (memberError) {
        console.error("❌ Error inserting updated family members:", memberError);
        return { success: false, error: memberError };
      }

      console.log(`✅ Updated ${memberRows.length} family members`);
    }

    return { success: true, error: null };
  } catch (err) {
    console.error("❌ Unexpected error in updateFacCase:", err);
    return { success: false, error: err };
  }
}

/**
 * Fetches a single FAC case with all related family members
 * 
 * @param {string} facCaseId - UUID of the fac_case to fetch
 * @returns {Promise<{data: Object|null, error: any}>} Result object with case data or error
 * 
 * @example
 * const { data, error } = await fetchFacCase(caseId);
 * if (data) {
 *   console.log("FAC case:", data.case);
 *   console.log("Family members:", data.members);
 * }
 */
export async function fetchFacCase(facCaseId) {
  try {
    console.log("📥 Fetching FAC case:", facCaseId);

    // Fetch main case
    const { data: caseData, error: caseError } = await supabase
      .from("fac_case")
      .select("*")
      .eq("id", facCaseId)
      .single();

    if (caseError) {
      console.error("❌ Error fetching fac_case:", caseError);
      return { data: null, error: caseError };
    }

    // Fetch family members
    const { data: members, error: memberError } = await supabase
      .from("fac_family_member")
      .select("*")
      .eq("fac_case_id", facCaseId)
      .order("created_at", { ascending: true });

    if (memberError) {
      console.error("❌ Error fetching family members:", memberError);
      return { data: null, error: memberError };
    }

    console.log("✅ Fetched FAC case with", members?.length || 0, "family members");

    return {
      data: {
        case: caseData,
        members: members || [],
      },
      error: null,
    };
  } catch (err) {
    console.error("❌ Unexpected error in fetchFacCase:", err);
    return { data: null, error: err };
  }
}

/**
 * Maps database record back to intake form store structure
 * Used for pre-filling edit forms
 * 
 * @param {Object} caseData - FAC case record from database
 * @param {Array} members - Family member records from database
 * @returns {Object} Data structure matching useIntakeFormStore format
 * 
 * @example
 * const formData = mapDbToFormData(caseRecord, memberRecords);
 * // Use with: useIntakeFormStore.setState({ data: formData });
 */
export function mapDbToFormData(caseData, members = []) {
  return {
    locationOfAffectedFamily: {
      region: caseData.location_region || "",
      province: caseData.location_province || "",
      district: caseData.location_district || "",
      cityMunicipality: caseData.location_city_municipality || "",
      barangay: caseData.location_barangay || "",
      evacuationCenter: caseData.location_evacuation_center || "",
    },
    headOfFamily: {
      lastName: caseData.head_last_name || "",
      firstName: caseData.head_first_name || "",
      middleName: caseData.head_middle_name || "",
      nameExtension: caseData.head_name_extension || "",
      birthdate: caseData.head_birthdate || "",
      age: caseData.head_age?.toString() || "",
      birthplace: caseData.head_birthplace || "",
      sex: caseData.head_sex || "",
      civilStatus: caseData.head_civil_status || "",
      mothersMaidenName: caseData.head_mothers_maiden_name || "",
      religion: caseData.head_religion || "",
      occupation: caseData.head_occupation || "",
      monthlyIncome: caseData.head_monthly_income?.toString() || "",
      idCardPresented: caseData.head_id_card_presented || "",
      idCardNumber: caseData.head_id_card_number || "",
      contactNumber: caseData.head_contact_number || "",
      permanentAddress: caseData.head_permanent_address || "",
      alternateContactNumber: caseData.head_alternate_contact_number || "",
      fourPsBeneficiary: caseData.head_4ps_beneficiary || false,
      ipEthnicity: caseData.head_ip_ethnicity || false,
      ipEthnicityType: caseData.head_ip_ethnicity_type || "",
    },
    familyInformation: {
      members: members.map((m) => ({
        familyMember: m.family_member_name || "",
        relationToHead: m.relation_to_head || "",
        birthdate: m.birthdate || "",
        age: m.age?.toString() || "",
        sex: m.sex || "",
        educationalAttainment: m.educational_attainment || "",
        occupation: m.occupation || "",
        remarks: m.remarks || "",
      })),
    },
    vulnerableMembers: {
      noOfOlderPersons: caseData.vulnerable_older_persons?.toString() || "0",
      noOfPregnantWomen: caseData.vulnerable_pregnant_women?.toString() || "0",
      noOfLactatingWomen: caseData.vulnerable_lactating_women?.toString() || "0",
      noOfPWDs: caseData.vulnerable_pwds?.toString() || "0",
    },
    finalDetails: {
      houseOwnership: caseData.house_ownership || "",
      shelterDamage: caseData.shelter_damage || "",
      barangayCaptain: caseData.barangay_captain || "",
      dateRegistered: caseData.date_registered || "",
      lswdoName: caseData.lswdo_name || "",
    },
  };
}

export { buildFacCasePayload, buildFamilyMemberRows };
