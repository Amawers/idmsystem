# IDM System - Copilot Instructions

## Architecture Overview
This is a React-based ID Management System for case intake and management, built with Vite, Tailwind CSS, and Supabase backend.

### Key Technologies
```instructions
# IDM System - Copilot Instructions (project-specific)

## Quick summary
React + Vite frontend (React 19) with Tailwind UI, Supabase backend. Core flows are user auth/profile, multi-step intake forms (several flavors), and case tables with drag-and-drop ordering.

## Important commands (from `package.json`)
- npm run dev — start Vite dev server
- npm run build — production build
- npm run preview — preview production build
- npm run lint — run ESLint across the repo

## Import / alias
- Project uses a `@/` alias mapped to `./src` (see `jsconfig.json`). Prefer `import X from "@/..."`.

## Key architecture points (what to know first)
- UI components live under `src/components/ui/` and follow shadcn/ui conventions (Button/Input/Dialog wrappers).
- Intake forms are multi-step wizards under `src/components/intake sheet/`, `src/components/intake sheet CICLCAR/`, `src/components/intake sheet FAC/`, and `src/components/intake sheet FAR/`.
- Case tables and drag/drop rows live under `src/components/cases/` and `src/components/cases/tables/` (see `TableRenderer.jsx`, `DraggableRow.jsx`, `DragHandle.jsx`).
- Global state: two small Zustand stores:
  - `src/store/authStore.js` — handles Supabase auth, user profile fetch, avatar signed URLs, login/logout, init, uploadAvatar, updatePassword. Use `useAuthStore()` to read and call methods.
  - `src/store/useIntakeFormStore.js` — central in-memory store for multi-step intake forms. Key API: `setSectionField(section, fieldOrValues, maybeValue)`, `getAllData()`, and `resetAll()`.

> See `README.md` "Code Documentation Standards & Best Practices" for file/header/JSDoc templates and store/hook documentation examples — follow those templates when adding new files or comments.

## Supabase integration details
- Config is in `config/supabase.js` and uses Vite env vars `VITE_SUPABASE_URL` and `VITE_SUPABASE_KEY`.
- `authStore` calls Supabase methods: `signInWithPassword`, `getUser`, `signOut`, `updateUser`, and uses `supabase.storage` to manage `profile_pictures` with `createSignedUrl` and `upload` (upsert).
- Database table referenced: `profile` (columns used: `id`, `role`, `avatar_url`). Assume other case-related tables exist but are used through Supabase client directly in page components.

## Patterns and conventions worth following
- Forms are built with `react-hook-form` + Zod (use resolver). Components expect `sectionKey` and use `useIntakeFormStore()` to persist between steps.
- When updating intake form data use `setSectionField(section, values)` to merge objects or `setSectionField(section, field, value)` for single fields. See `useIntakeFormStore.js` for exact behavior.
- Protected routes use `src/pages/ProtectedRoute.jsx` — check `role` from `useAuthStore()` to gate components (example: allowedRoles prop).
- Avatar handling: upload path uses `${user.id}_avatar.<ext>` and DB stores the path in `profile.avatar_url`. UI expects a signed URL in `authStore.avatar_url`.

## Files to inspect when onboarding or debugging
- `src/App.jsx` — router and global layout
- `src/pages/ProtectedRoute.jsx` — auth gating
- `src/store/authStore.js` — Supabase auth flows and usage examples
- `src/store/useIntakeFormStore.js` — multi-step data API
- `src/components/cases/tables/TableRenderer.jsx` — table rendering and DnD wiring
- `config/supabase.js` — supabase client initialization and env var names

## Developer workflow notes
- Environment: provide `VITE_SUPABASE_URL` and `VITE_SUPABASE_KEY` in `.env` for local dev. No other special runtime configuration was found.
- Use `npm run dev` to boot the app; Vite hot reloads components.
- Linting: `npm run lint` uses ESLint; fix rules in `eslint.config.js` if needed.

## Small examples to copy-paste
- Read auth state and avatar:
  const { user, avatar_url, role, init } = useAuthStore();

- Set intake section values (merge):
  useIntakeFormStore.getState().setSectionField('identifying', { name: 'Mary', age: 34 });

## What *not* to change lightly
- `useAuthStore.init()` runs on app load and expects Supabase session APIs; changing auth flow requires updating `ProtectedRoute` and pages that rely on `avatar_url` signed URLs.
- Storage paths for avatars are referenced in DB and storage; renaming buckets or paths will break existing avatars and UI.

## Where to add tests / low-risk improvements
- Add unit tests around `useIntakeFormStore` behaviors (object merge vs single field). Small tests provide high confidence.
- Document additional Supabase table schemas used by the app (not discoverable purely from code) in README or a schema file if you add DB migrations.

---

If anything above is incomplete or you'd like more detail about specific flows (intake step order, table column mapping, or Supabase table names used by case pages), tell me which area and I will expand the instructions with concrete examples taken from those files.
```