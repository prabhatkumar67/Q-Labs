"""Evidence-based reporting for the existing HTTP smoke-check results."""


def summarize_results(results):
    summary = {"total_tests": 0, "passed_tests": 0, "failed_tests": 0,
               "errored_tests": 0, "unverified_tests": 0}
    for result in results:
        summary["total_tests"] += 1
        kind = result.get("issue_type")
        severity = result.get("severity")
        if kind in {"runner", "sandbox", "config"}:
            summary["errored_tests"] += 1
        elif kind == "request" and severity == "info":
            summary["passed_tests"] += 1
        elif kind == "request" and severity in {"low", "medium", "high", "critical"}:
            summary["failed_tests"] += 1
        else:
            # Historical agent observations are not completed assertions.
            summary["unverified_tests"] += 1
    summary["verified"] = bool(summary["total_tests"]) and not (
        summary["errored_tests"] or summary["unverified_tests"]
    )
    return summary


def can_mark_passed(results):
    summary = summarize_results(results)
    return summary["verified"] and summary["passed_tests"] == summary["total_tests"]
