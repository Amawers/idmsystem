import { Router } from "express";
import { authenticate, authorize } from "../../middleware/authMiddleware.js";
import { validateRequest } from "../../middleware/validateRequest.js";
import { AuditController } from "./audit.controller.js";
import { createAuditSchema, listAuditSchema } from "./audit.validators.js";

const router = Router();

router.get("/", authenticate, authorize(["admin", "executive", "program_manager"]), validateRequest(listAuditSchema), AuditController.list);
router.post("/", authenticate, validateRequest(createAuditSchema), AuditController.create);

export default router;
