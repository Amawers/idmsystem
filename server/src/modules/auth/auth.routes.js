import { Router } from "express";
import { AuthController } from "./auth.controller.js";
import { validateRequest } from "../../middleware/validateRequest.js";
import { authenticate, authorize } from "../../middleware/authMiddleware.js";
import {
	loginSchema,
	registerSchema,
	refreshSchema,
	passwordUpdateSchema,
} from "./auth.validators.js";

const router = Router();

router.post("/login", validateRequest(loginSchema), AuthController.login);
router.post("/register", authenticate, authorize(["admin"]), validateRequest(registerSchema), AuthController.register);
router.post("/refresh", validateRequest(refreshSchema), AuthController.refresh);
router.post("/logout", authenticate, AuthController.logout);
router.get("/session", authenticate, AuthController.getSession);
router.post(
	"/password",
	authenticate,
	validateRequest(passwordUpdateSchema),
	AuthController.updatePassword
);

export default router;
