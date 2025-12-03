import { Server } from "socket.io";
import { logger } from "./logger.js";

let ioInstance;

export function initRealtime(server, clientUrl) {
	ioInstance = new Server(server, {
		path: "/realtime",
		cors: {
			origin: clientUrl,
			methods: ["GET", "POST"],
			credentials: true,
		},
	});

	ioInstance.on("connection", (socket) => {
		logger.info({ socketId: socket.id }, "Realtime client connected");

		socket.on("disconnect", (reason) => {
			logger.info({ socketId: socket.id, reason }, "Realtime client disconnected");
		});
	});

	return ioInstance;
}

export function getRealtime() {
	if (!ioInstance) {
		throw new Error("Realtime server not initialized yet");
	}
	return ioInstance;
}

export function broadcastTableChange({ table, event, payload }) {
	try {
		getRealtime().emit("postgres_changes", { table, event, payload });
	} catch (error) {
		logger.error({ error }, "Failed to broadcast realtime event");
	}
}
