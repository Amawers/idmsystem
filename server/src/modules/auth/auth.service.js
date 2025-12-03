import { randomUUID } from "node:crypto";
import { add } from "date-fns";

import { query, withTransaction } from "../../config/database.js";
import { hashPassword, comparePassword } from "../../utils/crypto.js";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../../utils/jwt.js";
import { env } from "../../config/env.js";

export async function findUserByEmail(email) {
	const { rows } = await query(
		"SELECT id, email, password_hash, role, status FROM auth.users WHERE email = $1",
		[email]
	);
	return rows[0] ?? null;
}

export async function findUserById(id) {
	const { rows } = await query(
		"SELECT id, email, role, status FROM auth.users WHERE id = $1",
		[id]
	);
	return rows[0] ?? null;
}

export async function registerUser({ email, password, role = "case_manager", fullName, createdBy }) {
	return withTransaction(async (client) => {
		const passwordHash = await hashPassword(password);

		const { rows } = await client.query(
			`INSERT INTO auth.users (email, password_hash, role, created_by)
			 VALUES ($1, $2, $3, $4)
			 RETURNING id, email, role, status`,
			[email, passwordHash, role, createdBy ?? null]
		);

		const user = rows[0];

		await client.query(
			`INSERT INTO profile (id, full_name, email, role, created_by)
			 VALUES ($1, $2, $3, $4, $5)
			 ON CONFLICT (id) DO NOTHING`,
			[user.id, fullName ?? null, user.email, role, createdBy ?? user.id]
		);

		return user;
	});
}

export async function verifyCredentials(email, password) {
	const user = await findUserByEmail(email);
	if (!user) return null;

	const valid = await comparePassword(password, user.password_hash);
	if (!valid) return null;

	return user;
}

export async function issueTokens({ userId, role, email, ipAddress, userAgent }) {
	const tokenId = randomUUID();
	const accessToken = signAccessToken({ sub: userId, role, email, tid: tokenId });
	const refreshToken = signRefreshToken({ sub: userId, role, email, tid: tokenId });

	// Compute refresh expiry based on env string (e.g., 7d)
	const expiresAt = computeExpiry(env.REFRESH_TOKEN_TTL);

	await query(
		`INSERT INTO auth.refresh_tokens (id, user_id, token_hash, expires_at, ip_address, user_agent)
		 VALUES ($1, $2, crypt($3, gen_salt('bf')), $4, $5, $6)`,
		[tokenId, userId, refreshToken, expiresAt, ipAddress ?? null, userAgent ?? null]
	);

	await query("UPDATE auth.users SET last_sign_in_at = NOW() WHERE id = $1", [userId]);

	return { accessToken, refreshToken, tokenId, expiresAt };
}

function computeExpiry(interval) {
	const unit = interval.slice(-1);
	const value = Number(interval.slice(0, -1));
	const now = new Date();

	switch (unit) {
		case "m":
			return add(now, { minutes: value });
		case "h":
			return add(now, { hours: value });
		case "d":
			return add(now, { days: value });
		default:
			return add(now, { hours: 24 });
	}
}

export async function revokeSession(tokenId) {
	await query(
		"UPDATE auth.refresh_tokens SET revoked_at = NOW() WHERE id = $1",
		[tokenId]
	);
}

export async function refreshTokens(refreshToken, context = {}) {
	const payload = verifyRefreshToken(refreshToken);

	const { rows } = await query(
		`SELECT id, user_id, token_hash, revoked_at, expires_at
		 FROM auth.refresh_tokens
		 WHERE id = $1`,
		[payload.tid]
	);

	const session = rows[0];
	if (!session || session.revoked_at) {
		throw new Error("Session revoked or not found");
	}

	if (new Date(session.expires_at) < new Date()) {
		await revokeSession(session.id);
		throw new Error("Refresh token expired");
	}

	const { rows: comparison } = await query(
		"SELECT crypt($1, token_hash) = token_hash AS is_valid FROM auth.refresh_tokens WHERE id = $2",
		[refreshToken, session.id]
	);

	if (!comparison[0]?.is_valid) {
		await revokeSession(session.id);
		throw new Error("Refresh token invalid");
	}

	const user = await findUserById(session.user_id);
	if (!user) {
		throw new Error("User not found");
	}

	await revokeSession(session.id);

	return issueTokens({
		userId: user.id,
		role: user.role,
		email: user.email,
		ipAddress: context.ipAddress,
		userAgent: context.userAgent,
	});
}
