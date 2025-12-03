import pino from "pino";
import { env, isDev } from "./env.js";

export const logger = pino({
	level: isDev ? "debug" : "info",
	formatters: {
		level(label) {
			return { level: label };
		},
	},
	transport: isDev
		? {
			target: "pino-pretty",
			options: {
				colorize: true,
				translateTime: "SYS:standard",
			},
		}
		: undefined,
});
