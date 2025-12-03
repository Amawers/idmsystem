export function validateRequest(schema) {
	return async (req, res, next) => {
		try {
			const parsed = await schema.parseAsync({
				body: req.body,
				query: req.query,
				params: req.params,
				files: req.files,
			});

			req.validated = parsed;
			next();
		} catch (error) {
			return res.status(422).json({
				error: {
					message: "Validation failed",
					details: error.errors ?? error.message,
				},
			});
		}
	};
}
