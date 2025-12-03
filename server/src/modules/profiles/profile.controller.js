import path from "node:path";
import fs from "node:fs/promises";

import { getProfileById, updateProfile } from "./profile.service.js";
import { env } from "../../config/env.js";
import { success, fail } from "../../utils/responses.js";

export const ProfileController = {
	async me(req, res) {
		const profile = await getProfileById(req.user.sub);
		return success(res, profile);
	},

	async update(req, res) {
		const data = req.validated.body;
		const profile = await updateProfile(req.user.sub, data);
		return success(res, profile);
	},

	async uploadAvatar(req, res) {
		const file = req.file;
		if (!file) {
			return fail(res, 400, "No file uploaded");
		}

		const ext = path.extname(file.originalname);
		const filename = `${req.user.sub}_avatar${ext}`;
		const uploadPath = path.resolve(env.UPLOAD_DIR, "avatars");
		await fs.mkdir(uploadPath, { recursive: true });

		const finalPath = path.join(uploadPath, filename);
		await fs.rename(file.path, finalPath);

		const relativePath = path.relative(path.resolve(env.UPLOAD_DIR), finalPath);
		const avatarUrl = `/uploads/${relativePath.replace(/\\/g, "/")}`;

		const profile = await updateProfile(req.user.sub, { avatar_url: avatarUrl });
		return success(res, profile);
	},
};
