"""Dashboard support: the AI brief, suites (every saved test on one app) and demo data.

Everything here is built from real runs. The brief only restates facts it is given, and the demo
seed creates real tests and runs them in the browser like any other run.
"""

import json
import hashlib
import threading
import time
import uuid

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app import acceptance_store as store
from app import llm
from app.test_plan import TestPlan

router = APIRouter(prefix="/api/acceptance", tags=["Acceptance dashboard"])

DEMO_TESTS = [
    {"name": "Checkout requires an email", "steps": [
        {"action": "click", "selector": "#submit-order"},
        {"action": "assert_text", "selector": "#checkout-message", "expected": "Email is required"},
    ]},
    {"name": "Promo code lowers the total", "steps": [
        {"action": "fill", "selector": "#promo-code", "value": "SAVE10"},
        {"action": "click", "selector": "#apply-promo"},
        {"action": "assert_text", "selector": "#total", "expected": "$21.60"},
    ]},
    {"name": "A valid order is confirmed", "steps": [
        {"action": "fill", "selector": "#email", "value": "jo@example.com"},
        {"action": "click", "selector": "#submit-order"},
        {"action": "assert_text", "selector": "#checkout-message", "expected": "Order confirmed"},
    ]},
    {"name": "Promo code shows a confirmation", "steps": [
        {"action": "fill", "selector": "#promo-code", "value": "SAVE10"},
        {"action": "click", "selector": "#apply-promo"},
        {"action": "assert_text", "selector": "#promo-message", "expected": "SAVE10 applied"},
    ]},
]

_suites: dict[str, dict] = {}
_lock = threading.Lock()


def _targets():
    from app.acceptance_api import targets
    return targets()


def _run_sequence(suite_id, jobs):
    """Runs (plan_id, target) pairs one at a time, so a suite never fills the shared queue."""
    from app.acceptance_api import supervise, executor
    for plan_id, target in jobs:
        run = None
        for _ in range(240):  # wait up to two minutes for a free slot
            try:
                run = store.create_run(plan_id, target["url"])
                break
            except ValueError:
                time.sleep(0.5)
        if run is None:
            with _lock:
                _suites[suite_id]["done"] += 1
                _suites[suite_id]["errored"] += 1
                _suites[suite_id]["reason"] = "A job could not start because the execution queue remained full."
                store.save_suite(_suites[suite_id])
            continue
        with _lock:
            _suites[suite_id]["run_ids"].append(run["id"])
            store.save_suite(_suites[suite_id])
        executor.submit(supervise, run["id"]).result()
        status = store.get_run(run["id"])["status"]
        with _lock:
            suite = _suites[suite_id]
            suite["done"] += 1
            suite[status if status in ("passed", "failed") else "errored"] += 1
            store.save_suite(suite)
    with _lock:
        _suites[suite_id]["finished"] = True
        store.save_suite(_suites[suite_id])


def _start_suite(jobs, label):
    suite_id = uuid.uuid4().hex[:12]
    with _lock:
        if any(not suite["finished"] for suite in _suites.values()):
            raise HTTPException(409, "A suite is already running. Wait for it to finish before starting another.")
        _suites[suite_id] = {"id": suite_id, "label": label, "total": len(jobs), "done": 0, "passed": 0,
                             "failed": 0, "errored": 0, "finished": not jobs, "run_ids": []}
        snapshot = dict(_suites[suite_id])
        store.save_suite(snapshot)
    def guarded_sequence():
        try:
            _run_sequence(suite_id, jobs)
        except Exception:
            with _lock:
                suite = _suites[suite_id]
                suite.update(finished=True, reason="Suite execution was interrupted. Inspect completed runs and retry.")
                store.save_suite(suite)
    threading.Thread(target=guarded_sequence, daemon=True).start()
    return snapshot


def unique_plans():
    """Latest saved copy of each distinct test body (saved tests are immutable, so edits pile up)."""
    seen, plans = set(), []
    for plan in store.list_plans():
        key = json.dumps(plan["body"], sort_keys=True)
        if key not in seen:
            seen.add(key)
            plans.append(plan)
    return plans


class SuiteRequest(BaseModel):
    target_id: str = Field(min_length=1, max_length=64)
    limit: int = Field(default=10, ge=1, le=25)


@router.post("/suites", status_code=202)
def run_suite(body: SuiteRequest):
    target = next((item for item in _targets() if item["id"] == body.target_id), None)
    if target is None:
        raise HTTPException(404, "That app is not in your list.")
    plans = unique_plans()[: body.limit]
    if not plans:
        raise HTTPException(422, "There are no saved tests yet. Create one in the studio first.")
    return _start_suite([(plan["id"], target) for plan in plans], f"All tests on {target['name']}")


@router.get("/suites/{suite_id}")
def get_suite(suite_id: str):
    with _lock:
        suite = _suites.get(suite_id) or store.get_suite(suite_id)
        if not suite:
            raise HTTPException(404, "Suite not found.")
        return dict(suite)


@router.post("/demo", status_code=202)
def seed_demo():
    """Saves the four demo tests (once) and runs each on the broken and the fixed build."""
    existing = {json.dumps(plan["body"], sort_keys=True): plan for plan in store.list_plans()}
    saved = []
    for test in DEMO_TESTS:
        plan = TestPlan.model_validate(test)
        match = existing.get(json.dumps(plan.model_dump(), sort_keys=True))
        saved.append(match or store.save_plan(plan))
    by_id = {item["id"]: item for item in _targets()}
    jobs = [(plan["id"], by_id[target_id]) for target_id in ("sample-broken", "sample-fixed") for plan in saved]
    return _start_suite(jobs, "Demo data")


# --- AI brief ---------------------------------------------------------------------------------

BRIEF_RULES = """You write a short status brief for a developer about their browser acceptance tests.
Use ONLY the facts in the data. Never invent tests, numbers, pages or causes that the data does not support.
open_failures are the problems that exist right now; lead with them. failed_before_but_now_passing are fixes worth
one "good" finding. When you suggest a likely cause, base it on the expected and actual values, and say it is likely.
If there are no open failures, say so in the headline.

Return one JSON object:
{"headline": string, "findings": [{"severity": "critical" | "warning" | "good", "title": string, "detail": string}],
 "suggestions": [string]}

headline: one sentence under 100 characters with the single most important fact.
findings: at most 3, most important first. title under 60 characters. detail one or two plain sentences that quote
the expected and actual values when there is a failure.
suggestions: at most 3 new tests worth adding, each written as a sentence the developer could say out loud to the
test studio, for example "Enter an invalid email and check it says Email is required." Base them on elements and
behaviour that appear in the data.
Plain words, sentence case, no dashes, no emoji, no markdown."""

_brief_cache: dict[str, dict] = {}


def _step_text(step):
    if step["action"] == "assert_text":
        return f'check {step["selector"]} shows "{step["expected"]}"'
    if step["action"] == "assert_url":
        return f'check the URL is {step["path"]}'
    if step["action"] == "fill":
        return f'type "{step["value"]}" into {step["selector"]}'
    if step["action"] == "navigate":
        return f'open {step["path"]}'
    return f'click {step["selector"]}'


def _failures(run, plan, app_name):
    for result in run["results"]:
        if result["status"] in ("failed", "errored"):
            step = plan["body"]["steps"][result["index"]]
            yield {"test": plan["name"], "app": app_name, "step": f'{result["index"] + 1}. {_step_text(step)}',
                   "status": result["status"], "expected": result.get("expected"), "actual": result.get("actual"),
                   "reason": result.get("reason")}


def brief_facts():
    """Counts per app, plus the failures that are still open: the latest run of that test on that app."""
    runs = [run for run in store.list_runs() if run["status"] not in ("queued", "running")][:60]
    plans = {plan["id"]: plan for plan in store.list_plans()}
    names = {item["url"]: item["name"] for item in _targets()}
    per_app, open_failures, latest, resolved = {}, [], {}, []
    for run in runs:  # newest first, so the first run seen for a test and app is its latest
        app_name = names.get(run["target"], run["target"])
        app = per_app.setdefault(app_name, {"runs": 0, "passed": 0, "failed": 0, "errored": 0})
        app["runs"] += 1
        if run["status"] in app:
            app[run["status"]] += 1
        plan = plans.get(run["plan_id"])
        if not plan:
            continue
        key = (json.dumps(plan["body"], sort_keys=True), run["target"])
        if key not in latest:
            latest[key] = run["status"]
            if run["status"] in ("failed", "errored") and len(open_failures) < 12:
                open_failures.extend(list(_failures(run, plan, app_name))[: 12 - len(open_failures)])
        elif latest[key] == "passed" and run["status"] in ("failed", "errored"):
            entry = {"test": plan["name"], "app": app_name}
            if entry not in resolved:
                resolved.append(entry)
    tests = sorted({plan["name"] for plan in plans.values()})[:20]
    return {"runs_considered": len(runs), "apps": per_app, "open_failures": open_failures,
            "failed_before_but_now_passing": resolved[:8], "saved_tests": tests}


def _clean(value, limit):
    return str(value or "").replace("\u2014", ",").replace("\u2013", ",").strip()[:limit]


@router.post("/brief")
def write_brief(refresh: bool = False):
    facts = brief_facts()
    if not facts["runs_considered"]:
        raise HTTPException(422, "Run a few tests first. The brief is written from real results.")
    key = hashlib.sha256(json.dumps(facts, sort_keys=True, default=str).encode()).hexdigest()
    if not refresh and key in _brief_cache:
        return _brief_cache[key]
    try:
        text = llm.complete(BRIEF_RULES, "Data:\n" + json.dumps(facts, default=str), max_tokens=1500)
        data = json.loads(text[text.find("{"): text.rfind("}") + 1])
        if not isinstance(data, dict) or not isinstance(data.get("findings", []), list) or not isinstance(data.get("suggestions", []), list):
            raise ValueError("Expected brief fields")
    except llm.LLMError as exc:
        raise HTTPException(exc.status, exc.message) from exc
    except (ValueError, TypeError) as exc:
        raise HTTPException(502, "The brief came back in the wrong shape. Try again.") from exc
    findings = [
        {"severity": item.get("severity") if item.get("severity") in ("critical", "warning", "good") else "warning",
         "title": _clean(item.get("title"), 80), "detail": _clean(item.get("detail"), 320)}
        for item in (data.get("findings") or [])[:3] if isinstance(item, dict) and item.get("title")
    ]
    result = {
        "headline": _clean(data.get("headline"), 140),
        "findings": findings,
        "suggestions": [_clean(item, 200) for item in (data.get("suggestions") or [])[:3] if item],
        "runs_considered": facts["runs_considered"],
        "generated_at": time.time(),
    }
    _brief_cache.clear()
    _brief_cache[key] = result
    return result
