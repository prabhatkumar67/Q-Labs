# Recruitment Management App

Recruitment-focused sample app built with Next.js App Router and TypeScript. It can be used as a second **Q Labs** target app (alongside the storefront template): register it in the control panel, upload a Docker image, define scenarios, and run Auto QA or launch sandboxes. All product functionality stays within the recruitment domain.

## Scope

- Job requisition management
- Candidate pipeline tracking
- Interview scheduling board
- Live dashboard metrics
- User-facing careers portal
- Protected admin operations console

## Architecture

The app is organized by intent using Next.js route groups:

- `src/app/(public)` for role entry and sign-in routes
- `src/app/(workspace)` for recruiter and candidate workspace screens
- `src/app/api` for route handlers

Shared UI and behavior live in:

- `src/components/layout` for app shell and navigation framing
- `src/components/auth` for reusable login form behavior
- `src/lib` for auth utilities and data-store logic

Styling uses a custom design system in `src/app/globals.css` (no Tailwind CSS).

## Local development

1. Copy the environment template:

   ```bash
   cp .env.example .env
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Start the app:

   ```bash
   npm run dev -- --port 3002
   ```

4. Open `http://localhost:3002`.

## Experience split (for demos)

- Role selector on first load: `/`
- User login: `/user-login`
- Admin login: `/login`
- Recruitment operations UI (shared dashboards/pages): `/jobs`, `/candidates`, `/interviews`
- User-facing careers portal: `/careers`, `/careers/apply`
- Admin console: `/admin`, `/admin/jobs`, `/admin/candidates`, `/admin/interviews`

Admin and user routes are protected by proxy route guards and require their respective auth cookies.

Recruiter operation routes are also protected:

- `/jobs`
- `/candidates`
- `/interviews`

Configure credentials in `.env` (copy from `.env.example`) using:

- `AUTH_ADMIN_EMAIL`
- `AUTH_ADMIN_PASSWORD`
- `AUTH_USER_EMAIL`
- `AUTH_USER_PASSWORD`

Login forms are prefilled with development defaults for quick demos.

To use your own credentials, update `.env` values and restart the app.

## Data model

Data is stored in `data/recruit.db` (SQLite via `better-sqlite3`). Tables:

- **jobs** — requisitions with status, department, location
- **candidates** — pipeline entries linked to jobs with stage tracking
- **interviews** — scheduled interviews linked to candidates and jobs

Foreign keys use `ON DELETE CASCADE`: deleting a job removes its candidates and their interviews automatically.

## Data Seeding

- `npm run seed` creates `data/recruit.db` with Faker-generated data
- On `npm start`, `scripts/entrypoint.js` seeds automatically if the DB does not exist
- Set `SEED_COUNT` env var to control how many candidates are generated (default: 30)
- Set `SCENARIO_CONFIG` as JSON to override individual seed parameters (e.g. `{"candidate_count":50,"job_count":10}`)
- `SCENARIO_CONFIG` keys take precedence over `SEED_COUNT`

## Recruitment API endpoints

- `GET/POST /api/jobs`
- `PATCH/DELETE /api/jobs/:id`
- `GET/POST /api/candidates`
- `PATCH/DELETE /api/candidates/:id`
- `GET/POST /api/interviews`
- `PATCH/DELETE /api/interviews/:id`
- `GET /api/metrics`

## Auth endpoints

- `POST /api/auth/login`
- `POST /api/auth/user-login`
- `POST /api/auth/logout`

## Environment variables

| Variable | Description | Default |
|---|---|---|
| `SEED_COUNT` | Number of candidates to seed | `30` |
| `SCENARIO_CONFIG` | JSON override for seed parameters | — |
| `AUTH_ADMIN_EMAIL` | Admin login email | `admin@example.com` |
| `AUTH_ADMIN_PASSWORD` | Admin login password | `change-me-admin-password` |
| `AUTH_USER_EMAIL` | User login email | `user@example.com` |
| `AUTH_USER_PASSWORD` | User login password | `change-me-user-password` |

## Build check

```bash
npm run build
```

## See also

- Root [README](../README.md) — Q Labs overview and how to run the control panel and add target apps.
