# AGENTS.md

## Project overview
This repository is a Next.js + TypeScript ERP for construction and project management in Guatemala. The app combines a React frontend, Firebase-based backend services, and a substantial business-logic layer under `lib/`.

Primary project references:
- [README.md](README.md)
- [DOCUMENTATION_INDEX.md](DOCUMENTATION_INDEX.md)
- [IMPLEMENTATION_GUIDE.md](IMPLEMENTATION_GUIDE.md)
- [PROJECT_COMPLETION_SUMMARY.md](PROJECT_COMPLETION_SUMMARY.md)

## Working conventions
- Prefer targeted, minimal changes over broad refactors.
- Keep business logic in `lib/` and UI composition in `components/` and `app/`.
- Follow the existing TypeScript patterns and use typed helpers rather than ad hoc `any` values.
- When fixing bugs, validate the relevant behavior with the smallest reproducible test or check rather than running the entire suite unnecessarily.
- Update docs only when the change materially alters behavior, usage, or setup.

## Key directories
- `app/` — Next.js app-router pages and route-level UI
- `components/` — reusable screens and UI building blocks
- `lib/` — data, calculations, Firebase integration, validation, and domain logic
- `features/` — feature-specific modules and patterns
- `scripts/` — build and maintenance utilities
- `e2e/` and `playwright.config.ts` — end-to-end coverage
- `docs/` — supporting project documentation

## Commands
Use the project scripts in `package.json`:

- Install dependencies: `npm install`
- Start dev server: `npm run dev`
- Run unit tests: `npm run test`
- Watch tests: `npm run test:watch`
- Type-check: `npm run type-check`
- Build: `npm run build`
- Lint: `npm run lint`
- Format: `npm run format`
- E2E: `npm run test:e2e`

## Quality bar
- Prefer tests for logic changes, especially in `lib/**/*.test.ts` and `*.integration.test.ts` files.
- Keep the fix aligned with the current architecture; do not add framework or state-management patterns unless they are already used in the repo.
- Before claiming completion, confirm the relevant verification command ran successfully and report the exact result.

## Project-specific notes
- This repo includes a large amount of generated or summary documentation; use those files as references, not as a source of truth for implementation details.
- The app uses Firebase and Next.js; be careful with environment configuration and server/client boundaries when changing auth or data-access code.
- The project has extensive validation and QA documentation; if a change affects user workflows, cross-check the relevant docs before finalizing.

## Recommended workflow for AI agents
1. Read the relevant feature area and existing tests before making changes.
2. Implement the smallest fix that matches the current architecture.
3. Run the closest relevant validation command.
4. Summarize the outcome with concrete evidence from the command output.

If this repo grows more specialized, split this guidance into task-specific instructions or skills for frontend work, QA, Firebase logic, or release validation.
