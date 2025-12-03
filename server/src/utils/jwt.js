import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

export function signAccessToken(payload, options = {}) {
	return jwt.sign(payload, env.JWT_SECRET, {
		expiresIn: env.ACCESS_TOKEN_TTL,
		...options,
	});
}

export function signRefreshToken(payload, options = {}) {
	return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
		expiresIn: env.REFRESH_TOKEN_TTL,
		...options,
	});
}

export function verifyAccessToken(token) {
	return jwt.verify(token, env.JWT_SECRET);
}

export function verifyRefreshToken(token) {
	return jwt.verify(token, env.JWT_REFRESH_SECRET);
}
