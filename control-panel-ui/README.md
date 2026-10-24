# Control Panel UI

Next.js dashboard for **Q Labs**: manage apps and versions, define scenarios, run Auto QA, view reports, launch sandboxes, and drive the AI agent. Talks to `control-panel-api` for all data and Docker operations.

## Role in Q Labs

- **Apps** — Create apps, upload Docker images (`.tar`) as versions, and define scenarios per version (env vars, optional seed DB, smoke URLs).
- **QA** — Start Auto QA runs for a version/scenario, then view the report: which paths passed (green) or failed (red) with short descriptions (e.g. `GET / returned 200`).
- **Live sandboxes** — Launch a sandbox from a scenario and open it in an iframe; multiple sandboxes can run at once. Optional save/share of walkthroughs.
- **AI Agent** — Point the agent at a sandbox, give a task (e.g. “Add to cart and go to checkout”); the agent drives the real UI step by step.

## Stack

- Next.js App Router
- React + TypeScript
- Tailwind CSS + shadcn/ui

## Prerequisites

- **control-panel-api** running and reachable (default `http://localhost:8000`).

## Local development

```bash
cd control-panel-ui
npm install
cp .env.example .env
```

Set in `.env`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Then:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Key routes

| Path | Purpose |
|------|---------|
| `/` | Dashboard: apps, recent sandboxes, quick actions |
| `/apps` | App list |
| `/apps/[id]` | App detail: versions, scenarios, “Run Auto QA”, “Launch” sandbox |
| `/qa` | QA runs list |
| `/qa/[id]` | QA run report: walkthrough of paths, pass/fail, failure cards |
| `/agent` | AI Agent: pick scenario/sandbox and task, open sandbox with agent |
| `/live` | Live sandboxes list; launch new sandbox, open or destroy existing |
| `/sandbox/[id]` | Fullscreen sandbox view (iframe + optional agent); no sidebar |
| `/scenarios` | Scenario list (legacy/flat view) |
| `/scenarios/[id]` | Scenario detail; launch sandbox |
| `/insights` | Analytics view |
| `/graph` | Graph view of scenarios/sandboxes |
| `/tunnels` | Tunnels configuration |
| `/settings` | Settings page |

## API dependency

All data and actions go through `control-panel-api`. The UI only reads `NEXT_PUBLIC_API_URL`; no other server-side secrets are required for the front end.

## Build and lint

```bash
npm run build
npm run lint
```

## See also

- Root [README](../README.md) — Q Labs overview and getting started.
- [control-panel-api](../control-panel-api/README.md) — Backend API and environment variables.

## License

Same as the root repository (MIT).
