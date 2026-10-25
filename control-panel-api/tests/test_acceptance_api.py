import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.acceptance_api import router
from app import acceptance_store as store
from app.test_plan import TestPlan


PLAN = {"name": "Checkout email", "steps": [
    {"action": "click", "selector": "#submit-order"},
    {"action": "assert_text", "selector": "#checkout-message", "expected": "Email is required"},
]}


class AcceptanceApiTests(unittest.TestCase):
    def setUp(self):
        directory = tempfile.TemporaryDirectory()
        self.addCleanup(directory.cleanup)
        self.env = patch.dict(os.environ, {"QLABS_ACCEPTANCE_DB": str(Path(directory.name) / "test.db")})
        self.env.start()
        self.addCleanup(self.env.stop)
        app = FastAPI()
        app.include_router(router)
        self.client = TestClient(app)
        self.addCleanup(self.client.close)

    def test_action_only_plan_is_rejected(self):
        response = self.client.post("/api/acceptance/plans", json={"name": "No assertion", "steps": [{"action": "click", "selector": "button"}]})
        self.assertEqual(response.status_code, 422)

    def test_pass_requires_complete_step_evidence(self):
        saved = store.save_plan(TestPlan.model_validate(PLAN))
        run = store.create_run(saved["id"], "http://127.0.0.1:8120/fixed")
        store.claim(run["id"])
        store.finish(run["id"], "passed", [])
        self.assertEqual(store.get_run(run["id"])["status"], "errored")

    def test_interrupted_suite_progress_survives_restart(self):
        suite = {"id": "suite-test", "total": 2, "done": 1, "passed": 1, "failed": 0, "errored": 0, "finished": False, "run_ids": ["completed-run"]}
        store.save_suite(suite)
        store.recover_interrupted()
        saved = store.get_suite(suite["id"])
        self.assertTrue(saved["finished"])
        self.assertEqual(saved["done"], 1)
        self.assertEqual(saved["run_ids"], ["completed-run"])
        self.assertIn("interrupted", saved["reason"])

    def test_invalid_target_addresses_are_validation_errors(self):
        for address in ["http://localhost:invalid", "http://localhost:99999", "http://user:password@localhost:3000", "http://localhost/a\\b"]:
            self.assertEqual(self.client.post("/api/acceptance/targets", json={"name": "App", "url": address}).status_code, 422)

    def test_missing_grounding_flags_every_selector(self):
        response_plan = {"plan": PLAN, "summary": "Drafted.", "unmapped": []}
        with patch("app.acceptance_api.page_map", side_effect=__import__("fastapi").HTTPException(502, "Offline")), patch("app.acceptance_api.planner.draft", return_value=response_plan):
            response = self.client.post("/api/acceptance/draft", json={"instruction": "Check that email is required", "target_id": "sample-fixed"})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["unmapped"], [0, 1])
        self.assertFalse(response.json()["grounded"])

    def test_passing_a_different_contract_with_same_name_does_not_hide_failure(self):
        from app.acceptance_insights import brief_facts
        first = store.save_plan(TestPlan.model_validate(PLAN))
        changed = {**PLAN, "steps": [PLAN["steps"][0], {**PLAN["steps"][1], "expected": "Something else"}]}
        second = store.save_plan(TestPlan.model_validate(changed))
        for saved, state in [(first, "failed"), (second, "passed")]:
            run = store.create_run(saved["id"], "http://127.0.0.1:8120/fixed")
            store.claim(run["id"])
            store.finish(run["id"], state, [{"index": index, "action": step["action"], "status": state if index else "passed"} for index, step in enumerate(saved["body"]["steps"])])
        self.assertEqual(len(brief_facts()["open_failures"]), 1)

    def test_saved_contract_is_exported_without_changing_expectations(self):
        saved = self.client.post("/api/acceptance/plans", json=PLAN).json()
        source = self.client.get(f"/api/acceptance/plans/{saved['id']}/export").json()["source"]
        self.assertIn('toHaveText("Email is required")', source)
        self.assertIn("process.env.BASE_URL", source)
        self.assertEqual(self.client.get("/api/acceptance/plans").json()[0]["body"], PLAN)

    def test_arbitrary_target_is_rejected(self):
        saved = self.client.post("/api/acceptance/plans", json=PLAN).json()
        response = self.client.post("/api/acceptance/runs", json={"plan_id": saved["id"], "target_id": "http://arbitrary.invalid"})
        self.assertEqual(response.status_code, 422)

    def test_runs_keep_the_same_plan_and_cannot_be_claimed_twice(self):
        saved = self.client.post("/api/acceptance/plans", json=PLAN).json()
        with patch("app.acceptance_api.executor.submit"):
            run = self.client.post("/api/acceptance/runs", json={"plan_id": saved["id"], "target_id": "sample-fixed"}).json()
        self.assertEqual(run["plan_id"], saved["id"])
        self.assertTrue(store.claim(run["id"]))
        self.assertFalse(store.claim(run["id"]))
        store.recover_interrupted()
        self.assertEqual(store.get_run(run["id"])["status"], "errored")
        store.finish(run["id"], "passed", [])
        self.assertEqual(store.get_run(run["id"])["status"], "errored")

    def test_queue_is_bounded(self):
        saved = self.client.post("/api/acceptance/plans", json=PLAN).json()
        with patch("app.acceptance_api.executor.submit"):
            for _ in range(5):
                response = self.client.post("/api/acceptance/runs", json={"plan_id": saved["id"], "target_id": "sample-fixed"})
                self.assertEqual(response.status_code, 202)
            self.assertEqual(self.client.post("/api/acceptance/runs", json={"plan_id": saved["id"], "target_id": "sample-fixed"}).status_code, 429)

    def test_only_local_apps_can_be_added_and_removed(self):
        self.assertEqual(self.client.post("/api/acceptance/targets", json={"name": "Shop", "url": "https://example.com"}).status_code, 422)
        self.assertEqual(self.client.post("/api/acceptance/targets", json={"name": "Shop", "url": "localhost:3001"}).status_code, 422)
        created = self.client.post("/api/acceptance/targets", json={"name": "SaySketch", "url": "http://localhost:3001/"})
        self.assertEqual(created.status_code, 201)
        self.assertEqual(created.json()["url"], "http://localhost:3001")
        ids = [item["id"] for item in self.client.get("/api/acceptance/targets").json()]
        self.assertEqual(ids[:2], ["sample-broken", "sample-fixed"])
        self.assertIn(created.json()["id"], ids)
        self.assertEqual(self.client.delete(f"/api/acceptance/targets/{created.json()['id']}").status_code, 204)
        self.assertEqual(self.client.delete("/api/acceptance/targets/sample-fixed").status_code, 404)

    def test_draft_is_grounded_and_flags_selectors_missing_from_the_page(self):
        page = {"url": "http://127.0.0.1:8120/broken", "title": "Checkout", "elements": [
            {"selector": "#submit-order", "tag": "button", "text": "Place order"},
            {"selector": "#checkout-message", "tag": "p", "live": True},
        ]}
        reply = '{"summary": "Added a check.", "name": "Email needed", "steps": [' \
                '{"action": "click", "selector": "#submit-order"},' \
                '{"action": "assert_text", "selector": "#made-up", "expected": "Email is required"}]}'
        with patch.dict(os.environ, {"GROQ_API_KEY": "test"}), \
                patch("app.acceptance_api.page_map", return_value=page), \
                patch("app.planner.llm.complete", return_value=reply) as ask:
            response = self.client.post("/api/acceptance/draft", json={
                "instruction": "press place order and it should say email is required", "target_id": "sample-broken"})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["unmapped"], [1])
        self.assertTrue(response.json()["grounded"])
        self.assertIn("#checkout-message", ask.call_args.args[1])

    def test_draft_without_an_expected_result_is_refused(self):
        reply = '{"summary": "x", "name": "Click", "steps": [{"action": "click", "selector": "#submit-order"}]}'
        with patch.dict(os.environ, {"GROQ_API_KEY": "test"}), patch("app.planner.llm.complete", return_value=reply):
            response = self.client.post("/api/acceptance/draft", json={"instruction": "just click place order"})
        self.assertEqual(response.status_code, 422)

    def test_brief_needs_results_and_only_reports_open_failures(self):
        from app import acceptance_insights
        app = FastAPI()
        app.include_router(acceptance_insights.router)
        client = TestClient(app)
        self.addCleanup(client.close)
        self.assertEqual(client.post("/api/acceptance/brief").status_code, 422)

        saved = store.save_plan(TestPlan.model_validate(PLAN))
        broken = "http://127.0.0.1:8120/broken"
        failure = [{"index": 0, "action": "click", "status": "passed"},
                   {"index": 1, "action": "assert_text", "status": "failed", "expected": "Email is required", "actual": ["Order confirmed"]}]
        passed = [{"index": 0, "action": "click", "status": "passed"}, {"index": 1, "action": "assert_text", "status": "passed"}]
        for status, results in (("failed", failure), ("passed", passed)):  # failed first, then fixed
            run = store.create_run(saved["id"], broken)
            store.claim(run["id"])
            store.finish(run["id"], status, results)
        facts = acceptance_insights.brief_facts()
        self.assertEqual(facts["open_failures"], [])
        self.assertEqual(facts["failed_before_but_now_passing"], [{"test": "Checkout email", "app": "Demo store, broken build"}])

        reply = '{"headline": "Everything passes — nice.", "findings": [{"severity": "good", "title": "Fixed", "detail": "x"}], "suggestions": ["Try it."]}'
        with patch.dict(os.environ, {"GROQ_API_KEY": "test"}), patch("app.acceptance_insights.llm.complete", return_value=reply) as ask:
            brief = client.post("/api/acceptance/brief").json()
            client.post("/api/acceptance/brief")  # same data, served from the cache
        self.assertEqual(ask.call_count, 1)
        self.assertNotIn("—", brief["headline"])
        self.assertEqual(brief["findings"][0]["severity"], "good")

    def test_suite_needs_a_known_app_and_saved_tests(self):
        from app import acceptance_insights
        app = FastAPI()
        app.include_router(acceptance_insights.router)
        client = TestClient(app)
        self.addCleanup(client.close)
        self.assertEqual(client.post("/api/acceptance/suites", json={"target_id": "nope"}).status_code, 404)
        self.assertEqual(client.post("/api/acceptance/suites", json={"target_id": "sample-fixed"}).status_code, 422)
        self.assertEqual(client.get("/api/acceptance/suites/missing").status_code, 404)

    def test_cancellation_keeps_completed_results_and_prevents_late_pass(self):
        saved = self.client.post("/api/acceptance/plans", json=PLAN).json()
        with patch("app.acceptance_api.executor.submit"):
            run = self.client.post("/api/acceptance/runs", json={"plan_id": saved["id"], "target_id": "sample-fixed"}).json()
        self.assertTrue(store.claim(run["id"]))
        evidence = [{"index": 0, "status": "passed", "action": "click"}]
        store.progress(run["id"], evidence)
        response = self.client.post(f"/api/acceptance/runs/{run['id']}/cancel")
        self.assertEqual(response.json()["status"], "cancelled")
        self.assertEqual(response.json()["results"], evidence)
        self.assertFalse(store.claim(run["id"]))
        store.finish(run["id"], "passed", [])
        self.assertEqual(store.get_run(run["id"])["status"], "cancelled")
