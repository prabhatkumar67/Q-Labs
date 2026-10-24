# Q Labs

**Describe the behavior. Review the test. See what actually happened.**

Q Labs helps developers turn spoken acceptance criteria into repeatable browser tests. Describe a workflow, review the proposed steps and explicit expectations, then run it in Chromium. Inspect expected versus observed results and screenshots, refine the test through follow-up instructions, and rerun the saved test against a fix.

## Table of contents

- [Voice test studio](#voice-test-studio)
- [Quick start](#quick-start)
- [Configuration](#configuration)
- [Try it in 90 seconds](#try-it-in-90-seconds)
- [Sandbox platform](#sandbox-platform)
- [Repository layout](#repository-layout)
- [API routes](#api-routes)
- [Testing](#testing)
- [Attribution](#attribution)
- [License](#license)

## Voice test studio

The studio opens at `http://localhost:3000`.

- **Speak or dictate.** A live mic streams to Deepgram, and Wispr Flow dictation works in the same box. A request is sent when you pause after a sentence.
- **Draft against the actual page.** Q Labs inspects buttons, fields, links and message areas in Chromium to help ground the proposed test. Review selectors and any flagged steps before running.
- **Built for speech.** "Email is required" gets its capital back, "save ten" becomes `SAVE10` when a field suggests it, and "twenty one dollars sixty" becomes `$21.60`.
- **Edit by talking.** "Also check the total drops to $21.60" adds steps to the current test, and the changed steps are highlighted.
- **Hands free commands.** "Run it", "run it on the fixed build", "undo", "start over" and "export" run straight away.
- **Evidence, not a green tick.** Every check shows expected and actual values, later steps are blocked after a failure, and a browser error is reported separately from a failed check.
- **Your own local apps.** Register an app running on localhost as a target and review its proposed test steps.
- **Playwright export.** Download the saved test as a `.spec.ts` file for your Playwright project. Configure its target and dependencies before running it independently.

The language model is Groq (`openai/gpt-oss-120b` by default). The same key also powers the sandbox platform's AI agent.

## Quick start

You need Node.js 22 and Python 3.13. Docker is only needed for the sandbox platform.

```powershell
# From the project root
cd control-panel-api
py -3.13 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt playwright
.\.venv\Scripts\python.exe -m playwright install chromium --only-shell
copy .env.example .env
```

Add your keys to `control-panel-api/.env` (see [Configuration](#configuration)), then start the API and the demo store in two terminals:

```powershell
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
.\.venv\Scripts\python.exe -m uvicorn app.acceptance_demo:app --host 127.0.0.1 --port 8120
```

In a third terminal, starting from the project root:

```powershell
cd control-panel-ui
npm ci --ignore-scripts --no-audit --no-fund
copy .env.example .env
npm run dev
```

On macOS or Linux, use `python3.13 -m venv .venv`, `.venv/bin/python` and `cp` instead.

## Configuration

`control-panel-api/.env` is gitignored. Never commit real keys.

| Variable | Needed for | Notes |
| --- | --- | --- |
| `GROQ_API_KEY` | Drafting tests, the AI agent | Get a key at [console.groq.com](https://console.groq.com/keys) and check your account's available models and limits. |
| `GROQ_MODEL` | Optional | Defaults to `openai/gpt-oss-120b`. |
| `DEEPGRAM_API_KEY`, `DEEPGRAM_PROJECT_ID` | The live mic | The API mints a ten second key per session, so the real key never reaches the browser. Without them, use Wispr Flow or type. |
| `QLABS_ALLOW_REMOTE_TARGETS` | Optional | Set to `1` to allow non localhost targets. Off by default. |

`control-panel-ui/.env` only needs `NEXT_PUBLIC_API_URL=http://localhost:8000`.

## Try it in 90 seconds

The demo store at port 8120 is a small coffee shop checkout with a broken and a fixed build. Its defects are intentional: the broken build confirms orders without an email and says "SAVE10 applied" without lowering the total. No real order or payment is created. Review each proposed test before executing it.

1. Pick **Demo store, broken build** and click the mic (or press M).
2. Say: "Leave the email empty and press place order. It should say email is required."
3. Say: "Run it." The check fails: expected `Email is required`, actual `Order confirmed`.
4. Say: "Also apply the code save ten and check the total drops to twenty one dollars sixty."
5. Say: "Run it on the fixed build." Both checks pass with the same saved test.
6. Say: "Export." The Playwright file downloads.

More detail, including limits, is in [TEST-STUDIO.md](TEST-STUDIO.md).

## Sandbox platform

The sandbox dashboard at `/dashboard` provides app versions, seeded scenarios, recording and agent-assisted exploration for supported containerized apps.

1. **Create an app** and upload a Docker image (`.tar`) as a version, such as `v1.0`.
2. **Define scenarios** per version: env vars, seed data and an optional uploaded `.db`.
3. **Run Auto QA.** Q Labs starts a real container, discovers routes from the app's HTML and requests each one. The report shows which paths returned 200 and which did not.
4. **Fix and re-run** with a new image version and compare.
5. **Launch sandboxes.** Each scenario can run as its own isolated container with a shareable link, which is useful for demos.
6. **AI agent.** Give the agent a task, such as "add a product to the cart and go to checkout". It reads the DOM, picks the next click, typing or navigation step with Groq, and the control panel carries it out in the sandbox.

HTTP smoke checks establish route availability, not complete workflow correctness. Agent exploration is also separate from an acceptance test with explicit assertions.

To try the sandbox workflow, build the included storefront image:

```bash
cd target-app-template
npm install
docker build -t qlabs-storefront-app .
docker save qlabs-storefront-app -o qlabs-storefront-app.tar
```

Then install the full requirements with `pip install -r requirements.txt`, upload the `.tar` in the UI, add a scenario and run Auto QA or launch a sandbox. `python scripts/seed_qa_runs.py --init` seeds demo QA runs. Sandboxes need Docker Engine running and reachable through `DOCKER_HOST`.

## Repository layout

| Folder | Stack | Port |
| --- | --- | --- |
| `control-panel-ui` | Next.js, React, Tailwind CSS | 3000 |
| `control-panel-api` | FastAPI, Playwright, persistence and Docker management | 8000 |
| `control-panel-api/app/acceptance_demo.py` | Demo store for the studio | 8120 |
| `target-app-template` | Next.js storefront seeded with Faker.js, for sandboxes | 3000 in containers, mapped 8001 to 8050 |
| `recruitment-management-app` | Optional second demo app | 3002 |

Key studio files:

```
control-panel-api/app/
  acceptance_api.py     Studio routes: targets, page maps, drafting, runs, voice token, export
  planner.py            Turns speech into a grounded test plan
  page_inspect.py       Reads a page in Chromium and lists usable elements
  acceptance_worker.py  Runs one test in its own browser process
  llm.py                Groq client shared by the studio and the agent
control-panel-ui/src/app/studio/
  page.tsx              Studio page and the voice request queue
  use-live-mic.ts       Deepgram streaming mic
  voice-commands.ts     Spoken commands
  voice-composer.tsx, step-editor.tsx, run-panel.tsx, run-history.tsx
```

## API routes

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET`, `POST` | `/api/acceptance/targets` | List targets or add a local app |
| `GET` | `/api/acceptance/targets/{id}/map` | Elements found on the target page |
| `POST` | `/api/acceptance/draft` | Turn a spoken request into a test, or edit the current one |
| `GET`, `POST` | `/api/acceptance/plans` | List or save tests |
| `GET` | `/api/acceptance/plans/{id}/export` | Playwright source for a saved test |
| `GET`, `POST` | `/api/acceptance/runs` | List runs or start one |
| `GET` | `/api/voice/status`, `/api/voice/token` | Mic availability and a short lived Deepgram key |
| `GET`, `POST` | `/api/apps`, `/api/scenarios`, `/api/sandboxes` | Sandbox platform |
| `POST` | `/api/apps/{version_id}/qa-run` | Start an Auto QA run |
| `POST` | `/api/agent/next-action` | AI agent's next action from the DOM and intent |

Interactive docs are at `http://localhost:8000/docs`.

## Testing

```powershell
cd control-panel-api
.\.venv\Scripts\python.exe -m unittest discover -s tests -v

# Browser tests, with the UI, API and demo store running
$env:QLABS_UI_E2E='1'
.\.venv\Scripts\python.exe -m unittest discover -s tests -p test_studio_browser.py -v
```

In `control-panel-ui`, run `npx tsc --noEmit`, `npm run lint` and `npm run build`.

Verify real dictation and model-generated plans separately from automated checks. Page inspection and speech handling do not guarantee that every request produces the intended test.

## Attribution

This project builds on [Q Labs](https://github.com/AdrianLuk12/Q-Labs), with additional acceptance-testing and voice workflows. Original copyright notices are preserved in the license.

## License

Distributed under the MIT License. See [`LICENSE`](LICENSE).

