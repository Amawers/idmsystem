import { query } from "./database.js";

const overrides = {
	case: {
		searchable: ["identifying_name", "identifying_alias", "case_manager"],
		defaultOrder: { column: "updated_at", direction: "desc" },
	},
	ciclcar_case: {
		searchable: ["profile_name", "profile_alias", "case_manager"],
	},
	fac_case: {
		searchable: ["head_first_name", "head_last_name", "case_manager"],
		defaultOrder: { column: "created_at", direction: "desc" },
	},
	far_case: {
		searchable: ["receiving_member", "case_manager"],
		defaultOrder: { column: "date", direction: "desc" },
	},
	ivac_cases: {
		searchable: ["victim_name", "case_manager", "incident_type"],
		defaultOrder: { column: "incident_date", direction: "desc" },
	},
	programs: {
		searchable: ["program_name", "program_type"],
	},
	program_enrollments: {
		searchable: ["beneficiary_name", "case_number"],
	},
	service_delivery: {
		searchable: ["service_type", "case_number"],
	},
	inventory_items: {
		searchable: ["item_name", "item_code"],
		defaultOrder: { column: "item_name", direction: "asc" },
	},
	resource_requests: {
		searchable: ["request_number", "requested_by_name"],
	},
	partners: {
		searchable: ["partner_name", "contact_person", "contact_email"],
		defaultOrder: { column: "partner_name", direction: "asc" },
	},
};

const metadataCache = new Map();
let allowedTablesPromise;

async function loadAllowedTables() {
	if (!allowedTablesPromise) {
		allowedTablesPromise = (async () => {
			const { rows } = await query(
				`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`
			);
			return new Set(rows.map((row) => row.table_name));
		})();
	}
	return allowedTablesPromise;
}

export async function getTableMetadata(table) {
	const allowedTables = await loadAllowedTables();
	if (!allowedTables.has(table)) {
		throw new Error(`Table ${table} is not allowlisted`);
	}

	if (metadataCache.has(table)) {
		return metadataCache.get(table);
	}

	const { rows } = await query(
		`SELECT column_name FROM information_schema.columns
		 WHERE table_schema = 'public' AND table_name = $1`,
		[table]
	);

	if (!rows.length) {
		throw new Error(`Could not find columns for table ${table}`);
	}

	const columns = rows.map((row) => row.column_name);
	const override = overrides[table] ?? {};
	const metadata = {
		table,
		columns,
		searchable: override.searchable ?? columns,
		defaultOrder: resolveDefaultOrder(columns, override.defaultOrder),
	};

	metadataCache.set(table, metadata);
	return metadata;
}

function resolveDefaultOrder(columns, override) {
	if (override) return override;
	if (columns.includes("updated_at")) {
		return { column: "updated_at", direction: "desc" };
	}
	if (columns.includes("created_at")) {
		return { column: "created_at", direction: "desc" };
	}
	return { column: columns[0], direction: "asc" };
}
