export const success = (res, data, meta) =>
	res.status(200).json({ data, meta });

export const created = (res, data, meta) =>
	res.status(201).json({ data, meta });

export const noContent = (res) => res.status(204).send();

export const fail = (res, statusCode, message, details) =>
	res.status(statusCode).json({ error: { message, details } });
