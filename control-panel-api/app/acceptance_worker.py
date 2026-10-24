"""One bounded browser run per process. No model-generated JavaScript is executed."""

import os
from pathlib import Path
import sys
from urllib.parse import urlsplit

from app import acceptance_store as store
from app.test_plan import TestPlan


def artifact_directory():
    return Path(os.getenv("QLABS_ARTIFACT_DIR", str(Path(__file__).parents[1] / "data/acceptance-artifacts")))


def execute(run_id):
    if not store.claim(run_id):
        return
    results = []
    try:
        from playwright.sync_api import sync_playwright, expect
        run = store.get_run(run_id)
        saved = store.get_plan(run["plan_id"])
        plan = TestPlan.model_validate(saved["body"]).require_assertions()
        directory = artifact_directory() / run_id
        directory.mkdir(parents=True, exist_ok=True)
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch()
            context = browser.new_context(viewport={"width": 1280, "height": 800})
            context.set_default_timeout(5000)
            origin = run["target"].rstrip("/")
            # Controlled app only. Deny browser subrequests to unrelated origins.
            context.route("**/*", lambda route: route.continue_() if (
                route.request.url.startswith(origin + "/") or route.request.url == origin
            ) else route.abort())
            page = context.new_page()
            status = "passed"
            try:
                page.goto(origin, wait_until="domcontentloaded", timeout=15000)
                for index, step in enumerate(plan.steps):
                    if store.get_run(run_id)["status"] == "cancelled":
                        break
                    result = {"index": index, "action": step.action, "status": "passed"}
                    try:
                        if step.action == "navigate":
                            response = page.goto(origin + step.path, wait_until="domcontentloaded", timeout=15000)
                            if response is None or response.status >= 400:
                                raise RuntimeError("The target page could not be loaded.")
                        elif step.action in {"click", "fill", "assert_text"}:
                            locator = page.locator(step.selector)
                            if step.action == "click":
                                locator.click()
                            elif step.action == "fill":
                                if locator.evaluate("el => el.tagName") == "SELECT":
                                    locator.select_option(label=step.value)
                                else:
                                    locator.fill(step.value)
                            else:
                                result["expected"] = step.expected
                                expect(locator).to_have_text(step.expected)
                                result["actual"] = locator.inner_text()
                        elif step.action == "assert_url":
                            result.update(expected=step.path, actual=urlsplit(page.url).path)
                            expect(page).to_have_url(origin + step.path)
                    except AssertionError:
                        status = result["status"] = "failed"
                        result["reason"] = ("The page showed different text." if step.action == "assert_text"
                                            else "The browser ended on a different URL.")
                        if step.action == "assert_text":
                            result["actual"] = page.locator(step.selector).all_text_contents()
                    except Exception as exc:
                        status = result["status"] = "errored"
                        if getattr(step, "selector", None):
                            result["reason"] = f"Could not find or use {step.selector} within 5 seconds ({type(exc).__name__})."
                        else:
                            result["reason"] = f"Could not complete this step ({type(exc).__name__})."
                    image = f"step-{index}.png"
                    try:
                        page.screenshot(path=str(directory / image))
                        result["screenshot"] = image
                    except Exception:
                        pass
                    results.append(result)
                    store.progress(run_id, results)
                    if status != "passed":
                        for remaining in range(index + 1, len(plan.steps)):
                            results.append({"index": remaining, "action": plan.steps[remaining].action, "status": "blocked",
                                            "reason": "An earlier step did not complete."})
                        break
            finally:
                context.close()
                browser.close()
        store.finish(run_id, status, results)
    except Exception as exc:
        store.finish(run_id, "errored", results, f"Browser execution unavailable ({type(exc).__name__}). Verify worker setup.")


if __name__ == "__main__":
    execute(sys.argv[1])
