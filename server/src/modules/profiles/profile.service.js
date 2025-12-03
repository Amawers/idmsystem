import { query } from "../../config/database.js";

export async function getProfileById(id) {
	const { rows } = await query(
		`SELECT id, full_name, email, role, avatar_url, status
		 FROM profile
		 WHERE id = $1`,
		[id]
	);
	return rows[0] ?? null;
}

export async function updateProfile(id, data) {
	const fields = [];
	const values = [];
	let idx = 1;

	Object.entries(data).forEach(([key, value]) => {
		fields.push(`${key} = $${idx}`);
		values.push(value);
		idx += 1;
	});

	if (!fields.length) {
		throw new Error("No fields provided for update");
	}

	values.push(id);
	const sql = `UPDATE profile SET ${fields.join(", ")}, updated_at = NOW() WHERE id = $${idx} RETURNING *`;
	const { rows } = await query(sql, values);
	return rows[0];
}
