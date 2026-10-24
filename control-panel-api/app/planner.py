"""Turns a spoken description into a test plan, grounded in the elements found on the target page."""

import json

from pydantic import ValidationError

from app import llm
from app.test_plan import TestPlan

STEP_SHAPES = """Step shapes (use exactly these keys):
{"action":"navigate","path":"/some/path"}
{"action":"click","selector":"<css selector>"}
{"action":"fill","selector":"<css selector>","value":"<text to type>"}
{"action":"assert_text","selector":"<css selector>","expected":"<exact text the element should show>"}
{"action":"assert_url","path":"/expected/path"}"""

RULES = """You write browser acceptance tests from what a developer says out loud.
The input is spoken, so it may contain filler words, restarts or misheard words. Map them to the real labels on the page.

Return one JSON object: {"summary": string, "name": string, "steps": [step, ...]}.
""" + STEP_SHAPES + """

Rules:
1. The browser is already on the page in the page map before step 1. Never navigate to it. Only add navigate when the
   developer names a different page, and only with a path they gave or a link href from the page map.
2. Use a selector from the page map whenever the element is listed there. Copy it exactly.
3. Every test needs at least one assert_text or assert_url step taken from what the developer expects.
4. expected is the text the developer said the page should show, written the way it appears on screen.
   Speech has no capitals or symbols, so restore them: sentence case for messages ("email is required" becomes
   "Email is required"), the page's own casing when the page map shows that text, "$21.60" for "twenty one dollars
   sixty". Do not add words the developer did not say.
5. Write spoken codes and values as typed text. Prefer a matching placeholder or label in the page map, so
   "save ten" becomes "SAVE10" when a field suggests SAVE10. Spoken emails become real addresses ("jo at example dot
   com" becomes "jo@example.com").
6. A select element is changed with fill, using the option text as the value.
7. If a current test is given, treat the request as an edit to it: add, change or remove steps and keep the rest,
   unless the developer clearly describes a different scenario. Then write a new test. Keep steps in the order a
   person would do them.
8. summary is required: one short plain sentence saying what you changed, for example "Added a check that the total
   drops to $21.60." No dashes. name: under 60 characters, sentence case, describing the whole test.
Return JSON only."""


class PlannerError(Exception):
    def __init__(self, status, message):
        super().__init__(message)
        self.status = status
        self.message = message


def _describe(item):
    bits = [item["selector"], item["tag"] + (f"[type={item['type']}]" if item.get("type") else "")]
    bits += [f'{key} "{item[key]}"' for key in ("label", "placeholder", "href", "text") if item.get(key)]
    if item.get("options"):
        bits.append("options " + ", ".join(f'"{option}"' for option in item["options"]))
    if item.get("live"):
        bits.append("live message area")
    return "  " + " | ".join(bits)


def _prompt(instruction, page_map, current):
    parts = []
    if page_map:
        lines = "\n".join(_describe(item) for item in page_map["elements"])
        parts.append(f'Page map for "{page_map.get("title") or page_map["url"]}":\n{lines}')
    else:
        parts.append("No page map is available. Use the simplest likely selectors.")
    if current:
        parts.append("Current test:\n" + json.dumps(current))
    parts.append("Developer said:\n" + instruction)
    return "\n\n".join(parts)


def draft(instruction, page_map=None, current=None):
    """Returns {"plan", "summary", "unmapped"}; unmapped lists step indexes whose selector is not on the page map."""
    if not llm.configured():
        raise PlannerError(503, "Drafting needs GROQ_API_KEY in control-panel-api/.env. You can still edit steps by hand.")
    try:
        text = llm.complete(RULES, _prompt(instruction, page_map, current))
    except llm.LLMError as exc:
        raise PlannerError(exc.status, exc.message) from exc
    try:
        data = json.loads(text[text.find("{"): text.rfind("}") + 1])
        plan = TestPlan.model_validate({"name": data.get("name") or "Untitled test", "steps": data.get("steps")})
        plan.require_assertions()
    except (ValueError, ValidationError, TypeError) as exc:
        raise PlannerError(422, "I could not turn that into a test. Say what to do and the exact result you expect.") from exc
    known = {item["selector"] for item in page_map["elements"]} if page_map else set()
    unmapped = [index for index, step in enumerate(plan.steps)
                if page_map and getattr(step, "selector", None) and step.selector not in known]
    result = plan.model_dump()
    summary = str(data.get("summary") or describe_change(current, result)).replace("—", ",").replace("–", ",")
    return {"plan": result, "summary": summary[:240], "unmapped": unmapped}


def describe_change(before, after):
    if not before:
        return f"Drafted {len(after['steps'])} steps."
    added = len(after["steps"]) - len(before.get("steps", []))
    if added > 0:
        return f"Added {added} {'step' if added == 1 else 'steps'}."
    if added < 0:
        return f"Removed {-added} {'step' if added == -1 else 'steps'}."
    return "Updated the steps."
