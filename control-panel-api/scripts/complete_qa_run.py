#!/usr/bin/env python3
"""
Mark an interrupted QA run as errored, never as a successful test.
Usage: python3 scripts/complete_qa_run.py <run_id>
Example: python3 scripts/complete_qa_run.py qa_86e8c8af
"""
import os
import sys
from datetime import datetime, timezone

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
API_DIR = os.path.dirname(SCRIPT_DIR)
DATA_DIR = os.path.join(API_DIR, "data")
DB_PATH = os.path.join(DATA_DIR, "platform.db")


def main():
    if len(sys.argv) < 2:
        print("Usage: python3 scripts/complete_qa_run.py <run_id>", file=sys.stderr)
        sys.exit(1)
    run_id = sys.argv[1].strip()
    if not run_id.startswith("qa_"):
        print("Run ID should look like qa_86e8c8af", file=sys.stderr)
        sys.exit(1)

    if not os.path.exists(DB_PATH):
        print(f"Database not found: {DB_PATH}", file=sys.stderr)
        sys.exit(1)

    import sqlite3
    conn = sqlite3.connect(DB_PATH)
    row = conn.execute("SELECT id, status FROM qa_runs WHERE id = ?", (run_id,)).fetchone()
    if not row:
        print(f"Run not found: {run_id}", file=sys.stderr)
        conn.close()
        sys.exit(1)
    if row[1] != "running":
        print(f"Run {run_id} is already {row[1]}, nothing to do.")
        conn.close()
        return

    completed_at = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z")
    conn.execute(
        "UPDATE qa_runs SET status = 'errored', completed_at = ?, log_output = 'Interrupted run recovered manually; checks were not verified.' WHERE id = ? AND status = 'running'",
        (completed_at, run_id),
    )
    conn.commit()
    conn.close()
    print(f"Marked {run_id} as errored. Rerun the checks to verify the app.")


if __name__ == "__main__":
    main()
