import Dexie from "dexie";

/**
 * Offline Case Management DB
 * - ciclcar_cases: stores local snapshot of CICL/CAR cases plus pending changes metadata
 * - ciclcar_queue: ordered queue of offline operations to replay against Supabase
 * - case_managers: cached list of case managers for offline dropdowns
 */
export const offlineCaseDb = new Dexie("idms_case_management");

offlineCaseDb.version(1).stores({
	ciclcar_cases: "++localId, id, updated_at, case_manager, hasPendingWrites",
	ciclcar_queue: "++queueId, operationType, createdAt",
	case_managers: "id, full_name",
});

offlineCaseDb.version(2).stores({
	ciclcar_cases: "++localId, id, updated_at, case_manager, hasPendingWrites",
	ciclcar_queue:
		"++queueId, targetLocalId, targetId, operationType, createdAt",
	case_managers: "id, full_name",
});

offlineCaseDb.version(3).stores({
	ciclcar_cases: "++localId, id, updated_at, case_manager, hasPendingWrites",
	ciclcar_queue:
		"++queueId, targetLocalId, targetId, operationType, createdAt",
	case_managers: "id, full_name",
	fac_cases:
		"++localId, id, updated_at, head_first_name, head_last_name, hasPendingWrites",
	fac_queue: "++queueId, targetLocalId, targetId, operationType, createdAt",
});

offlineCaseDb.version(4).stores({
	ciclcar_cases: "++localId, id, updated_at, case_manager, hasPendingWrites",
	ciclcar_queue:
		"++queueId, targetLocalId, targetId, operationType, createdAt",
	case_managers: "id, full_name",
	fac_cases:
		"++localId, id, updated_at, head_first_name, head_last_name, hasPendingWrites",
	fac_queue: "++queueId, targetLocalId, targetId, operationType, createdAt",
	far_cases:
		"++localId, id, date, receiving_member, assistance, hasPendingWrites",
	far_queue: "++queueId, targetLocalId, targetId, operationType, createdAt",
});

offlineCaseDb.version(5).stores({
	ciclcar_cases: "++localId, id, updated_at, case_manager, hasPendingWrites",
	ciclcar_queue:
		"++queueId, targetLocalId, targetId, operationType, createdAt",
	case_managers: "id, full_name",
	fac_cases:
		"++localId, id, updated_at, head_first_name, head_last_name, hasPendingWrites",
	fac_queue: "++queueId, targetLocalId, targetId, operationType, createdAt",
	far_cases:
		"++localId, id, date, receiving_member, assistance, hasPendingWrites",
	far_queue: "++queueId, targetLocalId, targetId, operationType, createdAt",
	ivac_cases:
		"++localId, id, updated_at, municipality, province, status, hasPendingWrites",
	ivac_queue: "++queueId, targetLocalId, targetId, operationType, createdAt",
});

// Version 6: Add case_cases and case_queue for Cases tab offline support
offlineCaseDb.version(6).stores({
	ciclcar_cases: "++localId, id, updated_at, case_manager, hasPendingWrites",
	ciclcar_queue:
		"++queueId, targetLocalId, targetId, operationType, createdAt",
	case_managers: "id, full_name",
	fac_cases:
		"++localId, id, updated_at, head_first_name, head_last_name, hasPendingWrites",
	fac_queue: "++queueId, targetLocalId, targetId, operationType, createdAt",
	far_cases:
		"++localId, id, date, receiving_member, assistance, hasPendingWrites",
	far_queue: "++queueId, targetLocalId, targetId, operationType, createdAt",
	ivac_cases:
		"++localId, id, updated_at, municipality, province, status, hasPendingWrites",
	ivac_queue: "++queueId, targetLocalId, targetId, operationType, createdAt",
	case_cases:
		"++localId, id, updated_at, identifying_name, case_manager, hasPendingWrites",
	case_queue: "++queueId, targetLocalId, targetId, operationType, createdAt",
});

// Version 7: Add dashboard caching for offline dashboard functionality
offlineCaseDb.version(7).stores({
	ciclcar_cases: "++localId, id, updated_at, case_manager, hasPendingWrites",
	ciclcar_queue:
		"++queueId, targetLocalId, targetId, operationType, createdAt",
	case_managers: "id, full_name",
	fac_cases:
		"++localId, id, updated_at, head_first_name, head_last_name, hasPendingWrites",
	fac_queue: "++queueId, targetLocalId, targetId, operationType, createdAt",
	far_cases:
		"++localId, id, date, receiving_member, assistance, hasPendingWrites",
	far_queue: "++queueId, targetLocalId, targetId, operationType, createdAt",
	ivac_cases:
		"++localId, id, updated_at, municipality, province, status, hasPendingWrites",
	ivac_queue: "++queueId, targetLocalId, targetId, operationType, createdAt",
	case_cases:
		"++localId, id, updated_at, identifying_name, case_manager, hasPendingWrites",
	case_queue: "++queueId, targetLocalId, targetId, operationType, createdAt",
	dashboard_cache: "++id, dashboardType, timestamp, data",
	dashboard_raw_data:
		"++id, dashboardType, timestamp, cases, ciclcar, fac, ivac",
});

// Version 8: Add program catalogs offline cache and queue
offlineCaseDb.version(8).stores({
	ciclcar_cases: "++localId, id, updated_at, case_manager, hasPendingWrites",
	ciclcar_queue:
		"++queueId, targetLocalId, targetId, operationType, createdAt",
	case_managers: "id, full_name",
	fac_cases:
		"++localId, id, updated_at, head_first_name, head_last_name, hasPendingWrites",
	fac_queue: "++queueId, targetLocalId, targetId, operationType, createdAt",
	far_cases:
		"++localId, id, date, receiving_member, assistance, hasPendingWrites",
	far_queue: "++queueId, targetLocalId, targetId, operationType, createdAt",
	ivac_cases:
		"++localId, id, updated_at, municipality, province, status, hasPendingWrites",
	ivac_queue: "++queueId, targetLocalId, targetId, operationType, createdAt",
	case_cases:
		"++localId, id, updated_at, identifying_name, case_manager, hasPendingWrites",
	case_queue: "++queueId, targetLocalId, targetId, operationType, createdAt",
	dashboard_cache: "++id, dashboardType, timestamp, data",
	dashboard_raw_data:
		"++id, dashboardType, timestamp, cases, ciclcar, fac, ivac",
	programs:
		"++localId, id, updated_at, program_name, status, hasPendingWrites",
	program_queue:
		"++queueId, targetLocalId, targetId, operationType, createdAt",
});

// Version 9: Cache program enrollments for offline viewing
offlineCaseDb.version(9).stores({
	ciclcar_cases: "++localId, id, updated_at, case_manager, hasPendingWrites",
	ciclcar_queue:
		"++queueId, targetLocalId, targetId, operationType, createdAt",
	case_managers: "id, full_name",
	fac_cases:
		"++localId, id, updated_at, head_first_name, head_last_name, hasPendingWrites",
	fac_queue: "++queueId, targetLocalId, targetId, operationType, createdAt",
	far_cases:
		"++localId, id, date, receiving_member, assistance, hasPendingWrites",
	far_queue: "++queueId, targetLocalId, targetId, operationType, createdAt",
	ivac_cases:
		"++localId, id, updated_at, municipality, province, status, hasPendingWrites",
	ivac_queue: "++queueId, targetLocalId, targetId, operationType, createdAt",
	case_cases:
		"++localId, id, updated_at, identifying_name, case_manager, hasPendingWrites",
	case_queue: "++queueId, targetLocalId, targetId, operationType, createdAt",
	dashboard_cache: "++id, dashboardType, timestamp, data",
	dashboard_raw_data:
		"++id, dashboardType, timestamp, cases, ciclcar, fac, ivac",
	programs:
		"++localId, id, updated_at, program_name, status, hasPendingWrites",
	program_queue:
		"++queueId, targetLocalId, targetId, operationType, createdAt",
	program_enrollments:
		"++localId, id, program_id, enrollment_date, status, updated_at",
});

// Version 10: Add enrollment queue and case caches for dropdown support
offlineCaseDb.version(10).stores({
	ciclcar_cases: "++localId, id, updated_at, case_manager, hasPendingWrites",
	ciclcar_queue:
		"++queueId, targetLocalId, targetId, operationType, createdAt",
	case_managers: "id, full_name",
	fac_cases:
		"++localId, id, updated_at, head_first_name, head_last_name, hasPendingWrites",
	fac_queue: "++queueId, targetLocalId, targetId, operationType, createdAt",
	far_cases:
		"++localId, id, date, receiving_member, assistance, hasPendingWrites",
	far_queue: "++queueId, targetLocalId, targetId, operationType, createdAt",
	ivac_cases:
		"++localId, id, updated_at, municipality, province, status, hasPendingWrites",
	ivac_queue: "++queueId, targetLocalId, targetId, operationType, createdAt",
	case_cases:
		"++localId, id, updated_at, identifying_name, case_manager, hasPendingWrites",
	case_queue: "++queueId, targetLocalId, targetId, operationType, createdAt",
	dashboard_cache: "++id, dashboardType, timestamp, data",
	dashboard_raw_data:
		"++id, dashboardType, timestamp, cases, ciclcar, fac, ivac",
	programs:
		"++localId, id, updated_at, program_name, status, hasPendingWrites",
	program_queue:
		"++queueId, targetLocalId, targetId, operationType, createdAt",
	program_enrollments:
		"++localId, id, program_id, enrollment_date, status, updated_at, hasPendingWrites",
	enrollment_queue:
		"++queueId, targetLocalId, targetId, operationType, createdAt",
	cached_vac_cases: "id, identifying_name, case_manager, status",
	cached_far_cases: "id, receiving_member, case_manager, status",
});

// Version 11: Add service_delivery cache and queue for offline service logging
offlineCaseDb.version(11).stores({
	ciclcar_cases: "++localId, id, updated_at, case_manager, hasPendingWrites",
	ciclcar_queue:
		"++queueId, targetLocalId, targetId, operationType, createdAt",
	case_managers: "id, full_name",
	fac_cases:
		"++localId, id, updated_at, head_first_name, head_last_name, hasPendingWrites",
	fac_queue: "++queueId, targetLocalId, targetId, operationType, createdAt",
	far_cases:
		"++localId, id, date, receiving_member, assistance, hasPendingWrites",
	far_queue: "++queueId, targetLocalId, targetId, operationType, createdAt",
	ivac_cases:
		"++localId, id, updated_at, municipality, province, status, hasPendingWrites",
	ivac_queue: "++queueId, targetLocalId, targetId, operationType, createdAt",
	case_cases:
		"++localId, id, updated_at, identifying_name, case_manager, hasPendingWrites",
	case_queue: "++queueId, targetLocalId, targetId, operationType, createdAt",
	dashboard_cache: "++id, dashboardType, timestamp, data",
	dashboard_raw_data:
		"++id, dashboardType, timestamp, cases, ciclcar, fac, ivac",
	programs:
		"++localId, id, updated_at, program_name, status, hasPendingWrites",
	program_queue:
		"++queueId, targetLocalId, targetId, operationType, createdAt",
	program_enrollments:
		"++localId, id, program_id, enrollment_date, status, updated_at, hasPendingWrites",
	enrollment_queue:
		"++queueId, targetLocalId, targetId, operationType, createdAt",
	cached_vac_cases: "id, identifying_name, case_manager, status",
	cached_far_cases: "id, receiving_member, case_manager, status",
	service_delivery:
		"++localId, id, enrollment_id, program_id, service_date, hasPendingWrites, lastLocalChange",
	service_delivery_queue:
		"++queueId, targetLocalId, targetId, operationType, createdAt",
});

// Version 12: Add partners cache and queue for offline partners management
offlineCaseDb.version(12).stores({
	ciclcar_cases: "++localId, id, updated_at, case_manager, hasPendingWrites",
	ciclcar_queue:
		"++queueId, targetLocalId, targetId, operationType, createdAt",
	case_managers: "id, full_name",
	fac_cases:
		"++localId, id, updated_at, head_first_name, head_last_name, hasPendingWrites",
	fac_queue: "++queueId, targetLocalId, targetId, operationType, createdAt",
	far_cases:
		"++localId, id, date, receiving_member, assistance, hasPendingWrites",
	far_queue: "++queueId, targetLocalId, targetId, operationType, createdAt",
	ivac_cases:
		"++localId, id, updated_at, municipality, province, status, hasPendingWrites",
	ivac_queue: "++queueId, targetLocalId, targetId, operationType, createdAt",
	case_cases:
		"++localId, id, updated_at, identifying_name, case_manager, hasPendingWrites",
	case_queue: "++queueId, targetLocalId, targetId, operationType, createdAt",
	dashboard_cache: "++id, dashboardType, timestamp, data",
	dashboard_raw_data:
		"++id, dashboardType, timestamp, cases, ciclcar, fac, ivac",
	programs:
		"++localId, id, updated_at, program_name, status, hasPendingWrites",
	program_queue:
		"++queueId, targetLocalId, targetId, operationType, createdAt",
	program_enrollments:
		"++localId, id, program_id, enrollment_date, status, updated_at, hasPendingWrites",
	enrollment_queue:
		"++queueId, targetLocalId, targetId, operationType, createdAt",
	cached_vac_cases: "id, identifying_name, case_manager, status",
	cached_far_cases: "id, receiving_member, case_manager, status",
	service_delivery:
		"++localId, id, enrollment_id, program_id, service_date, hasPendingWrites, lastLocalChange",
	service_delivery_queue:
		"++queueId, targetLocalId, targetId, operationType, createdAt",
	partners:
		"++localId, id, organization_name, partnership_status, mou_expiry_date, hasPendingWrites, lastLocalChange",
	partners_queue:
		"++queueId, targetLocalId, targetId, operationType, createdAt",
});

// Version 13: Inventory items offline cache + queue for Resource Allocation > Stock
offlineCaseDb.version(13).stores({
	ciclcar_cases: "++localId, id, updated_at, case_manager, hasPendingWrites",
	ciclcar_queue:
		"++queueId, targetLocalId, targetId, operationType, createdAt",
	case_managers: "id, full_name",
	fac_cases:
		"++localId, id, updated_at, head_first_name, head_last_name, hasPendingWrites",
	fac_queue: "++queueId, targetLocalId, targetId, operationType, createdAt",
	far_cases:
		"++localId, id, date, receiving_member, assistance, hasPendingWrites",
	far_queue: "++queueId, targetLocalId, targetId, operationType, createdAt",
	ivac_cases:
		"++localId, id, updated_at, municipality, province, status, hasPendingWrites",
	ivac_queue: "++queueId, targetLocalId, targetId, operationType, createdAt",
	case_cases:
		"++localId, id, updated_at, identifying_name, case_manager, hasPendingWrites",
	case_queue: "++queueId, targetLocalId, targetId, operationType, createdAt",
	dashboard_cache: "++id, dashboardType, timestamp, data",
	dashboard_raw_data:
		"++id, dashboardType, timestamp, cases, ciclcar, fac, ivac",
	programs:
		"++localId, id, updated_at, program_name, status, hasPendingWrites",
	program_queue:
		"++queueId, targetLocalId, targetId, operationType, createdAt",
	program_enrollments:
		"++localId, id, program_id, enrollment_date, status, updated_at, hasPendingWrites",
	enrollment_queue:
		"++queueId, targetLocalId, targetId, operationType, createdAt",
	cached_vac_cases: "id, identifying_name, case_manager, status",
	cached_far_cases: "id, receiving_member, case_manager, status",
	service_delivery:
		"++localId, id, enrollment_id, program_id, service_date, hasPendingWrites, lastLocalChange",
	service_delivery_queue:
		"++queueId, targetLocalId, targetId, operationType, createdAt",
	partners:
		"++localId, id, organization_name, partnership_status, mou_expiry_date, hasPendingWrites, lastLocalChange",
	partners_queue:
		"++queueId, targetLocalId, targetId, operationType, createdAt",
	inventory_items:
		"++localId, id, item_name, category, status, hasPendingWrites, lastLocalChange",
	inventory_queue:
		"++queueId, targetLocalId, targetId, operationType, createdAt",
});

// Version 14: Resource requests offline cache + queue for approvals workflow
offlineCaseDb.version(14).stores({
	ciclcar_cases: "++localId, id, updated_at, case_manager, hasPendingWrites",
	ciclcar_queue:
		"++queueId, targetLocalId, targetId, operationType, createdAt",
	case_managers: "id, full_name",
	fac_cases:
		"++localId, id, updated_at, head_first_name, head_last_name, hasPendingWrites",
	fac_queue: "++queueId, targetLocalId, targetId, operationType, createdAt",
	far_cases:
		"++localId, id, date, receiving_member, assistance, hasPendingWrites",
	far_queue: "++queueId, targetLocalId, targetId, operationType, createdAt",
	ivac_cases:
		"++localId, id, updated_at, municipality, province, status, hasPendingWrites",
	ivac_queue: "++queueId, targetLocalId, targetId, operationType, createdAt",
	case_cases:
		"++localId, id, updated_at, identifying_name, case_manager, hasPendingWrites",
	case_queue: "++queueId, targetLocalId, targetId, operationType, createdAt",
	dashboard_cache: "++id, dashboardType, timestamp, data",
	dashboard_raw_data:
		"++id, dashboardType, timestamp, cases, ciclcar, fac, ivac",
	programs:
		"++localId, id, updated_at, program_name, status, hasPendingWrites",
	program_queue:
		"++queueId, targetLocalId, targetId, operationType, createdAt",
	program_enrollments:
		"++localId, id, program_id, enrollment_date, status, updated_at, hasPendingWrites",
	enrollment_queue:
		"++queueId, targetLocalId, targetId, operationType, createdAt",
	cached_vac_cases: "id, identifying_name, case_manager, status",
	cached_far_cases: "id, receiving_member, case_manager, status",
	service_delivery:
		"++localId, id, enrollment_id, program_id, service_date, hasPendingWrites, lastLocalChange",
	service_delivery_queue:
		"++queueId, targetLocalId, targetId, operationType, createdAt",
	partners:
		"++localId, id, organization_name, partnership_status, mou_expiry_date, hasPendingWrites, lastLocalChange",
	partners_queue:
		"++queueId, targetLocalId, targetId, operationType, createdAt",
	inventory_items:
		"++localId, id, item_name, category, status, hasPendingWrites, lastLocalChange",
	inventory_queue:
		"++queueId, targetLocalId, targetId, operationType, createdAt",
	resource_requests:
		"++localId, id, request_number, status, priority, requested_by, hasPendingWrites, pendingAction, lastLocalChange",
	resource_requests_queue:
		"++queueId, targetLocalId, targetId, operationType, createdAt",
});

// Version 15: add created_at index for resource requests ordering
offlineCaseDb.version(15).stores({
	ciclcar_cases: "++localId, id, updated_at, case_manager, hasPendingWrites",
	ciclcar_queue:
		"++queueId, targetLocalId, targetId, operationType, createdAt",
	case_managers: "id, full_name",
	fac_cases:
		"++localId, id, updated_at, head_first_name, head_last_name, hasPendingWrites",
	fac_queue: "++queueId, targetLocalId, targetId, operationType, createdAt",
	far_cases:
		"++localId, id, date, receiving_member, assistance, hasPendingWrites",
	far_queue: "++queueId, targetLocalId, targetId, operationType, createdAt",
	ivac_cases:
		"++localId, id, updated_at, municipality, province, status, hasPendingWrites",
	ivac_queue: "++queueId, targetLocalId, targetId, operationType, createdAt",
	case_cases:
		"++localId, id, updated_at, identifying_name, case_manager, hasPendingWrites",
	case_queue: "++queueId, targetLocalId, targetId, operationType, createdAt",
	dashboard_cache: "++id, dashboardType, timestamp, data",
	dashboard_raw_data:
		"++id, dashboardType, timestamp, cases, ciclcar, fac, ivac",
	programs:
		"++localId, id, updated_at, program_name, status, hasPendingWrites",
	program_queue:
		"++queueId, targetLocalId, targetId, operationType, createdAt",
	program_enrollments:
		"++localId, id, program_id, enrollment_date, status, updated_at, hasPendingWrites",
	enrollment_queue:
		"++queueId, targetLocalId, targetId, operationType, createdAt",
	cached_vac_cases: "id, identifying_name, case_manager, status",
	cached_far_cases: "id, receiving_member, case_manager, status",
	service_delivery:
		"++localId, id, enrollment_id, program_id, service_date, hasPendingWrites, lastLocalChange",
	service_delivery_queue:
		"++queueId, targetLocalId, targetId, operationType, createdAt",
	partners:
		"++localId, id, organization_name, partnership_status, mou_expiry_date, hasPendingWrites, lastLocalChange",
	partners_queue:
		"++queueId, targetLocalId, targetId, operationType, createdAt",
	inventory_items:
		"++localId, id, item_name, category, status, hasPendingWrites, lastLocalChange",
	inventory_queue:
		"++queueId, targetLocalId, targetId, operationType, createdAt",
	resource_requests:
		"++localId, id, request_number, status, priority, requested_by, created_at, hasPendingWrites, pendingAction, lastLocalChange",
	resource_requests_queue:
		"++queueId, targetLocalId, targetId, operationType, createdAt",
});

// Version 16: Staff workload cache for Resource Allocation > Staff offline view
offlineCaseDb.version(16).stores({
	ciclcar_cases: "++localId, id, updated_at, case_manager, hasPendingWrites",
	ciclcar_queue:
		"++queueId, targetLocalId, targetId, operationType, createdAt",
	case_managers: "id, full_name",
	fac_cases:
		"++localId, id, updated_at, head_first_name, head_last_name, hasPendingWrites",
	fac_queue: "++queueId, targetLocalId, targetId, operationType, createdAt",
	far_cases:
		"++localId, id, date, receiving_member, assistance, hasPendingWrites",
	far_queue: "++queueId, targetLocalId, targetId, operationType, createdAt",
	ivac_cases:
		"++localId, id, updated_at, municipality, province, status, hasPendingWrites",
	ivac_queue: "++queueId, targetLocalId, targetId, operationType, createdAt",
	case_cases:
		"++localId, id, updated_at, identifying_name, case_manager, hasPendingWrites",
	case_queue: "++queueId, targetLocalId, targetId, operationType, createdAt",
	dashboard_cache: "++id, dashboardType, timestamp, data",
	dashboard_raw_data:
		"++id, dashboardType, timestamp, cases, ciclcar, fac, ivac",
	programs:
		"++localId, id, updated_at, program_name, status, hasPendingWrites",
	program_queue:
		"++queueId, targetLocalId, targetId, operationType, createdAt",
	program_enrollments:
		"++localId, id, program_id, enrollment_date, status, updated_at, hasPendingWrites",
	enrollment_queue:
		"++queueId, targetLocalId, targetId, operationType, createdAt",
	cached_vac_cases: "id, identifying_name, case_manager, status",
	cached_far_cases: "id, receiving_member, case_manager, status",
	service_delivery:
		"++localId, id, enrollment_id, program_id, service_date, hasPendingWrites, lastLocalChange",
	service_delivery_queue:
		"++queueId, targetLocalId, targetId, operationType, createdAt",
	partners:
		"++localId, id, organization_name, partnership_status, mou_expiry_date, hasPendingWrites, lastLocalChange",
	partners_queue:
		"++queueId, targetLocalId, targetId, operationType, createdAt",
	inventory_items:
		"++localId, id, item_name, category, status, hasPendingWrites, lastLocalChange",
	inventory_queue:
		"++queueId, targetLocalId, targetId, operationType, createdAt",
	resource_requests:
		"++localId, id, request_number, status, priority, requested_by, created_at, hasPendingWrites, pendingAction, lastLocalChange",
	resource_requests_queue:
		"++queueId, targetLocalId, targetId, operationType, createdAt",
	staff_workload_cache: "++cacheId, staff_name, case_manager, cached_at",
});

// Version 17: Add Single Parent cases offline cache + queue
offlineCaseDb.version(17).stores({
	ciclcar_cases: "++localId, id, updated_at, case_manager, hasPendingWrites",
	ciclcar_queue:
		"++queueId, targetLocalId, targetId, operationType, createdAt",
	case_managers: "id, full_name",
	fac_cases:
		"++localId, id, updated_at, head_first_name, head_last_name, hasPendingWrites",
	fac_queue: "++queueId, targetLocalId, targetId, operationType, createdAt",
	far_cases:
		"++localId, id, date, receiving_member, assistance, hasPendingWrites",
	far_queue: "++queueId, targetLocalId, targetId, operationType, createdAt",
	ivac_cases:
		"++localId, id, updated_at, municipality, province, status, hasPendingWrites",
	ivac_queue: "++queueId, targetLocalId, targetId, operationType, createdAt",
	case_cases:
		"++localId, id, updated_at, identifying_name, case_manager, hasPendingWrites",
	case_queue: "++queueId, targetLocalId, targetId, operationType, createdAt",
	sp_cases:
		"++localId, id, updated_at, full_name, case_manager, hasPendingWrites",
	sp_queue: "++queueId, targetLocalId, targetId, operationType, createdAt",
	dashboard_cache: "++id, dashboardType, timestamp, data",
	dashboard_raw_data:
		"++id, dashboardType, timestamp, cases, ciclcar, fac, ivac",
	programs:
		"++localId, id, updated_at, program_name, status, hasPendingWrites",
	program_queue:
		"++queueId, targetLocalId, targetId, operationType, createdAt",
	program_enrollments:
		"++localId, id, program_id, enrollment_date, status, updated_at, hasPendingWrites",
	enrollment_queue:
		"++queueId, targetLocalId, targetId, operationType, createdAt",
	cached_vac_cases: "id, identifying_name, case_manager, status",
	cached_far_cases: "id, receiving_member, case_manager, status",
	service_delivery:
		"++localId, id, enrollment_id, program_id, service_date, hasPendingWrites, lastLocalChange",
	service_delivery_queue:
		"++queueId, targetLocalId, targetId, operationType, createdAt",
	partners:
		"++localId, id, organization_name, partnership_status, mou_expiry_date, hasPendingWrites, lastLocalChange",
	partners_queue:
		"++queueId, targetLocalId, targetId, operationType, createdAt",
	inventory_items:
		"++localId, id, item_name, category, status, hasPendingWrites, lastLocalChange",
	inventory_queue:
		"++queueId, targetLocalId, targetId, operationType, createdAt",
	resource_requests:
		"++localId, id, request_number, status, priority, requested_by, created_at, hasPendingWrites, pendingAction, lastLocalChange",
	resource_requests_queue:
		"++queueId, targetLocalId, targetId, operationType, createdAt",
	staff_workload_cache: "++cacheId, staff_name, case_manager, cached_at",
});

// Version 18: Add Financial Assistance cases offline cache + queue
offlineCaseDb.version(18).stores({
	ciclcar_cases: "++localId, id, updated_at, case_manager, hasPendingWrites",
	ciclcar_queue:
		"++queueId, targetLocalId, targetId, operationType, createdAt",
	case_managers: "id, full_name",
	fac_cases:
		"++localId, id, updated_at, head_first_name, head_last_name, hasPendingWrites",
	fac_queue: "++queueId, targetLocalId, targetId, operationType, createdAt",
	far_cases:
		"++localId, id, date, receiving_member, assistance, hasPendingWrites",
	far_queue: "++queueId, targetLocalId, targetId, operationType, createdAt",
	ivac_cases:
		"++localId, id, updated_at, municipality, province, status, hasPendingWrites",
	ivac_queue: "++queueId, targetLocalId, targetId, operationType, createdAt",
	case_cases:
		"++localId, id, updated_at, identifying_name, case_manager, hasPendingWrites",
	case_queue: "++queueId, targetLocalId, targetId, operationType, createdAt",
	sp_cases:
		"++localId, id, updated_at, full_name, case_manager, hasPendingWrites",
	sp_queue: "++queueId, targetLocalId, targetId, operationType, createdAt",
	fa_cases:
		"++localId, id, updated_at, client_name, case_manager, hasPendingWrites",
	fa_queue: "++queueId, targetLocalId, targetId, operationType, createdAt",
	dashboard_cache: "++id, dashboardType, timestamp, data",
	dashboard_raw_data:
		"++id, dashboardType, timestamp, cases, ciclcar, fac, ivac",
	programs:
		"++localId, id, updated_at, program_name, status, hasPendingWrites",
	program_queue:
		"++queueId, targetLocalId, targetId, operationType, createdAt",
	program_enrollments:
		"++localId, id, program_id, enrollment_date, status, updated_at, hasPendingWrites",
	enrollment_queue:
		"++queueId, targetLocalId, targetId, operationType, createdAt",
	cached_vac_cases: "id, identifying_name, case_manager, status",
	cached_far_cases: "id, receiving_member, case_manager, status",
	service_delivery:
		"++localId, id, enrollment_id, program_id, service_date, hasPendingWrites, lastLocalChange",
	service_delivery_queue:
		"++queueId, targetLocalId, targetId, operationType, createdAt",
	partners:
		"++localId, id, organization_name, partnership_status, mou_expiry_date, hasPendingWrites, lastLocalChange",
	partners_queue:
		"++queueId, targetLocalId, targetId, operationType, createdAt",
	inventory_items:
		"++localId, id, item_name, category, status, hasPendingWrites, lastLocalChange",
	inventory_queue:
		"++queueId, targetLocalId, targetId, operationType, createdAt",
	resource_requests:
		"++localId, id, request_number, status, priority, requested_by, created_at, hasPendingWrites, pendingAction, lastLocalChange",
	resource_requests_queue:
		"++queueId, targetLocalId, targetId, operationType, createdAt",
	staff_workload_cache: "++cacheId, staff_name, case_manager, cached_at",
});

// Version 19: Add Persons with Disabilities cases offline cache + queue
offlineCaseDb.version(19).stores({
	ciclcar_cases: "++localId, id, updated_at, case_manager, hasPendingWrites",
	ciclcar_queue:
		"++queueId, targetLocalId, targetId, operationType, createdAt",
	case_managers: "id, full_name",
	fac_cases:
		"++localId, id, updated_at, head_first_name, head_last_name, hasPendingWrites",
	fac_queue: "++queueId, targetLocalId, targetId, operationType, createdAt",
	far_cases:
		"++localId, id, date, receiving_member, assistance, hasPendingWrites",
	far_queue: "++queueId, targetLocalId, targetId, operationType, createdAt",
	ivac_cases:
		"++localId, id, updated_at, municipality, province, status, hasPendingWrites",
	ivac_queue: "++queueId, targetLocalId, targetId, operationType, createdAt",
	case_cases:
		"++localId, id, updated_at, identifying_name, case_manager, hasPendingWrites",
	case_queue: "++queueId, targetLocalId, targetId, operationType, createdAt",
	sp_cases:
		"++localId, id, updated_at, full_name, case_manager, hasPendingWrites",
	sp_queue: "++queueId, targetLocalId, targetId, operationType, createdAt",
	fa_cases:
		"++localId, id, updated_at, client_name, case_manager, hasPendingWrites",
	fa_queue: "++queueId, targetLocalId, targetId, operationType, createdAt",
	pwd_cases:
		"++localId, id, updated_at, last_name, first_name, case_manager, hasPendingWrites",
	pwd_queue: "++queueId, targetLocalId, targetId, operationType, createdAt",
	dashboard_cache: "++id, dashboardType, timestamp, data",
	dashboard_raw_data:
		"++id, dashboardType, timestamp, cases, ciclcar, fac, ivac, sp, fa, pwd",
	programs:
		"++localId, id, updated_at, program_name, status, hasPendingWrites",
	program_queue:
		"++queueId, targetLocalId, targetId, operationType, createdAt",
	program_enrollments:
		"++localId, id, program_id, enrollment_date, status, updated_at, hasPendingWrites",
	enrollment_queue:
		"++queueId, targetLocalId, targetId, operationType, createdAt",
	cached_vac_cases: "id, identifying_name, case_manager, status",
	cached_far_cases: "id, receiving_member, case_manager, status",
	service_delivery:
		"++localId, id, enrollment_id, program_id, service_date, hasPendingWrites, lastLocalChange",
	service_delivery_queue:
		"++queueId, targetLocalId, targetId, operationType, createdAt",
	partners:
		"++localId, id, organization_name, partnership_status, mou_expiry_date, hasPendingWrites, lastLocalChange",
	partners_queue:
		"++queueId, targetLocalId, targetId, operationType, createdAt",
	inventory_items:
		"++localId, id, item_name, category, status, hasPendingWrites, lastLocalChange",
	inventory_queue:
		"++queueId, targetLocalId, targetId, operationType, createdAt",
	resource_requests:
		"++localId, id, request_number, status, priority, requested_by, created_at, hasPendingWrites, pendingAction, lastLocalChange",
	resource_requests_queue:
		"++queueId, targetLocalId, targetId, operationType, createdAt",
	staff_workload_cache: "++cacheId, staff_name, case_manager, cached_at",
});

export default offlineCaseDb;
