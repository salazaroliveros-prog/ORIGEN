# AGENTS.md

Next.js 15 (App Router) + strict TypeScript + React 19 ERP for construction/project management (Guatemala). Firebase (Auth/Firestore/Storage, client + `firebase-admin`) backend; business logic lives in `lib/`, UI in `app/` and `components/`.

## Layout & boundaries
- `app/` — routes/UI (`app/api/**` route handlers). `components/` — shared UI. `lib/` — domain logic, calculations, Firebase/data access, validation, hooks (`lib/utils`, `lib/hooks`, etc.). `features/` — feature modules.
- `e2e/` + `playwright.config.ts` — Playwright E2E (global setup `e2e/global-setup.ts`). `scripts/` — dev/build/seed/maintenance (see quirks). `docs/` and many root `*_SUMMARY|*_REPORT|*_GUIDE.md` files are reference/summaries, not source of truth for behavior.

## Commands
- Install: `npm install` (CI uses `npm ci --no-audit --no-fund`, Node 24).
- Dev: `npm run dev` (runs `scripts/dev.mjs` → `next dev`, defaults `-p 3000 -H 0.0.0.0`; emulated: `npm run dev:emulated`; Firebase emulators: `npm run emulators`).
- Build/start: `npm run build` (`scripts/build.mjs`, sets `NODE_ENV=production` and `--max-old-space-size=1024`, `output: 'standalone'`); prod server: `npm run start` (`node .next/standalone/server.js`).
- Lint/format/typecheck: `npm run lint` (`eslint .`), `npm run lint:fix`, `npm run format` / `format:check`, `npm run type-check` (`tsc --noEmit`).
- Tests (Vitest, jsdom): `npm run test` / `test:watch` / `test:coverage`. Focused: `npm run test -- <pattern|path>` (e.g. `npm run test -- calculations`, `npm run test -- crud.integration`, `npm run test -- lib/utils/foo.test.ts`).
- Firestore emulator tests: `npm run test:firebase` (excluded from default `vitest` run; runs `lib/firestore-emulator.test.ts` via `firebase emulators:exec`).
- E2E (Playwright): `npm run test:e2e` / `test:e2e:ui` / `test:e2e:headed` (base `http://localhost:3000` or `E2E_BASE_URL`; projects chromium/firefox/webkit/mobile).

## Toolchain & quirks
- Path alias `@/*` → repo root (tsconfig/vitest). Vitest includes `lib/**/*.test.ts(x)` and `app/api/**/*.test.ts`; setup `vitest.setup.ts`.
- `scripts/dev.mjs` auto-heals `/app` symlinks and copies `package.json` into `/app` (cloud/runtime artifact) — preserve this behavior. Build script constrains Node heap.
- Env: copy `.env.example` → `.env.local`. Client vars `NEXT_PUBLIC_FIREBASE_*` (+ optional App Check/VAPID/emulator flags); server-only `GEMINI_API_KEY`, `PRIMARY_ADMIN_EMAIL`, `ALLOWED_ORIGINS`. Never commit real secrets.
- CI (`.github/workflows/ci.yml`, push/PR to `main`): `lint` → `test` → `build` (build requires `NEXT_PUBLIC_FIREBASE_*` secrets); no `type-check` step in CI.

## Conventions
- Prefer minimal, architecture-aligned fixes: keep domain/calculation logic in `lib/` (typed helpers over `any`); respect Next.js server/client boundaries for Firebase/auth/data access.
- For logic changes prefer/add focused tests near existing ones (`lib/**/*.test.ts`, `*.integration.test.ts`); validate with the smallest relevant command (single test/file) rather than full suite when possible. Report exact verification run and result.
