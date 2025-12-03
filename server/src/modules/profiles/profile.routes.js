import { Router } from "express";
import multer from "multer";
import path from "node:path";
import fs from "node:fs/promises";

import { authenticate } from "../../middleware/authMiddleware.js";
import { validateRequest } from "../../middleware/validateRequest.js";
import { ProfileController } from "./profile.controller.js";
import { profileUpdateSchema } from "./profile.validators.js";
import { env } from "../../config/env.js";

const router = Router();

const uploadDir = path.resolve(env.UPLOAD_DIR, "tmp");
await fs.mkdir(uploadDir, { recursive: true });

const upload = multer({
	dest: uploadDir,
	limits: { fileSize: env.AVATAR_MAX_SIZE_MB * 1024 * 1024 },
});

router.get("/me", authenticate, ProfileController.me);
router.patch(
	"/me",
	authenticate,
	validateRequest(profileUpdateSchema),
	ProfileController.update
);
router.post(
	"/me/avatar",
	authenticate,
	upload.single("avatar"),
	ProfileController.uploadAvatar
);

export default router;
