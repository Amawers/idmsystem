import { performance } from "node:perf_hooks";
import { logger } from "../config/logger.js";

export function requestLogger(req, res, next) {
	const start = performance.now();
	res.on("finish", () => {
		const duration = (performance.now() - start).toFixed(1);
		logger.info({
			method: req.method,
			path: req.originalUrl,
			status: res.statusCode,
			duration,
		}, "HTTP request");
	});
	next();
}
