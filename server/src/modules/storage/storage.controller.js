import { env } from "../../config/env.js";
import { success } from "../../utils/responses.js";

export const StorageController = {
	createSignedUrl(req, res) {
		const { filePath } = req.validated.body;
		const sanitized = filePath.replace(/\.\.+/g, "");
		const signedUrl = new URL(`/uploads/${sanitized}`, env.APP_URL).toString();
		return success(res, { signedUrl, expiresIn: 3600 });
	},
};
