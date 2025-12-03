import { config } from "dotenv";
import { z } from "zod";

config();

const envSchema = z.object({
	NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
	PORT: z.coerce.number().default(4000),
	APP_URL: z.string().url().default("http://localhost:4000"),
	CLIENT_URL: z.string().url().default("http://localhost:5173"),
	DATABASE_URL: z.string().url(),
	DB_POOL_MIN: z.coerce.number().default(2),
	DB_POOL_MAX: z.coerce.number().default(10),
	JWT_SECRET: z.string().min(32),
	JWT_REFRESH_SECRET: z.string().min(32),
	ACCESS_TOKEN_TTL: z.string().default("15m"),
	REFRESH_TOKEN_TTL: z.string().default("7d"),
	UPLOAD_DIR: z.string().default("./storage/uploads"),
	AVATAR_MAX_SIZE_MB: z.coerce.number().default(5),
});

export const env = envSchema.parse(process.env);
export const isDev = env.NODE_ENV === "development";
