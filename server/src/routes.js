import { Router } from "express";
import authRoutes from "./modules/auth/auth.routes.js";
import profileRoutes from "./modules/profiles/profile.routes.js";
import tableRoutes from "./modules/tables/table.routes.js";
import storageRoutes from "./modules/storage/storage.routes.js";
import auditRoutes from "./modules/audit/audit.routes.js";

export const router = Router();

router.use("/auth", authRoutes);
router.use("/profiles", profileRoutes);
router.use("/storage", storageRoutes);
router.use("/db", tableRoutes);
router.use("/audit", auditRoutes);

router.get("/health", (req, res) => {
	res.json({ status: "ok", timestamp: new Date().toISOString() });
});
