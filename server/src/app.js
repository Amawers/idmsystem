import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import cookieParser from "cookie-parser";
import path from "node:path";

import { env } from "./config/env.js";
import { requestLogger } from "./middleware/requestLogger.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { router } from "./routes.js";

const app = express();

app.use(helmet());
app.use(
	cors({
		origin: env.CLIENT_URL,
		credentials: true,
	})
);
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(compression());
app.use(requestLogger);

app.use("/uploads", express.static(path.resolve(env.UPLOAD_DIR)));
app.use("/api", router);

app.use((req, res) => {
	res.status(404).json({ error: { message: "Route not found" } });
});

app.use(errorHandler);

export default app;
