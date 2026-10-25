"""Opt-in real Chromium checks against an independent app, without model calls."""

from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import os
from pathlib import Path
import tempfile
import threading
import unittest
from unittest.mock import patch

from app import acceptance_store as store
from app.acceptance_worker import execute
from app.page_inspect import inspect
from app.test_plan import TestPlan


class AppHandler(BaseHTTPRequestHandler):
    def log_message(self, *_):
        pass

    def do_GET(self):
        if self.path == "/nested/start":
            body = '<html><title>Independent app</title><p id="status"></p><a id="continue" href="/done">Continue</a><script src="/assets/start.js"></script></html>'
            mime = "text/html"
        elif self.path == "/assets/start.js":
            body, mime = 'document.querySelector("#status").textContent="Ready";', "text/javascript"
        elif self.path == "/done":
            body, mime = '<html><p id="done">Done</p></html>', "text/html"
        else:
            self.send_error(404)
            return
        self.send_response(200)
        self.send_header("Content-Type", mime)
        self.end_headers()
        self.wfile.write(body.encode())


@unittest.skipUnless(os.getenv("QLABS_WORKER_E2E") == "1", "Requires installed Playwright Chromium")
class IndependentAppTests(unittest.TestCase):
    def test_nested_start_loads_root_assets_and_navigation_and_url_assertions_agree(self):
        server = ThreadingHTTPServer(("127.0.0.1", 0), AppHandler)
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        self.addCleanup(server.server_close)
        self.addCleanup(server.shutdown)
        root = f"http://127.0.0.1:{server.server_port}"
        with tempfile.TemporaryDirectory() as temporary, patch.dict(os.environ, {
            "QLABS_ACCEPTANCE_DB": str(Path(temporary) / "acceptance.db"),
            "QLABS_ARTIFACT_DIR": str(Path(temporary) / "artifacts"),
        }):
            page = inspect(root + "/nested/start")
            self.assertTrue(any(item.get("text") == "Ready" for item in page["elements"]))
            plan = TestPlan.model_validate({"name": "Independent navigation", "steps": [
                {"action": "assert_text", "selector": "#status", "expected": "Ready"},
                {"action": "click", "selector": "#continue"},
                {"action": "assert_url", "path": "/done"},
                {"action": "assert_text", "selector": "#done", "expected": "Done"},
            ]})
            saved = store.save_plan(plan)
            run = store.create_run(saved["id"], root + "/nested/start")
            execute(run["id"])
            completed = store.get_run(run["id"])
            self.assertEqual(completed["status"], "passed", completed)
            self.assertEqual(completed["results"][2]["expected"], root + "/done")
            self.assertEqual(completed["results"][2]["actual"], root + "/done")
