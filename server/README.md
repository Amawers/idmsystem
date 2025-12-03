# IDMS Backend (Express + PostgreSQL)

This folder hosts the standalone backend that replaces the previous Supabase-hosted services with an Express.js + node-postgresql stack. The backend exposes a REST API plus Socket.IO real-time channels that the React client can consume without direct database access.

## Highlights

- **Tech stack**: Express 4, PostgreSQL (`pg`), Socket.IO for realtime, Zod for validation, JWT auth, Multer for avatar uploads, Pino for logging.
- **Database schema**: Reuses the exact tables defined in `databaseContext.md`, `database/migrations`, and `supabase/migrations`. Run them through the migration runner to bootstrap a fresh Postgres instance.
- **Auth**: Local email/password with salted hashes (`bcryptjs`), short-lived access tokens + refresh tokens, session revocation via database table.
- **Storage**: Avatars and other binary files stored on disk (or pluggable S3 adapter) behind signed URLs.
- **Realtime**: Socket.IO namespaces that broadcast table mutation events so the UI widgets relying on Supabase `channel()` can still react to live updates.
- **Abstraction layer**: Instead of exposing raw tables, the backend validates every query against a registry of allowlisted tables/columns so the React client can keep calling `supabase.from(...).select()` via a custom adapter without rewriting 200+ files.

## Project layout

```
server/
  src/
    app.js                # Express instance wiring
    server.js             # HTTP + Socket.IO bootstrapper
    config/
      env.js             # Environment loader + schema
      database.js        # pg Pool and helper utilities
      logger.js          # Pino logger factory
      realtime.js        # Socket.IO event hub
      tableRegistry.js   # Metadata for allowlisted tables/columns
    middleware/
      authMiddleware.js
      errorHandler.js
      requestLogger.js
      validateRequest.js
    modules/
      auth/
        auth.controller.js
        auth.routes.js
        auth.service.js
        auth.validators.js
      profiles/
        profile.controller.js
        profile.routes.js
        profile.service.js
      tables/
        table.controller.js
        table.service.js
        table.validators.js
      storage/
        storage.controller.js
        storage.routes.js
    utils/
      crypto.js          # password helpers
      jwt.js             # sign/verify tokens
      responses.js       # standard API responses
  scripts/
    run-migrations.js    # Sequential migration runner that reuses existing SQL files
  migrations/
    000_init_auth.sql    # Local auth tables (users, sessions)
```

## Getting started

1. Copy `.env.example` to `.env` and tweak values.
2. Ensure PostgreSQL is running and accessible via `DATABASE_URL`.
3. Run `npm install`.
4. Apply schema: `npm run migrate`. The migration runner executes `server/migrations` first, then replays every SQL file found inside `../database/migrations` and `../supabase/migrations`, so the backend matches the Supabase schema 1:1.
5. Start the API: `npm run dev` (nodemon) or `npm start`.

## API overview

| Area      | Description |
|-----------|-------------|
| `/auth`   | Signup, login, refresh, logout, password reset/update, session inspection.
| `/profiles` | Fetch/update profile metadata, avatar upload, role management, audit logging.
| `/storage` | Signed upload/download URLs plus direct file streaming.
| `/db/query` | Safely executes select/insert/update/delete actions against allowlisted tables using the Supabase-compatible JSON payload emitted by the custom frontend adapter.
| `/rpc/:fn` | Implements the handful of stored procedures previously called through Supabase (`refresh_program_success_rate`, etc.).
| `/realtime` | Socket.IO namespace powering `.channel()` subscriptions on the frontend adapter.

Refer to inline JSDoc in each module plus `IMPLEMENTATION_SUMMARY.md` for higher-level reasoning.
