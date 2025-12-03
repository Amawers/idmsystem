import http from "node:http";

import app from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./config/logger.js";
import { initRealtime } from "./config/realtime.js";
import { pool } from "./config/database.js";

const server = http.createServer(app);
initRealtime(server, env.CLIENT_URL);

server.listen(env.PORT, () => {
	logger.info(`API listening on ${env.PORT}`);
});

const gracefulShutdown = async () => {
	logger.info("Shutting down server");
	server.close(async () => {
		await pool.end();
		process.exit(0);
	});
};

process.on("SIGINT", gracefulShutdown);
process.on("SIGTERM", gracefulShutdown);
