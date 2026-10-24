import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.acceptance_api import router
from app import acceptance_store as store


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
