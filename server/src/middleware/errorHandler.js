import { logger } from "../config/logger.js";

export function errorHandler(err, req, res, next) {
	logger.error({ err }, "Unhandled error");

	if (res.headersSent) {
		return next(err);
	}

	const status = err.status || err.statusCode || 500;
	const message = err.message || "Something went wrong";
	const details = err.details || undefined;

	res.status(status).json({ error: { message, details } });
}
