"""Read a target page once and list the elements a test can use. Runs in its own process, like the worker."""

import json
import sys

# Collected in the page: interactive controls, headings, live regions and leaf elements with ids.
COLLECT = r"""() => {
  const out = [];
  const seen = new Set();
  const containers = new Set(["html","body","main","div","section","span","form","header","footer","nav","ul","ol","li","svg","path","article","aside"]);
  const clean = s => (s || "").replace(/\s+/g, " ").trim().slice(0, 80);
  const quote = s => s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  const query = 'input,textarea,select,button,a[href],[role=button],[role=link],[role=alert],[role=status],[role=tab],[role=checkbox],[aria-live],h1,h2,h3,[data-testid],[id]';
  for (const el of document.querySelectorAll(query)) {
    if (out.length >= 150) break;
    const tag = el.tagName.toLowerCase();
    const role = el.getAttribute("role") || "";
    const live = el.hasAttribute("aria-live") || role === "alert" || role === "status";
    if (containers.has(tag) && !role && !live && !el.dataset.testid && !(el.id && el.children.length === 0)) continue;
    if (tag === "input" && el.type === "hidden") continue;
    const box = el.getBoundingClientRect();
    if (box.width === 0 && box.height === 0 && !live && !el.id) continue;
    const text = clean(el.innerText || el.value);
    const label = clean((el.labels && el.labels[0] && el.labels[0].innerText) || el.getAttribute("aria-label"));
    const placeholder = clean(el.getAttribute("placeholder"));
    let selector = "";
    if (el.id && /^[A-Za-z][\w-]*$/.test(el.id)) selector = "#" + el.id;
    else if (el.dataset.testid) selector = `[data-testid="${quote(el.dataset.testid)}"]`;
    else if (el.getAttribute("name")) selector = `${tag}[name="${quote(el.getAttribute("name"))}"]`;
    else if (el.getAttribute("aria-label")) selector = `${tag}[aria-label="${quote(el.getAttribute("aria-label"))}"]`;
    else if (el.getAttribute("placeholder")) selector = `${tag}[placeholder="${quote(el.getAttribute("placeholder"))}"]`;
    else if ((tag === "button" || tag === "a" || /^h[1-3]$/.test(tag)) && text) selector = `${tag}:has-text("${quote(text)}")`;
    else continue;
    if (seen.has(selector)) continue;
    seen.add(selector);
    const item = { selector, tag };
    if (el.getAttribute("type")) item.type = el.getAttribute("type");
    if (role) item.role = role;
    if (label) item.label = label;
    if (placeholder) item.placeholder = placeholder;
    if (tag === "select") item.options = Array.from(el.options).slice(0, 12).map(o => clean(o.text));
    if (tag === "a" && el.getAttribute("href")) item.href = el.getAttribute("href").slice(0, 120);
    if (text && !["input", "textarea", "select"].includes(tag)) item.text = text;
    if (live) item.live = true;
    out.push(item);
  }
  return { title: document.title, elements: out };
}"""


def inspect(url):
    from playwright.sync_api import sync_playwright

    origin = url.rstrip("/")
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch()
        try:
            context = browser.new_context(viewport={"width": 1280, "height": 800})
            context.route("**/*", lambda route: route.continue_() if (
                route.request.url.startswith(origin + "/") or route.request.url == origin
            ) else route.abort())
            page = context.new_page()
            page.goto(origin, wait_until="domcontentloaded", timeout=20000)
            try:
                page.wait_for_load_state("networkidle", timeout=4000)
            except Exception:
                pass
            snapshot = page.evaluate(COLLECT)
            elements = []
            for item in snapshot["elements"]:
                try:
                    count = page.locator(item["selector"]).count()
                except Exception:
                    continue
                if count == 1:
                    elements.append(item)
            return {"url": url, "title": snapshot["title"], "elements": elements}
        finally:
            browser.close()


if __name__ == "__main__":
    print(json.dumps(inspect(sys.argv[1])))
