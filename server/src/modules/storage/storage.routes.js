import { Router } from "express";
import { authenticate } from "../../middleware/authMiddleware.js";
import { validateRequest } from "../../middleware/validateRequest.js";
import { StorageController } from "./storage.controller.js";
import { signedUrlSchema } from "./storage.validators.js";

const router = Router();

router.post("/signed-url", authenticate, validateRequest(signedUrlSchema), StorageController.createSignedUrl);

export default router;
