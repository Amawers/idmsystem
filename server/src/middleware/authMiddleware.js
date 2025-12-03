import { verifyAccessToken } from "../utils/jwt.js";
import { fail } from "../utils/responses.js";

export function authenticate(req, res, next) {
	const header = req.headers.authorization;
	if (!header || !header.startsWith("Bearer ")) {
		return fail(res, 401, "Authentication required");
	}

	const token = header.replace("Bearer ", "");
	try {
		const payload = verifyAccessToken(token);
		req.user = payload;
		return next();
	} catch (error) {
		return fail(res, 401, "Invalid or expired token");
	}
}

export function authorize(allowedRoles = []) {
	return (req, res, next) => {
		if (!req.user) {
			return fail(res, 401, "Authentication required");
		}

		if (allowedRoles.length && !allowedRoles.includes(req.user.role)) {
			return fail(res, 403, "Insufficient permissions");
		}

		next();
	};
}
