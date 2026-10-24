"""Acceptance-test API, kept separate from the inherited sandbox lifecycle."""

from concurrent.futures import ThreadPoolExecutor
import json
import os
from pathlib import Path
import subprocess
import sys
import time
from urllib.parse import urlsplit

import httpx
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

from app import acceptance_store as store
from app import llm, planner
from app.acceptance_worker import artifact_directory
from app.test_plan import TestPlan

router = APIRouter(prefix="/api", tags=["Acceptance testing"])
executor = ThreadPoolExecutor(max_workers=1, thread_name_prefix="acceptance")
API_DIR = Path(__file__).parents[1]
NO_WINDOW = subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0

BUILT_IN = [
    {"id": "sample-broken", "name": "Demo store, broken build", "url": "http://127.0.0.1:8120/broken", "built_in": True},
    {"id": "sample-fixed", "name": "Demo store, fixed build", "url": "http://127.0.0.1:8120/fixed", "built_in": True},
]
LOCAL_HOSTS = {"localhost", "127.0.0.1", "::1"}


def targets():
    return BUILT_IN + [{**item, "built_in": False} for item in store.list_targets()]


def find_target(target_id):
    target = next((item for item in targets() if item["id"] == target_id), None)
    if target is None:
        raise HTTPException(404, "That app is not in your list.")
    return target


@router.get("/acceptance/targets")
def list_targets():
    return targets()


class TargetRequest(BaseModel):
    name: str = Field(min_length=1, max_length=60)
    url: str = Field(min_length=8, max_length=500)


@router.post("/acceptance/targets", status_code=201)
def add_target(body: TargetRequest):
    url = body.url.strip().rstrip("/")
    parts = urlsplit(url)
    if parts.scheme not in {"http", "https"} or not parts.hostname:
        raise HTTPException(422, "Use a full address such as http://localhost:3001.")
    # Local tool: tests drive apps on this machine unless the operator opts in to remote targets.
    if parts.hostname not in LOCAL_HOSTS and os.getenv("QLABS_ALLOW_REMOTE_TARGETS") != "1":
        raise HTTPException(422, "Only apps running on this computer (localhost) can be added.")
    if parts.query or parts.fragment:
        raise HTTPException(422, "Leave out query strings and # fragments.")
    try:
        return store.add_target(body.name.strip(), url)
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from exc


@router.delete("/acceptance/targets/{target_id}", status_code=204)
def remove_target(target_id: str):
    if not store.remove_target(target_id):
        raise HTTPException(404, "That app is not in your list.")


_page_maps: dict[str, tuple[float, dict]] = {}


def page_map(target, refresh=False):
    cached = _page_maps.get(target["url"])
    if cached and not refresh and time.time() - cached[0] < 120:
        return cached[1]
    try:
        completed = subprocess.run([sys.executable, "-m", "app.page_inspect", target["url"]], cwd=str(API_DIR),
                                   capture_output=True, text=True, timeout=45, check=True, creationflags=NO_WINDOW)
        result = json.loads(completed.stdout.strip().splitlines()[-1])
    except Exception as exc:
        raise HTTPException(502, f"Could not open {target['url']}. Check that the app is running.") from exc
    _page_maps[target["url"]] = (time.time(), result)
    return result


@router.get("/acceptance/targets/{target_id}/map")
def get_page_map(target_id: str, refresh: bool = False):
    return page_map(find_target(target_id), refresh)


@router.get("/acceptance/plans")
def list_plans():
    return store.list_plans()


@router.post("/acceptance/plans")
def save_plan(body: TestPlan):
    try:
        body.require_assertions()
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from exc
    return store.save_plan(body)


class DraftRequest(BaseModel):
    instruction: str = Field(min_length=6, max_length=6000)
    target_id: str | None = Field(default=None, max_length=64)
    current: dict | None = None


@router.post("/acceptance/draft")
def draft_plan(body: DraftRequest):
    grounding = None
    if body.target_id:
        try:
            grounding = page_map(find_target(body.target_id))
        except HTTPException:
            grounding = None  # Still draft; the steps are flagged as unmapped by the UI.
    current = body.current if body.current and body.current.get("steps") else None
    try:
        result = planner.draft(body.instruction, grounding, current)
    except planner.PlannerError as exc:
        raise HTTPException(exc.status, exc.message) from exc
    result["grounded"] = grounding is not None
    return result


@router.get("/voice/status")
def voice_status():
    live = bool(os.getenv("DEEPGRAM_API_KEY") and os.getenv("DEEPGRAM_PROJECT_ID"))
    return {"live_mic": live, "drafting": "groq" if llm.configured() else None}


@router.get("/voice/token")
def voice_token():
    """Mints a ten second Deepgram key so the browser can stream audio without seeing the real key."""
    api_key, project = os.getenv("DEEPGRAM_API_KEY"), os.getenv("DEEPGRAM_PROJECT_ID")
    if not api_key or not project:
        raise HTTPException(503, "Live mic needs DEEPGRAM_API_KEY and DEEPGRAM_PROJECT_ID in the API .env file.")
    try:
        response = httpx.post(f"https://api.deepgram.com/v1/projects/{project}/keys", timeout=8,
                              headers={"Authorization": f"Token {api_key}"},
                              json={"comment": "qlabs mic", "scopes": ["usage:write"], "time_to_live_in_seconds": 10})
        response.raise_for_status()
        return {"key": response.json()["key"]}
    except Exception as exc:
        raise HTTPException(502, "The speech service did not answer. Type or use Wispr Flow instead.") from exc


class RunRequest(BaseModel):
    plan_id: str = Field(min_length=1, max_length=64)
    target_id: str = Field(min_length=1, max_length=64)
    watch: bool = False


def supervise(run_id, watch=False):
    try:
        command = [sys.executable, "-m", "app.acceptance_worker", run_id] + (["--watch"] if watch else [])
        subprocess.run(command, cwd=str(API_DIR), timeout=120, check=True, creationflags=NO_WINDOW,
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        run = store.get_run(run_id)
        if run and run["status"] in {"queued", "running"}:
            store.finish(run_id, "errored", run["results"], "The worker exited before completing the required checks.")
    except Exception:
        run = store.get_run(run_id)
        store.finish(run_id, "errored", run["results"] if run else [], "The worker timed out or could not start.")


@router.post("/acceptance/runs", status_code=202)
def start_run(body: RunRequest):
    if not store.get_plan(body.plan_id):
        raise HTTPException(404, "Saved test not found.")
    target = next((item for item in targets() if item["id"] == body.target_id), None)
    if target is None:
        raise HTTPException(422, "Choose one of your apps to run against.")
    try:
        run = store.create_run(body.plan_id, target["url"])
    except ValueError as exc:
        raise HTTPException(429, str(exc)) from exc
    executor.submit(supervise, run["id"], body.watch)
    return run


@router.get("/acceptance/runs")
def list_runs():
    return store.list_runs()


@router.get("/acceptance/runs/{run_id}")
def get_run(run_id: str):
    run = store.get_run(run_id)
    if not run:
        raise HTTPException(404, "Run not found.")
    return run


@router.post("/acceptance/runs/{run_id}/cancel")
def cancel_run(run_id: str):
    run = store.cancel(run_id)
    if not run:
        raise HTTPException(404, "Run not found.")
    return run


@router.get("/acceptance/runs/{run_id}/screenshots/{filename}")
def screenshot(run_id: str, filename: str):
    run = store.get_run(run_id)
    if not run or filename not in {step.get("screenshot") for step in run["results"]}:
        raise HTTPException(404, "Screenshot not found.")
    if not run_id.isalnum() or "/" in filename or "\\" in filename:
        raise HTTPException(404, "Screenshot not found.")
    path = artifact_directory() / run_id / filename
    if not path.is_file():
        raise HTTPException(404, "Screenshot no longer available.")
    return FileResponse(path, media_type="image/png")


@router.get("/acceptance/plans/{plan_id}/export")
def export_plan(plan_id: str):
    saved = store.get_plan(plan_id)
    if not saved:
        raise HTTPException(404, "Saved test not found.")
    plan = TestPlan.model_validate(saved["body"]).require_assertions()
    lines = ["import { test, expect, type Locator } from '@playwright/test';", "",
             "// Set BASE_URL to the app you want to test before running this file.",
             "const baseURL = process.env.BASE_URL;",
             "if (!baseURL) throw new Error('Set BASE_URL before running this test');", "",
             "async function fillField(field: Locator, value: string) {",
             "  if (await field.evaluate(el => el.tagName === 'SELECT')) await field.selectOption({ label: value });",
             "  else await field.fill(value);",
             "}", "",
             f"test({json.dumps(plan.name)}, async ({{ page }}) => {{", "  await page.goto(baseURL);"]
    for step in plan.steps:
        if step.action == "navigate":
            lines.append(f"  await page.goto(baseURL.replace(/\\/$/, '') + {json.dumps(step.path)});")
        elif step.action == "assert_url":
            lines.append(f"  await expect(page).toHaveURL(baseURL.replace(/\\/$/, '') + {json.dumps(step.path)});")
        else:
            locator = f"page.locator({json.dumps(step.selector)})"
            if step.action == "click":
                lines.append(f"  await {locator}.click();")
            elif step.action == "fill":
                lines.append(f"  await fillField({locator}, {json.dumps(step.value)});")
            else:
                lines.append(f"  await expect({locator}).toHaveText({json.dumps(step.expected)});")
    lines.append("});")
    return {"filename": "acceptance.spec.ts", "source": "\n".join(lines)}
