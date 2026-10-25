# Q Labs test studio

Say what your app should do. Q Labs reads the real page, writes a browser test with explicit checks, runs it in Chromium and shows what the page actually did, step by step, with screenshots. Follow up by voice to change the test or run it somewhere else.

The studio is at `/` and `/studio`. The inherited sandbox dashboard stays at `/dashboard`.

## Start locally

Use Node.js 22 and Python 3.13. On Windows, `./dev.ps1` in the repository root does all of the steps below and opens the studio. `./dev.ps1 -Stop` stops the servers.

To do it by hand, from `control-panel-api`:

```powershell
py -3.13 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements-sqlite.txt
.\.venv\Scripts\python.exe -m playwright install chromium
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

In a second terminal, from the same folder, start the demo store:

```powershell
.\.venv\Scripts\python.exe -m uvicorn app.acceptance_demo:app --host 127.0.0.1 --port 8120
```

From `control-panel-ui`:

```powershell
npm ci --ignore-scripts --no-audit --no-fund
npm run dev
```

Open `http://localhost:3000`.

## Voice setup

Add these to `control-panel-api/.env` (the file is gitignored):

| Key | Used for |
| --- | --- |
| `GROQ_API_KEY` | Turning what you say into steps. Free tier works. `GROQ_MODEL` overrides the default `openai/gpt-oss-120b`. |
| `DEEPGRAM_API_KEY`, `DEEPGRAM_PROJECT_ID` | The live mic. The API mints a ten second key per session, so the real key never reaches the browser. |

The current drafting client uses Groq. An Anthropic key alone does not enable drafting.

Without Deepgram keys the mic button is off, and Wispr Flow is the voice input: dictate into the box and press Ctrl + Enter. Without any model key you can still edit steps by hand, run and export.

## How voice works

1. Click the mic or press M. Speak, then pause. A finished sentence is sent after about a second of silence.
2. Q Labs opens the target in Chromium and builds a page map of its buttons, fields, links and message areas. The model must use those real selectors, and any step whose selector was not on the page is flagged.
3. Spoken input is cleaned up for testing: "email is required" becomes `Email is required`, "save ten" becomes `SAVE10` when a field suggests it, "twenty one dollars sixty" becomes `$21.60`.
4. Saying more while a test exists edits it ("also check the total drops to $21.60"). Changed steps flash so you can see what moved.
5. Short commands are handled directly, without the model:
   - "run it", "run it again"
   - "run it on the fixed build", "use the broken build", or the name of an app you added
   - "watch it run", "run it and show me" (opens a visible browser for that run)
   - "undo", "start over", "export"

Speech recognition receives the page's labels as key terms to improve recognition of names such as "Place order" and "SAVE10". Check the transcript when exact wording matters.

## Watching and hearing a run

- **Show browser** in the run bar (or "watch it run") opens Chromium in a window and slows every action to about a second, so a viewer can follow along. Each element is outlined as it is used: blue for actions, green for a passing check, red for a failing one. The same outlines appear in the screenshots.
- **Read results aloud** speaks the outcome when a run finishes, naming the failing step with the expected and actual values. The mic discards what it hears while Q Labs is speaking.
- Each step records how long it took. Checks wait up to 3 seconds for the page to settle and actions up to 5.

## Test your own app

Click the plus button next to Target, give the app a name and an address such as `http://localhost:3001`. Only localhost addresses are accepted unless `QLABS_ALLOW_REMOTE_TARGETS=1` is set in `control-panel-api/.env`. Inspection and execution allow requests on the same origin, including assets outside the starting path. Third-party origins remain blocked. Navigation and URL-assertion paths are relative to the app origin; old demo plans using `/` retain the selected fixture's entry page.

## Feature walkthrough

For the timed two-minute recording, follow [DEMO-RECORDING.md](DEMO-RECORDING.md). The longer tour below covers additional features.

Start everything with `./dev.ps1`, turn on **Show browser** and **Read results aloud**, and begin with an empty studio on **Demo store, broken build**.

1. Point at "Grounded in Checkout | Fernhill Coffee, 11 elements" and open it to show the real selectors.
2. Mic on: "Leave the email empty and press place order. It should say email is required."
3. "Run it." Chromium opens and clicks through. The check fails and Q Labs says: expected `Email is required`, the page showed `Order confirmed`.
4. "Also apply the code save ten and check the total drops to twenty one dollars sixty." The new steps flash.
5. Run the expanded test on the broken build first, then change only the target and say "Run it on the fixed build." The saved contract and expectations stay unchanged between those two runs.
6. "Export." The Playwright file downloads and runs in any Playwright project with `BASE_URL` set.
7. Real app: add SaySketch (`https://saysketch.vercel.app`), then say "Click start drawing and it should take me to the editor page", then "run it". It passes, with the browser ending on `/d/new`.
8. Open **Dashboard**. Point at the open failures with expected and actual side by side, expand one to show its screenshot, and read the AI brief. Click a suggested test to open it in the studio, or press **Run all tests** on an app and watch the progress bar.

On an empty install the dashboard offers **Load demo data**. It saves four demo tests and runs each on both builds. Duration varies; the numbers on screen come from real runs.

The broken build has two bugs on purpose: it confirms orders without an email, and it shows "SAVE10 applied" without lowering the total.

## Verification

```powershell
# From control-panel-api
py -3.13 -m unittest discover -s tests -v

# With the UI, API and demo store running
$env:QLABS_UI_E2E='1'
py -3.13 -m unittest discover -s tests -p test_studio_browser.py -v
```

From `control-panel-ui`, run `npx tsc --noEmit --incremental false` and `npm run build`. `NEXT_DIST_DIR` selects a separate build folder when the dev server is running.

## Boundaries

This is a local tool. Runs go through one serial queue with at most five waiting jobs, each in its own browser process with a 120 second limit. Restarting the API marks unfinished runs as errored instead of resuming them. There is no login, so do not expose the API publicly. Screenshots stay in `control-panel-api/data` and can contain anything typed during a test.
