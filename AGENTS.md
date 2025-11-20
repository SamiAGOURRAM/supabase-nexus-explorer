# Repository Guidelines

## Project Structure & Module Organization
The front-end lives in `src/`, with `components/` split by role (admin, company, student), `pages/` handling routes, and `hooks/` for Supabase/query helpers. Shared types sit in `src/types/`, while utilities (date helpers, constants) sit in `src/utils/`. Static assets stay in `public/`, and Supabase resources (CLI config plus SQL migrations) are under `supabase/`. Build outputs (`dist/`) and the Vite cache (`.vite/`) should never be edited manually.

## Build, Test, and Development Commands
- `npm run dev` – launches the Vite dev server on port 5173 with HMR.
- `npm run build` – runs `tsc` type checks and `vite build` for production bundles.
- `npm run build:dev` – emits a development-flavored build for smoke testing server deployments.
- `npm run preview` – serves the production build locally.
- `npm test` – executes Vitest suites once; add `--watch` for interactive runs.

## Coding Style & Naming Conventions
TypeScript is strict; prefer explicit interfaces exported from `src/types`. Keep React components and contexts in PascalCase files (e.g., `BulkImportModal.tsx`), hooks in camelCase (`useEventStats.ts`), and Supabase helpers in `lib/`. Follow the existing two-space indentation and single quotes unless importing bare modules. Tailwind CSS utility classes belong in JSX className strings; global tokens extend from `tailwind.config.ts`. Run `npx eslint src --max-warnings=0` before pushing to ensure `@typescript-eslint` and React plugin rules pass.

## Testing Guidelines
Vitest with Testing Library is configured via `vitest.setup.ts`. Place tests next to the code under test using the `*.test.ts(x)` suffix (see `src/utils/dateUtils.test.ts`). Name suites after the module (`describe('dateUtils', ...)`) and assert user-facing behavior rather than implementation details. Critical hooks (auth, events) should gain regression tests whenever their effects or Supabase queries change.

## Commit & Pull Request Guidelines
Recent history favors short, imperative subjects (`fix quick invite`, `update message quick invite`). Follow that style, scope prefixes only when clarifying (`admin:` or `hooks:`). Each PR should link the tracked issue, describe functional impact, list new environment variables if any, and attach screenshots or terminal captures for UI or CLI changes. Rebase onto `dev` before opening the PR, and ensure Supabase migration numbering stays chronological to avoid conflicts.

## Security & Configuration Tips
Never commit `.env`; use the sample keys in README to document required variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_RECAPTCHA_SITE_KEY`). Treat Supabase service keys and JWT secrets as production credentials. Run `supabase db push` from the `supabase/` directory to apply migrations; always review SQL for RLS adjustments with another maintainer before merge.
