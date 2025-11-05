/**
 * @file partnerSubmission.js
 * @description Helper functions for partner submission and data formatting
 * @module lib/partnerSubmission
 * 
 * Features:
 * - Format partner data for Supabase insertion
 * - Validate partner data before submission
 * - Handle MOU (Memorandum of Understanding) date validations
 * - Calculate partnership metrics
 * 
 * Dependencies:
 * - @/config/supabase - Supabase client
 * - @/lib/auditLog - Audit logging utilities
 */

import supabase from "@/../config/supabase";
import { createAuditLog, AUDIT_ACTIONS, AUDIT_CATEGORIES } from "./auditLog";

/**
 * Valid organization types
 */
export const ORGANIZATION_TYPES = [
  "NGO",
  "Government Agency",
  "Legal Service Provider",
  "Medical Facility",
  "Training Center",
  "Sports Organization",
  "Foundation",
  "Crisis Center",
  "Private Organization",
  "Community-Based Organization",
];

/**
 * Valid service types
 */
export const SERVICE_TYPES = [
  "counseling",
  "legal",
  "medical",
  "educational",
  "financial",
  "prevention",
  "livelihood",
  "shelter",
  "recreational",
  "advocacy",
  "psychological",
];

/**
 * Partnership status types
 */
export const PARTNERSHIP_STATUS = {
  ACTIVE: "active",
  INACTIVE: "inactive",
  PENDING: "pending",
  EXPIRED: "expired",
};

/**
 * Validates partner data before submission
 * @param {Object} partnerData - Partner data to validate
 * @returns {Object} { isValid: boolean, errors: Array<string> }
 * 
 * @example
 * const validation = validatePartnerData(formData);
 * if (!validation.isValid) {
 *   console.error('Validation errors:', validation.errors);
 * }
 */
export function validatePartnerData(partnerData) {
  const errors = [];

  // Required fields
  if (!partnerData.organization_name || partnerData.organization_name.trim().length < 3) {
    errors.push("Organization name must be at least 3 characters");
  }
  
  if (!partnerData.organization_type) {
    errors.push("Organization type is required");
  } else if (!ORGANIZATION_TYPES.includes(partnerData.organization_type)) {
    errors.push(`Invalid organization type. Must be one of: ${ORGANIZATION_TYPES.join(", ")}`);
  }

  if (!partnerData.contact_person || partnerData.contact_person.trim().length < 2) {
    errors.push("Contact person is required");
  }

  // Email validation
  const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
  if (!partnerData.contact_email) {
    errors.push("Contact email is required");
  } else if (!emailRegex.test(partnerData.contact_email)) {
    errors.push("Invalid email format");
  }

  // Phone validation (basic)
  if (!partnerData.contact_phone) {
    errors.push("Contact phone is required");
  } else if (partnerData.contact_phone.length < 10) {
    errors.push("Contact phone must be at least 10 characters");
  }

  if (!partnerData.address || partnerData.address.trim().length < 5) {
    errors.push("Address must be at least 5 characters");
  }

  // Services offered validation
  if (!partnerData.services_offered || partnerData.services_offered.length === 0) {
    errors.push("At least one service must be offered");
  } else {
    const invalidServices = partnerData.services_offered.filter(
      service => !SERVICE_TYPES.includes(service)
    );
    if (invalidServices.length > 0) {
      errors.push(`Invalid service types: ${invalidServices.join(", ")}`);
    }
  }

  // Numeric validations
  if (partnerData.total_referrals_sent && partnerData.total_referrals_sent < 0) {
    errors.push("Total referrals sent cannot be negative");
  }
  
  if (partnerData.total_referrals_received && partnerData.total_referrals_received < 0) {
    errors.push("Total referrals received cannot be negative");
  }
  
  if (partnerData.success_rate !== undefined && partnerData.success_rate !== null) {
    if (partnerData.success_rate < 0 || partnerData.success_rate > 100) {
      errors.push("Success rate must be between 0 and 100");
    }
  }
  
  if (partnerData.budget_allocation && partnerData.budget_allocation < 0) {
    errors.push("Budget allocation cannot be negative");
  }

  // MOU date validations
  if (partnerData.mou_signed_date && partnerData.mou_expiry_date) {
    const signedDate = new Date(partnerData.mou_signed_date);
    const expiryDate = new Date(partnerData.mou_expiry_date);
    
    if (expiryDate <= signedDate) {
      errors.push("MOU expiry date must be after signed date");
    }
  } else if (partnerData.mou_signed_date || partnerData.mou_expiry_date) {
    errors.push("Both MOU signed date and expiry date must be provided together");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Formats partner data for Supabase insertion
 * @param {Object} partnerData - Raw partner data from form
 * @returns {Object} Formatted partner data
 * 
 * @example
 * const formattedData = formatPartnerData(rawFormData);
 * const { data, error } = await supabase.from('partners').insert([formattedData]);
 */
export function formatPartnerData(partnerData) {
  return {
    organization_name: partnerData.organization_name?.trim(),
    organization_type: partnerData.organization_type,
    services_offered: Array.isArray(partnerData.services_offered)
      ? partnerData.services_offered
      : [partnerData.services_offered],
    contact_person: partnerData.contact_person?.trim(),
    contact_email: partnerData.contact_email?.trim().toLowerCase(),
    contact_phone: partnerData.contact_phone?.trim(),
    address: partnerData.address?.trim(),
    partnership_status: partnerData.partnership_status || PARTNERSHIP_STATUS.PENDING,
    mou_signed_date: partnerData.mou_signed_date || null,
    mou_expiry_date: partnerData.mou_expiry_date || null,
    total_referrals_sent: parseInt(partnerData.total_referrals_sent) || 0,
    total_referrals_received: parseInt(partnerData.total_referrals_received) || 0,
    success_rate: parseInt(partnerData.success_rate) || 0,
    budget_allocation: parseFloat(partnerData.budget_allocation) || 0,
    notes: partnerData.notes?.trim() || null,
  };
}

/**
 * Checks if MOU is expiring soon (within 30 days)
 * @param {string|Date} mouExpiryDate - MOU expiry date
 * @returns {boolean} True if expiring within 30 days
 */
export function isMOUExpiringSoon(mouExpiryDate) {
  if (!mouExpiryDate) return false;
  
  const expiryDate = new Date(mouExpiryDate);
  const today = new Date();
  const daysUntilExpiry = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
  
  return daysUntilExpiry > 0 && daysUntilExpiry <= 30;
}

/**
 * Checks if MOU is expired
 * @param {string|Date} mouExpiryDate - MOU expiry date
 * @returns {boolean} True if expired
 */
export function isMOUExpired(mouExpiryDate) {
  if (!mouExpiryDate) return false;
  
  const expiryDate = new Date(mouExpiryDate);
  const today = new Date();
  
  return expiryDate < today;
}

/**
 * Gets MOU status badge information
 * @param {string|Date} mouExpiryDate - MOU expiry date
 * @returns {Object} { status: string, color: string, label: string }
 */
export function getMOUStatus(mouExpiryDate) {
  if (!mouExpiryDate) {
    return { status: "none", color: "gray", label: "No MOU" };
  }
  
  if (isMOUExpired(mouExpiryDate)) {
    return { status: "expired", color: "red", label: "Expired" };
  }
  
  if (isMOUExpiringSoon(mouExpiryDate)) {
    return { status: "expiring", color: "yellow", label: "Expiring Soon" };
  }
  
  return { status: "active", color: "green", label: "Active" };
}

/**
 * Submits a new partner to Supabase with audit logging
 * @param {Object} partnerData - Partner data to submit
 * @returns {Promise<{partnerId: string|null, data: Object|null, error: any}>}
 * 
 * @example
 * const result = await submitPartner(formData);
 * if (result.error) {
 *   console.error('Failed to create partner:', result.error);
 * } else {
 *   console.log('Partner created with ID:', result.partnerId);
 * }
 */
export async function submitPartner(partnerData) {
  try {
    // Validate data
    const validation = validatePartnerData(partnerData);
    if (!validation.isValid) {
      return {
        partnerId: null,
        data: null,
        error: {
          message: validation.errors.join(", "),
          validationErrors: validation.errors,
        },
      };
    }

    // Format data
    const formattedData = formatPartnerData(partnerData);

    // Insert into Supabase
    const { data, error } = await supabase
      .from("partners")
      .insert([formattedData])
      .select()
      .single();

    if (error) {
      return { partnerId: null, data: null, error };
    }

    // Create audit log
    await createAuditLog({
      actionType: AUDIT_ACTIONS.CREATE_PARTNER,
      actionCategory: AUDIT_CATEGORIES.PARTNER,
      description: `Created new partner: ${data.organization_name}`,
      resourceType: "partner",
      resourceId: data.id,
      metadata: {
        organizationName: data.organization_name,
        organizationType: data.organization_type,
        servicesOffered: data.services_offered,
        contactPerson: data.contact_person,
        partnershipStatus: data.partnership_status,
      },
      severity: "info",
    });

    return { partnerId: data.id, data, error: null };
  } catch (err) {
    console.error("Error in submitPartner:", err);
    return { partnerId: null, data: null, error: err };
  }
}

/**
 * Updates an existing partner in Supabase
 * @param {string} partnerId - Partner ID to update
 * @param {Object} updates - Updated partner data
 * @param {Object} oldData - Previous partner data for audit comparison
 * @returns {Promise<{data: Object|null, error: any}>}
 * 
 * @example
 * const result = await updatePartner(partnerId, updatedData, currentData);
 * if (result.error) {
 *   console.error('Failed to update partner:', result.error);
 * }
 */
export async function updatePartner(partnerId, updates, oldData = null) {
  try {
    // Format updates
    const formattedUpdates = {
      ...updates,
      services_offered: Array.isArray(updates.services_offered)
        ? updates.services_offered
        : updates.services_offered
        ? [updates.services_offered]
        : undefined,
      updated_at: new Date().toISOString(),
    };

    // Remove undefined values
    Object.keys(formattedUpdates).forEach((key) => {
      if (formattedUpdates[key] === undefined) {
        delete formattedUpdates[key];
      }
    });

    // Update in Supabase
    const { data, error } = await supabase
      .from("partners")
      .update(formattedUpdates)
      .eq("id", partnerId)
      .select()
      .single();

    if (error) {
      return { data: null, error };
    }

    // Create audit log with change details
    const changes = oldData
      ? Object.keys(updates).reduce((acc, key) => {
          if (JSON.stringify(oldData[key]) !== JSON.stringify(updates[key])) {
            acc[key] = { old: oldData[key], new: updates[key] };
          }
          return acc;
        }, {})
      : updates;

    await createAuditLog({
      actionType: AUDIT_ACTIONS.UPDATE_PARTNER,
      actionCategory: AUDIT_CATEGORIES.PARTNER,
      description: `Updated partner: ${data.organization_name}`,
      resourceType: "partner",
      resourceId: partnerId,
      metadata: {
        organizationName: data.organization_name,
        changes,
      },
      severity: "info",
    });

    return { data, error: null };
  } catch (err) {
    console.error("Error in updatePartner:", err);
    return { data: null, error: err };
  }
}

/**
 * Deletes a partner from Supabase
 * @param {string} partnerId - Partner ID to delete
 * @param {Object} partnerData - Partner data for audit log
 * @returns {Promise<{success: boolean, error: any}>}
 * 
 * @example
 * const result = await deletePartner(partnerId, partnerData);
 * if (!result.success) {
 *   console.error('Failed to delete partner:', result.error);
 * }
 */
export async function deletePartner(partnerId, partnerData = null) {
  try {
    // Delete from Supabase
    const { error } = await supabase.from("partners").delete().eq("id", partnerId);

    if (error) {
      return { success: false, error };
    }

    // Create audit log
    if (partnerData) {
      await createAuditLog({
        actionType: AUDIT_ACTIONS.DELETE_PARTNER,
        actionCategory: AUDIT_CATEGORIES.PARTNER,
        description: `Deleted partner: ${partnerData.organization_name}`,
        resourceType: "partner",
        resourceId: partnerId,
        metadata: {
          organizationName: partnerData.organization_name,
          organizationType: partnerData.organization_type,
          servicesOffered: partnerData.services_offered,
        },
        severity: "warning",
      });
    }

    return { success: true, error: null };
  } catch (err) {
    console.error("Error in deletePartner:", err);
    return { success: false, error: err };
  }
}

/**
 * Updates referral counts for a partner
 * @param {string} partnerId - Partner ID
 * @param {Object} updates - { sentIncrement: number, receivedIncrement: number }
 * @returns {Promise<{data: Object|null, error: any}>}
 */
export async function updateReferralCounts(partnerId, { sentIncrement = 0, receivedIncrement = 0 }) {
  try {
    // Get current counts
    const { data: partner, error: fetchError } = await supabase
      .from("partners")
      .select("total_referrals_sent, total_referrals_received")
      .eq("id", partnerId)
      .single();

    if (fetchError) {
      return { data: null, error: fetchError };
    }

    // Calculate new counts
    const newSentCount = (partner.total_referrals_sent || 0) + sentIncrement;
    const newReceivedCount = (partner.total_referrals_received || 0) + receivedIncrement;

    // Update counts
    const { data, error } = await supabase
      .from("partners")
      .update({
        total_referrals_sent: Math.max(0, newSentCount),
        total_referrals_received: Math.max(0, newReceivedCount),
      })
      .eq("id", partnerId)
      .select()
      .single();

    if (error) {
      return { data: null, error };
    }

    return { data, error: null };
  } catch (err) {
    console.error("Error in updateReferralCounts:", err);
    return { data: null, error: err };
  }
}

/**
 * Calculates success rate based on service delivery outcomes
 * @param {string} partnerId - Partner ID
 * @returns {Promise<{successRate: number|null, error: any}>}
 */
export async function calculateSuccessRate(partnerId) {
  try {
    // This would typically query service_delivery table
    // For now, returns the current stored rate
    const { data, error } = await supabase
      .from("partners")
      .select("success_rate")
      .eq("id", partnerId)
      .single();

    if (error) {
      return { successRate: null, error };
    }

    return { successRate: data.success_rate, error: null };
  } catch (err) {
    console.error("Error in calculateSuccessRate:", err);
    return { successRate: null, error: err };
  }
}

/**
 * Gets partners expiring soon (MOU expiring within days)
 * @param {number} daysThreshold - Number of days threshold (default 30)
 * @returns {Promise<{partners: Array|null, error: any}>}
 */
export async function getExpiringSoonPartners(daysThreshold = 30) {
  try {
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + daysThreshold);

    const { data, error } = await supabase
      .from("partners")
      .select("*")
      .gte("mou_expiry_date", today.toISOString().split("T")[0])
      .lte("mou_expiry_date", futureDate.toISOString().split("T")[0])
      .eq("partnership_status", "active")
      .order("mou_expiry_date", { ascending: true });

    if (error) {
      return { partners: null, error };
    }

    return { partners: data, error: null };
  } catch (err) {
    console.error("Error in getExpiringSoonPartners:", err);
    return { partners: null, error: err };
  }
}
