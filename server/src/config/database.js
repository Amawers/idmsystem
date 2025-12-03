import pg from "pg";
import { env, isDev } from "./env.js";
import { logger } from "./logger.js";

const { Pool } = pg;

export const pool = new Pool({
	connectionString: env.DATABASE_URL,
	max: env.DB_POOL_MAX,
	min: env.DB_POOL_MIN,
	ssl: env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
});

pool.on("error", (error) => {
	logger.error({ error }, "Unexpected database error");
});

export async function withTransaction(work) {
	const client = await pool.connect();
	try {
		await client.query("BEGIN");
		const result = await work(client);
		await client.query("COMMIT");
		return result;
	} catch (error) {
		await client.query("ROLLBACK");
		throw error;
	} finally {
		client.release();
	}
}

export async function query(text, params = []) {
	if (isDev) {
		logger.debug({ text, params }, "SQL query");
	}
	return pool.query(text, params);
}
