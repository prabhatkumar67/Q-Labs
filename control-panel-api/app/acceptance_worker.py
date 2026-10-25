"""One bounded browser run per process. No model-generated JavaScript is executed.

Usage: python -m app.acceptance_worker <run_id> [--watch]
--watch opens a visible browser and slows each action down, so a person can follow the run.
"""

import os
from pathlib import Path
import sys
import time

from app import acceptance_store as store
from app.test_plan import TestPlan
from app.target_urls import navigation_url, same_origin

# Outline for the element a step used, so screenshots and watch mode show what was touched.
MARK = """(el, color) => {
  document.querySelectorAll('[data-qlabs-mark]').forEach(old => { old.style.outline = old.dataset.qlabsMark; delete old.dataset.qlabsMark; });
  el.dataset.qlabsMark = el.style.outline || '';
  el.style.outline = '3px solid ' + color;
  el.style.outlineOffset = '2px';
}"""
COLORS = {"passed": "#1f9d55", "failed": "#e5484d", "action": "#3b82f6"}


def artifact_directory():
    return Path(os.getenv("QLABS_ARTIFACT_DIR", str(Path(__file__).parents[1] / "data/acceptance-artifacts")))


def mark(locator, color):
    try:
        locator.evaluate(MARK, color)
    except Exception:
        pass  # Highlighting is cosmetic and must never change a result.


def run_step(page, origin, step, result, expect):
    """Performs one step and fills in expected and actual values. Raises AssertionError on a mismatch."""
    if step.action == "navigate":
        response = page.goto(navigation_url(origin, step.path), wait_until="domcontentloaded", timeout=15000)
        if response is None or response.status >= 400:
            raise RuntimeError("The target page could not be loaded.")
        return
    if step.action == "assert_url":
        result["expected"] = navigation_url(origin, step.path)
        try:
            expect(page).to_have_url(result["expected"])
        finally:
            # Read after the wait, so a navigation that is still finishing is reported correctly.
            result["actual"] = page.url
        return
    locator = page.locator(step.selector)
    if step.action == "assert_text":
        result["expected"] = step.expected
        try:
            expect(locator).to_have_text(step.expected)
        except AssertionError:
            mark(locator, COLORS["failed"])
            raise
        mark(locator, COLORS["passed"])
        result["actual"] = locator.inner_text()
        return
    locator.scroll_into_view_if_needed()
    mark(locator, COLORS["action"])
    if step.action == "click":
        locator.click()
    elif locator.evaluate("el => el.tagName") == "SELECT":
        locator.select_option(label=step.value)
    else:
        locator.fill(step.value)


def failure_reason(step, exc):
    if isinstance(exc, AssertionError):
        return "The page showed different text." if step.action == "assert_text" else "The browser ended on a different URL."
    if getattr(step, "selector", None):
        return f"Could not find or use {step.selector} within 5 seconds ({type(exc).__name__})."
    return f"Could not complete this step ({type(exc).__name__})."


def execute(run_id, watch=False):
    if not store.claim(run_id):
        return
    results = []
    try:
        from playwright.sync_api import sync_playwright, expect
        expect.set_options(timeout=3000)  # checks settle quickly; a slow mismatch should not stall the run
        run = store.get_run(run_id)
        plan = TestPlan.model_validate(store.get_plan(run["plan_id"])["body"]).require_assertions()
        directory = artifact_directory() / run_id
        directory.mkdir(parents=True, exist_ok=True)
        origin = run["target"].rstrip("/")
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(
                headless=not watch, slow_mo=450 if watch else 0,
                args=["--window-size=1300,900", "--window-position=80,60"] if watch else [],
            )
            context = browser.new_context(viewport={"width": 1280, "height": 800})
            context.set_default_timeout(5000)
            # Controlled app only. Deny browser subrequests to unrelated origins.
            context.route("**/*", lambda route: route.continue_() if (
                same_origin(route.request.url, origin)
            ) else route.abort())
            page = context.new_page()
            status = "passed"
            try:
                page.goto(origin, wait_until="domcontentloaded", timeout=15000)
                for index, step in enumerate(plan.steps):
                    if store.get_run(run_id)["status"] == "cancelled":
                        break
                    result = {"index": index, "action": step.action, "status": "passed"}
                    started = time.perf_counter()
                    try:
                        run_step(page, origin, step, result, expect)
                    except Exception as exc:
                        status = result["status"] = "failed" if isinstance(exc, AssertionError) else "errored"
                        result["reason"] = failure_reason(step, exc)
                        if isinstance(exc, AssertionError) and step.action == "assert_text":
                            result["actual"] = page.locator(step.selector).all_text_contents()
                    result["ms"] = round((time.perf_counter() - started) * 1000)
                    try:
                        page.screenshot(path=str(directory / f"step-{index}.png"))
                        result["screenshot"] = f"step-{index}.png"
                    except Exception:
                        pass
                    results.append(result)
                    store.progress(run_id, results)
                    if status != "passed":
                        results += [{"index": later, "action": plan.steps[later].action, "status": "blocked",
                                     "reason": "An earlier step did not complete."} for later in range(index + 1, len(plan.steps))]
                        break
                if watch:
                    page.wait_for_timeout(1500)  # leave the final state on screen for a moment
            finally:
                context.close()
                browser.close()
        store.finish(run_id, status, results)
    except Exception as exc:
        store.finish(run_id, "errored", results, f"Browser execution unavailable ({type(exc).__name__}). Verify worker setup.")


if __name__ == "__main__":
    execute(sys.argv[1], watch="--watch" in sys.argv[2:])
