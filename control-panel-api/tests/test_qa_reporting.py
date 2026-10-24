import unittest

from app.qa_reporting import can_mark_passed, summarize_results


class ReportingTests(unittest.TestCase):
    def test_empty_run_is_not_a_pass(self):
        self.assertEqual(summarize_results([])["total_tests"], 0)
        self.assertFalse(can_mark_passed([]))

    def test_counts_passes_and_failures_independently(self):
        results = [{"issue_type": "request", "severity": s} for s in ["info", "info", "high"]]
        summary = summarize_results(results)
        self.assertEqual((summary["total_tests"], summary["passed_tests"], summary["failed_tests"]), (3, 2, 1))
        self.assertFalse(can_mark_passed(results))

    def test_actual_passes_are_counted(self):
        results = [{"issue_type": "request", "severity": "info"}] * 3
        self.assertEqual(summarize_results(results)["passed_tests"], 3)
        self.assertTrue(can_mark_passed(results))

    def test_agent_observations_and_infrastructure_are_not_passes(self):
        results = [{"issue_type": "resilience", "severity": "info"},
                   {"issue_type": "sandbox", "severity": "high"}]
        summary = summarize_results(results)
        self.assertEqual(summary["unverified_tests"], 1)
        self.assertEqual(summary["errored_tests"], 1)
        self.assertFalse(can_mark_passed(results))
