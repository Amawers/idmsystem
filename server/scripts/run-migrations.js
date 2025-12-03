import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { pool } from "../src/config/database.js";
import { logger } from "../src/config/logger.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const migrationDirs = [
	path.resolve(__dirname, "../migrations"),
	path.resolve(__dirname, "../../database/migrations"),
	path.resolve(__dirname, "../../supabase/migrations"),
];

async function getSqlFiles(dir) {
	try {
		const entries = await fs.readdir(dir);
		return entries
			.filter((file) => file.endsWith(".sql"))
			.sort()
			.map((file) => path.join(dir, file));
	} catch (error) {
		if (error.code === "ENOENT") {
			return [];
		}
		throw error;
	}
}

async function run() {
	for (const dir of migrationDirs) {
		const files = await getSqlFiles(dir);
		for (const file of files) {
			const sql = await fs.readFile(file, "utf8");
			logger.info(`Running migration ${file}`);
			await pool.query(sql);
		}
	}
	logger.info("Migrations completed");
	await pool.end();
}

run().catch((error) => {
	logger.error({ error }, "Migration failed");
	process.exitCode = 1;
});
