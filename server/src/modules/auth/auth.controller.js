import {
	findUserByEmail,
	registerUser,
	verifyCredentials,
	issueTokens,
	refreshTokens,
	revokeSession,
} from "./auth.service.js";
import { success, created, fail } from "../../utils/responses.js";
import { hashPassword, comparePassword } from "../../utils/crypto.js";
import { query } from "../../config/database.js";

export const AuthController = {
	async login(req, res) {
		const { email, password } = req.validated.body;
		const user = await verifyCredentials(email, password);

		if (!user) {
			return fail(res, 401, "Invalid credentials");
		}

		if (user.status !== "active") {
			return fail(res, 403, "Account disabled");
		}

		const tokens = await issueTokens({
			userId: user.id,
			role: user.role,
			email: user.email,
			ipAddress: req.ip,
			userAgent: req.headers["user-agent"],
		});

		return success(res, { user: { id: user.id, email: user.email, role: user.role }, ...tokens });
	},

	async register(req, res) {
		const { email, password, role, fullName } = req.validated.body;

		const existing = await findUserByEmail(email);
		if (existing) {
			return fail(res, 409, "Email already in use");
		}

		const user = await registerUser({
			email,
			password,
			role,
			fullName,
			createdBy: req.user?.sub,
		});

		return created(res, user);
	},

	async refresh(req, res) {
		const { refreshToken } = req.validated.body;
		try {
			const tokens = await refreshTokens(refreshToken, {
				ipAddress: req.ip,
				userAgent: req.headers["user-agent"],
			});
			return success(res, tokens);
		} catch (error) {
			return fail(res, 401, error.message);
		}
	},

	async logout(req, res) {
		const tokenId = req.user?.tid;
		if (tokenId) {
			await revokeSession(tokenId);
		}
		return success(res, { message: "Logged out" });
	},

	async getSession(req, res) {
		if (!req.user) {
			return fail(res, 401, "Not authenticated");
		}

		const { rows } = await query(
			`SELECT p.id, p.full_name, p.email, p.role, p.avatar_url
			 FROM profile p
			 WHERE p.id = $1`,
			[req.user.sub]
		);

		return success(res, {
			user: {
				id: req.user.sub,
				email: req.user.email,
				role: req.user.role,
				profile: rows[0] ?? null,
			},
		});
	},

	async updatePassword(req, res) {
		const { oldPassword, newPassword } = req.validated.body;
		const userId = req.user.sub;

		const { rows } = await query(
			"SELECT password_hash FROM auth.users WHERE id = $1",
			[userId]
		);

		const current = rows[0];
		if (!current) {
			return fail(res, 404, "User not found");
		}

		const matches = await comparePassword(oldPassword, current.password_hash);
		if (!matches) {
			return fail(res, 400, "Old password incorrect");
		}

		const hash = await hashPassword(newPassword);
		await query("UPDATE auth.users SET password_hash = $1 WHERE id = $2", [hash, userId]);

		return success(res, { message: "Password updated" });
	},
};
