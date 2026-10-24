# Control Panel API

FastAPI backend for Q Labs. It serves the voice test studio (targets, page maps, drafting, browser runs, Playwright export and the mic token) and the sandbox platform (apps, versions, scenarios, Docker sandboxes, Auto QA and the AI agent).

## Stack

- Python 3.13
- FastAPI and Pydantic
- Playwright for Chromium runs and page maps
- Groq for the language model, called over HTTP in `app/llm.py`
- Deepgram for live speech (the API only mints short lived keys)
- SQLite by default, or IBM Db2
- docker-py for sandboxes

## Local development

```powershell
cd control-panel-api
py -3.13 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements-sqlite.txt
.\.venv\Scripts\python.exe -m playwright install chromium
copy .env.example .env
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Start the studio's demo store in another terminal:

```powershell
.\.venv\Scripts\python.exe -m uvicorn app.acceptance_demo:app --host 127.0.0.1 --port 8120
```

`requirements-sqlite.txt` is the pinned set for the studio with SQLite. `requirements.txt` adds the Db2 driver and dev tools for the full platform.

OpenAPI docs are at `http://localhost:8000/docs`.

## Environment variables

| Variable | Required | Description |
| --- | --- | --- |
| `GROQ_API_KEY` | For AI features | Drafts studio tests and drives `/api/agent/*` |
| `GROQ_MODEL` | No | Defaults to `openai/gpt-oss-120b` |
| `DEEPGRAM_API_KEY`, `DEEPGRAM_PROJECT_ID` | For the live mic | Used only to mint ten second browser keys |
| `QLABS_ALLOW_REMOTE_TARGETS` | No | `1` allows studio targets outside localhost |
| `QLABS_UI_ORIGINS` | No | Comma separated CORS origins; defaults to `http://localhost:3000,http://127.0.0.1:3000` |
| `QLABS_ACCEPTANCE_DB`, `QLABS_ARTIFACT_DIR` | No | Override where studio tests, runs and screenshots are stored |
| `DOCKER_HOST` | No | Docker socket for sandboxes |
| `TARGET_IMAGE` | No | Fallback sandbox image; default `sandbox-target-app` |
| `DB_PROVIDER` | No | `sqlite` (default) or `db2`; Db2 settings are in `.env.example` |
| `SHAREABLE_SANDBOX_BASE_URL` | No | Template for shareable sandbox links, such as `https://{port}.ngrok-free.app` |
| `API_BASE_URL` | No | Base URL for QA runner self calls; default `http://127.0.0.1:8000` |

## Runtime data

Everything is created under `control-panel-api/data/`, which is gitignored:

- `acceptance.db`: studio tests, runs and added apps
- `acceptance-artifacts/`: run screenshots
- `platform.db`: apps, versions, scenarios, workflows and QA runs
- `scenario_files/`, `app_images/`, `certs/`: sandbox platform files

## API overview

| Area | Endpoints |
| --- | --- |
| Studio targets | `GET/POST /api/acceptance/targets`, `DELETE /api/acceptance/targets/{id}`, `GET /api/acceptance/targets/{id}/map` |
| Studio tests | `POST /api/acceptance/draft`, `GET/POST /api/acceptance/plans`, `GET /api/acceptance/plans/{id}/export` |
| Studio runs | `GET/POST /api/acceptance/runs`, `GET /api/acceptance/runs/{id}`, `POST /api/acceptance/runs/{id}/cancel`, `GET /api/acceptance/runs/{id}/screenshots/{file}` |
| Voice | `GET /api/voice/status`, `GET /api/voice/token` |
| Health | `GET /api/health` |
| Apps and versions | `GET/POST /api/apps`, `GET/PATCH/DELETE /api/apps/{id}`, `GET/POST /api/apps/{id}/versions` |
| Scenarios | `GET/POST /api/scenarios`, `GET/PATCH/DELETE /api/scenarios/{id}`, `POST /api/scenarios/{id}/upload-db` |
| Sandboxes | `GET/POST /api/sandboxes`, `PATCH/DELETE /api/sandboxes/{container_id}` |
| QA runs | `GET /api/qa-runs`, `GET /api/qa-runs/{id}`, `POST /api/apps/{version_id}/qa-run` |
| Agent | `POST /api/agent/next-action`, `POST /api/agent/generate-tasks` |
| Cleanup | `POST /api/cleanup` stops sandbox containers |

## Scripts

| Script | Purpose |
| --- | --- |
| `scripts/seed_qa_runs.py` | Seed demo apps, versions and QA runs. Use `--init` to recreate tables first. |
| `scripts/complete_qa_run.py` | Mark a stuck QA run as completed: `python scripts/complete_qa_run.py <run_id>` |

## Tests

```powershell
.\.venv\Scripts\python.exe -m unittest discover -s tests -v
```

See the root [README](../README.md) for the browser tests and the full setup.

## License

MIT, same as the root repository.
