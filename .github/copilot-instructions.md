# IDM System — Copilot Instructions

## Big picture

- React 19 + Vite + Tailwind renderer, packaged as an Electron desktop app (electron/main.js). Packaged builds load dist/index.html; routing uses HashRouter (src/App.jsx) to work reliably under file-based hosting.
- Supabase is the backend (config/supabase.js). The app is “offline-first” in key areas using Dexie/IndexedDB (src/db/offlineCaseDb.js) + offline services (src/services/*OfflineService.js) + hooks (src/hooks/*Offline.js).

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
- Offline “Remember me” stores a sanitized session snapshot in localStorage (src/lib/offlineAuthSession.js); init() can hydrate from it when navigator is offline.
- Route gating uses src/pages/ProtectedRoute.jsx and allowedRoles in src/App.jsx. Note: authStore currently normalizes legacy roles to social_worker.

## Offline data pattern (Dexie)

- IndexedDB schema + queues are defined in src/db/offlineCaseDb.js (per-module caches + ordered operation queues).
- Services own cache/sync rules (example: src/services/caseOfflineService.js uses liveQuery, queue tables, and a sanitize step before syncing to Supabase).
- Hooks subscribe to liveQuery and expose UX state (example: src/hooks/useCasesOffline.js provides pendingCount/runSync and may force a reload via sessionStorage flags after certain syncs).
