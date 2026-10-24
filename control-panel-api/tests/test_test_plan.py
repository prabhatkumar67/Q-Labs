import unittest

from pydantic import ValidationError

from app.test_plan import TestPlan


class ContractTests(unittest.TestCase):
    def test_form_contract_preserves_expected_outcome(self):
        plan = TestPlan.model_validate({"name": "Email required", "steps": [
            {"action": "navigate", "path": "/checkout"},
            {"action": "click", "selector": "button[type=submit]"},
            {"action": "assert_text", "selector": "[role=alert]", "expected": "Email is required"},
        ]}).require_assertions()
        self.assertEqual(plan.steps[-1].expected, "Email is required")

    def test_action_only_plan_is_unverified(self):
        with self.assertRaises(ValueError):
            TestPlan.model_validate({"name": "Open", "steps": [
                {"action": "navigate", "path": "/"}
            ]}).require_assertions()

    def test_unknown_actions_and_extra_fields_are_rejected(self):
        for step in [{"action": "evaluate", "code": "anything"},
                     {"action": "click", "selector": "button", "code": "anything"},
                     {"action": "navigate", "path": "//external.example"}]:
            with self.assertRaises(ValidationError):
                TestPlan.model_validate({"name": "Invalid", "steps": [step]})
