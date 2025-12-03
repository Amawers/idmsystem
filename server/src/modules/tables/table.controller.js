import { executeQuery } from "./table.service.js";
import { success } from "../../utils/responses.js";

export const TableController = {
	async handle(req, res) {
		const { body } = req.validated;
		const result = await executeQuery(body);
		return success(res, result.rows, result.meta);
	},
};
