# Target App Template

Containerized sample storefront app used by **Q Labs** when launching sandboxes and running Auto QA. It demonstrates a typical target: Next.js, SQLite, and Faker-based seed data that can be driven by scenarios (env, seed DB, `SCENARIO_CONFIG`).

## Stack

- Next.js App Router
- SQLite (`better-sqlite3`)
- Faker-based seed generation

## Local Development

```bash
cd target-app-template
cp .env.example .env
npm install
npm run dev
```

Open `http://localhost:3000`.

## Data Seeding

- `npm run seed` seeds `data/store.db`
- On `npm start`, `scripts/entrypoint.js` seeds automatically if DB does not exist
- Set `SEED_COUNT` env var to control how many products are generated (default: 25)
- Set `SCENARIO_CONFIG` as JSON to override individual seed parameters (e.g. `{"product_count":50,"inventory_status":"low"}`)
- `SCENARIO_CONFIG` keys take precedence over `SEED_COUNT`

See `.env.example` for all available variables.

## Docker (used by Q Labs control-panel-api)

Build image:

```bash
docker build -t sandbox-target-app .
```

For Q Labs, you can tag with the `qlabs-` prefix so the API finds it by app/version (e.g. `qlabs-storefront-app-v1.0:latest`). Export for upload in the UI:

```bash
docker save qlabs-storefront-app-v1.0:latest -o qlabs-storefront-app-v1.0.tar
```

Run manually:

```bash
docker run --rm -p 3000:3000 sandbox-target-app
```

The control panel API launches this image and maps container port `3000` to host ports `8001–8050`.

### Demo bug (for QA demos)

Set `DEMO_BUG=1` in the scenario env (or when running the container) to make `/cart` return 404. Useful for demonstrating Auto QA failure detection; fix by deploying a new version without the bug.

## Build / Lint

```bash
npm run build
npm run lint
```

## See also

- Root [README](../../README.md) — Q Labs overview, getting started, and API summary.
- [control-panel-api](../control-panel-api/README.md) — How the API loads and runs this image for sandboxes and Auto QA.
