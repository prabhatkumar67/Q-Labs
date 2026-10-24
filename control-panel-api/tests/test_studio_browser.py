"""Opt-in integration checks against the running UI, API and demo store.

QLABS_UI_E2E=1 python -m unittest discover -s tests -p test_studio_browser.py -v
"""

import os
from pathlib import Path
import tempfile
import unittest


@unittest.skipUnless(os.getenv("QLABS_UI_E2E") == "1", "Requires running local UI, API and demo store")
class StudioBrowserTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        from playwright.sync_api import sync_playwright
        cls.playwright = sync_playwright().start()
        cls.browser = cls.playwright.chromium.launch()
        cls.base = os.getenv("QLABS_UI_URL", "http://127.0.0.1:3000")
        cls.artifacts = Path(tempfile.gettempdir()) / "qlabs-development"
        cls.artifacts.mkdir(exist_ok=True)

    @classmethod
    def tearDownClass(cls):
        cls.browser.close()
        cls.playwright.stop()

    def open(self, **options):
        page = self.browser.new_page(**options)
        self.addCleanup(page.close)
        page.goto(self.base, wait_until="networkidle", timeout=90000)
        return page

    def test_failure_then_fixed_version_with_identical_contract_and_export(self):
        from playwright.sync_api import expect
        page = self.open(viewport={"width": 1440, "height": 1080})
        expect(page.get_by_role("heading", name="Test studio")).to_be_visible()
        page.get_by_role("button", name="Load sample").click()
        with page.expect_response(lambda response: response.url.endswith("/api/acceptance/runs") and response.request.method == "POST") as first:
            page.get_by_role("button", name="Run test").click()
        broken_run = first.value.json()
        expect(page.locator(".qs-status").get_by_text("Failed", exact=True)).to_be_visible(timeout=60000)
        expect(page.locator(".qs-compare code.is-wrong").get_by_text("Order confirmed")).to_be_visible()
        page.screenshot(path=str(self.artifacts / "studio-failed.png"), full_page=True)
        page.get_by_label("Target").select_option("sample-fixed")
        with page.expect_response(lambda response: response.url.endswith("/api/acceptance/runs") and response.request.method == "POST") as second:
            page.get_by_role("button", name="Run test").click()
        fixed_run = second.value.json()
        self.assertEqual(broken_run["plan_id"], fixed_run["plan_id"])
        expect(page.locator(".qs-status").get_by_text("Passed", exact=True)).to_be_visible(timeout=60000)
        expect(page.get_by_role("img", name="Browser capture after step 2")).to_be_visible()
        page.get_by_role("button", name="Export").click()
        with page.expect_download() as export:
            page.get_by_role("menuitem", name="Export Playwright").click()
        content = Path(export.value.path()).read_text(encoding="utf-8")
        self.assertIn('toHaveText("Email is required")', content)
        (self.artifacts / "exported-acceptance.spec.ts").write_text(content, encoding="utf-8")
        page.screenshot(path=str(self.artifacts / "studio-desktop.png"), full_page=True)

    def test_spoken_command_switches_target_and_runs(self):
        from playwright.sync_api import expect
        page = self.open(viewport={"width": 1440, "height": 1080})
        page.get_by_role("button", name="Load sample").click()
        box = page.get_by_label("What should the test do")
        box.fill("Okay, run it on the fixed build.")
        box.press("Control+Enter")
        expect(page.get_by_label("Target")).to_have_value("sample-fixed")
        expect(page.locator(".qs-log").get_by_text("Passed. The check matched.")).to_be_visible(timeout=60000)
        box.fill("undo")
        box.press("Control+Enter")
        expect(page.locator(".qs-log").get_by_text("Undid the last change.")).to_be_visible()
        expect(page.get_by_text("0 steps, 0 assertions", exact=True)).to_be_visible()

    def test_mobile_alignment_and_existing_dashboard_navigation(self):
        from playwright.sync_api import expect
        page = self.open(viewport={"width": 390, "height": 844}, is_mobile=True, device_scale_factor=1)
        expect(page.get_by_role("heading", name="Describe the test")).to_be_visible()
        self.assertTrue(page.evaluate("document.documentElement.scrollWidth <= innerWidth"))
        page.screenshot(path=str(self.artifacts / "studio-mobile.png"), full_page=True)
        page.get_by_role("button", name="Open navigation").click()
        page.get_by_role("navigation", name="Mobile navigation").get_by_role("link", name="Dashboard", exact=True).click()
        expect(page.get_by_role("heading", name="Dashboard", exact=True)).to_be_visible()
        self.assertTrue(page.url.endswith("/dashboard"))

    def test_assertions_are_required_before_running(self):
        from playwright.sync_api import expect
        page = self.open()
        expect(page.get_by_role("button", name="Run test")).to_be_disabled()
        page.get_by_role("button", name="Load sample").click()
        page.get_by_role("button", name="Remove step 2", exact=True).click()
        expect(page.get_by_role("button", name="Run test")).to_be_disabled()
        expect(page.get_by_text("1 step, 0 assertions", exact=True)).to_be_visible()
