# IDM System — Copilot Instructions

## Big picture

- React 19 + Vite + Tailwind renderer, packaged as an Electron desktop app (electron/main.js). Packaged builds load dist/index.html; routing uses HashRouter (src/App.jsx) to work reliably under file-based hosting.
- Supabase is the backend (config/supabase.js). The app now runs online-only for CRUD flows, with direct Supabase reads/writes in hooks/services.

## Developer commands (package.json)

- npm run dev: Electron + Vite (desktop development)
- npm run dev:renderer: Vite renderer only (web)
- npm run dev:main: Electron main (expects VITE_DEV_SERVER_URL)
- npm run build / npm run preview
- npm run build:electron: package installers via electron-builder
- npm run lint

## Project conventions

- Import alias: use @/ for src/ (vite.config.js + jsconfig.json).
- UI primitives live in src/components/ui/ (shadcn-style). Global toaster is wired in src/App.jsx (sonner).
- Multi-step intake flows persist state via Zustand store src/store/useIntakeFormStore.js:
    - setSectionField(section, valuesObj) merges objects (RHF values)
    - setSectionField(section, field, value) sets one field
    - getAllData() feeds submit helpers in src/lib/\*Submission.js (e.g., src/lib/caseSubmission.js)

## Auth + routing

- Central auth is src/store/authStore.js (login/logout/init). It reads the profile table (role/avatar_url/status) and signs avatar URLs from the profile_pictures storage bucket.
- Auth initialization is online-only via Supabase session state; there is no custom offline localStorage session fallback.
- Route gating uses src/pages/ProtectedRoute.jsx and allowedRoles in src/App.jsx. Note: authStore currently normalizes legacy roles to social_worker.

## Data access pattern

- Hooks and services use direct Supabase operations for list/detail/mutations.
- Legacy compatibility fields may still exist in some hooks (`pendingCount`, `syncing`, `syncStatus`, `runSync`) to avoid immediate UI breakage, but they act as refresh/status facades rather than offline queue state.
