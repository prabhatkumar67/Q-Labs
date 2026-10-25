"""Opt-in browser regressions for concurrency and microphone finalization."""

import asyncio
import os
from pathlib import Path
import tempfile
import unittest

from test_acceptance_api import PLAN


@unittest.skipUnless(os.getenv("QLABS_UI_E2E") == "1", "Requires running studio")
class StudioRegressionTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        from playwright.async_api import async_playwright
        self.playwright = await async_playwright().start()
        self.browser = await self.playwright.chromium.launch(args=["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"])
        self.page = await self.browser.new_page()
        self.base = os.getenv("QLABS_UI_URL", "http://127.0.0.1:3000")

    async def asyncTearDown(self):
        await self.browser.close()
        await self.playwright.stop()

    async def test_late_draft_does_not_overwrite_manual_edits(self):
        from playwright.async_api import expect
        started, release = asyncio.Event(), asyncio.Event()

        async def draft(route):
            started.set()
            await release.wait()
            await route.fulfill(json={"plan": {**PLAN, "name": "Stale model name"}, "summary": "Drafted", "unmapped": [], "grounded": True})

        await self.page.route("**/api/acceptance/draft", draft)
        await self.page.goto(self.base, wait_until="networkidle")
        await self.page.get_by_role("button", name="Load sample").click()
        await self.page.get_by_label("What should the test do").fill("Also check the total is correct")
        await self.page.get_by_label("What should the test do").press("Control+Enter")
        await asyncio.wait_for(started.wait(), timeout=10)
        await self.page.get_by_label("Test name", exact=True).fill("My manual edit")
        release.set()
        await expect(self.page.get_by_text("Your test or target changed while this draft was loading.", exact=False)).to_be_visible()
        await expect(self.page.get_by_label("Test name", exact=True)).to_have_value("My manual edit")

    async def test_unknown_spoken_target_does_not_start_a_run(self):
        from playwright.async_api import expect
        requests = []
        self.page.on("request", lambda request: requests.append(request) if request.method == "POST" and request.url.endswith("/runs") else None)
        await self.page.goto(self.base, wait_until="networkidle")
        await self.page.get_by_role("button", name="Load sample").click()
        await self.page.get_by_label("What should the test do").fill("run it on the nonexistent app")
        await self.page.get_by_label("What should the test do").press("Control+Enter")
        await expect(self.page.get_by_text("I could not identify that app uniquely.", exact=False)).to_be_visible()
        self.assertEqual(requests, [])

    async def test_short_undo_can_be_submitted_by_button(self):
        from playwright.async_api import expect
        await self.page.goto(self.base, wait_until="networkidle")
        await self.page.get_by_role("button", name="Load sample").click()
        await self.page.get_by_label("What should the test do").fill("undo")
        await self.page.get_by_role("button", name="Apply change", exact=True).click()
        await expect(self.page.get_by_text("Undid the last change.", exact=True)).to_be_visible()

    async def test_unsaved_draft_survives_refresh_in_the_same_tab(self):
        from playwright.async_api import expect
        await self.page.goto(self.base, wait_until="networkidle")
        await self.page.get_by_role("button", name="Load sample").click()
        await self.page.get_by_label("Test name", exact=True).fill("My unsaved checkout test")
        await self.page.get_by_label("What should the test do").fill("Also check the promo code")
        await self.page.reload(wait_until="networkidle")
        await expect(self.page.get_by_label("Test name", exact=True)).to_have_value("My unsaved checkout test")
        await expect(self.page.get_by_label("What should the test do")).to_have_value("Also check the promo code")

    async def test_dashboard_chart_and_mobile_layout_render_without_overflow(self):
        from playwright.async_api import expect
        await self.page.route("**/api/acceptance/brief*", lambda route: route.fulfill(json={
            "headline": "Recorded results", "findings": [], "suggestions": [], "runs_considered": 1, "generated_at": 0,
        }))
        await self.page.goto(self.base + "/dashboard", wait_until="networkidle")
        await expect(self.page.get_by_role("heading", name="Dashboard", exact=True)).to_be_visible()
        await expect(self.page.get_by_role("heading", name="Runs over time", exact=True)).to_be_visible()
        artifacts = Path(tempfile.gettempdir()) / "qlabs-release-audit"
        artifacts.mkdir(exist_ok=True)
        for width in (1440, 390):
            await self.page.set_viewport_size({"width": width, "height": 900})
            self.assertTrue(await self.page.locator("main").evaluate("element => element.scrollWidth <= element.clientWidth"))
            await self.page.screenshot(path=str(artifacts / f"dashboard-{width}.png"))

    async def test_mic_stop_keeps_final_words_and_submits_once(self):
        from playwright.async_api import expect
        await self.page.route("**/api/voice/status", lambda route: route.fulfill(json={"live_mic": True, "drafting": "groq"}))
        await self.page.route("**/api/voice/token", lambda route: route.fulfill(json={"key": "test-only"}))
        instructions = []

        async def draft(route):
            instructions.append(route.request.post_data_json["instruction"])
            await route.fulfill(json={"plan": PLAN, "summary": "Drafted from final words", "unmapped": [], "grounded": True})

        await self.page.route("**/api/acceptance/draft", draft)
        await self.page.add_init_script("""
          const NativeSocket = window.WebSocket;
          window.WebSocket = class {
            static OPEN=1; readyState=1;
            constructor(url) { if (!String(url).includes('deepgram')) return new NativeSocket(url);
              window.testSpeechSocket=this; setTimeout(()=>this.onopen?.({}),0); }
            send(data) { if (typeof data === 'string' && data.includes('CloseStream')) {
              this.onmessage?.({data:JSON.stringify({is_final:true,channel:{alternatives:[{transcript:'It should say Email is required.'}]}})});
              this.onmessage?.({data:JSON.stringify({type:'Metadata'})});
            }}
            close() { this.readyState=3; this.onclose?.({code:1000}); }
          };
        """)
        await self.page.goto(self.base, wait_until="networkidle")
        await self.page.get_by_role("button", name="Start listening", exact=True).click()
        await expect(self.page.get_by_text("Listening", exact=True)).to_be_visible()
        await self.page.evaluate("window.testSpeechSocket.onmessage({data:JSON.stringify({is_final:true,channel:{alternatives:[{transcript:'Leave the email empty.'}]}})})")
        await self.page.get_by_role("button", name="Stop listening", exact=True).click()
        await expect(self.page.get_by_text("Drafted from final words", exact=True)).to_be_visible(timeout=10000)
        await expect(self.page.get_by_role("button", name="Start listening", exact=True)).to_be_enabled()
        self.assertEqual(instructions, ["Leave the email empty. It should say Email is required."])
