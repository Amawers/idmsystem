import { Router } from "express";
import { authenticate } from "../../middleware/authMiddleware.js";
import { validateRequest } from "../../middleware/validateRequest.js";
import { tableQuerySchema } from "./table.validators.js";
import { TableController } from "./table.controller.js";

const router = Router();

router.post("/query", authenticate, validateRequest(tableQuerySchema), TableController.handle);

export default router;
