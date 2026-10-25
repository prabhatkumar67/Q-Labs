"""Independent, additive SQLite storage for immutable acceptance plans and runs."""

from contextlib import contextmanager
import json
import os
from pathlib import Path
import sqlite3
from datetime import datetime, timezone
import uuid


def now():
    return datetime.now(timezone.utc).isoformat()


@contextmanager
def database():
    path = Path(os.getenv("QLABS_ACCEPTANCE_DB", str(Path(__file__).parents[1] / "data/acceptance.db")))
    path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(path, timeout=10)
    conn.row_factory = sqlite3.Row
    try:
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS acceptance_plans (
                id TEXT PRIMARY KEY, name TEXT NOT NULL, body TEXT NOT NULL, created_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS acceptance_runs (
                id TEXT PRIMARY KEY, plan_id TEXT NOT NULL, target TEXT NOT NULL,
                status TEXT NOT NULL, created_at TEXT NOT NULL, completed_at TEXT,
                results TEXT NOT NULL DEFAULT '[]', reason TEXT
            );
            CREATE TABLE IF NOT EXISTS acceptance_targets (
                id TEXT PRIMARY KEY, name TEXT NOT NULL, url TEXT NOT NULL, created_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS acceptance_suites (
                id TEXT PRIMARY KEY, body TEXT NOT NULL
            );
        """)
        yield conn
        conn.commit()
    finally:
        conn.close()


def decode(row):
    if row is None:
        return None
    result = dict(row)
    for key in ("body", "results"):
        if key in result:
            result[key] = json.loads(result[key])
    return result


def save_plan(plan):
    record = dict(id=uuid.uuid4().hex, name=plan.name, body=plan.model_dump(), created_at=now())
    with database() as conn:
        conn.execute("INSERT INTO acceptance_plans VALUES (?, ?, ?, ?)",
                     (record["id"], record["name"], json.dumps(record["body"]), record["created_at"]))
    return record


def get_plan(plan_id):
    with database() as conn:
        return decode(conn.execute("SELECT * FROM acceptance_plans WHERE id=?", (plan_id,)).fetchone())


def list_plans():
    with database() as conn:
        return [decode(row) for row in conn.execute("SELECT * FROM acceptance_plans ORDER BY created_at DESC LIMIT 100")]


def list_targets():
    with database() as conn:
        return [dict(row) for row in conn.execute("SELECT * FROM acceptance_targets ORDER BY created_at")]


def add_target(name, url):
    record = dict(id="app-" + uuid.uuid4().hex[:10], name=name, url=url, created_at=now())
    with database() as conn:
        if conn.execute("SELECT COUNT(*) FROM acceptance_targets").fetchone()[0] >= 20:
            raise ValueError("Twenty apps is the limit. Remove one first.")
        conn.execute("INSERT INTO acceptance_targets VALUES (?, ?, ?, ?)",
                     (record["id"], record["name"], record["url"], record["created_at"]))
    return record


def remove_target(target_id):
    with database() as conn:
        return conn.execute("DELETE FROM acceptance_targets WHERE id=?", (target_id,)).rowcount == 1


def create_run(plan_id, target):
    with database() as conn:
        conn.execute("BEGIN IMMEDIATE")
        active = conn.execute("SELECT COUNT(*) FROM acceptance_runs WHERE status IN ('queued','running')").fetchone()[0]
        if active >= 5:
            raise ValueError("Five runs are already queued or running. Wait for one to finish.")
        run_id = uuid.uuid4().hex
        conn.execute("INSERT INTO acceptance_runs (id,plan_id,target,status,created_at) VALUES (?,?,?,'queued',?)",
                     (run_id, plan_id, target, now()))
    return get_run(run_id)


def get_run(run_id):
    with database() as conn:
        return decode(conn.execute("SELECT * FROM acceptance_runs WHERE id=?", (run_id,)).fetchone())


def list_runs():
    with database() as conn:
        return [decode(row) for row in conn.execute("SELECT * FROM acceptance_runs ORDER BY created_at DESC LIMIT 100")]


def claim(run_id):
    with database() as conn:
        return conn.execute("UPDATE acceptance_runs SET status='running' WHERE id=? AND status='queued'", (run_id,)).rowcount == 1


def finish(run_id, status, results, reason=None):
    with database() as conn:
        if status == "passed":
            row = conn.execute("SELECT p.body FROM acceptance_runs r JOIN acceptance_plans p ON p.id=r.plan_id WHERE r.id=?", (run_id,)).fetchone()
            steps = json.loads(row["body"])["steps"] if row else []
            by_index = {result.get("index"): result for result in results}
            verified = (bool(steps) and len(results) == len(steps) == len(by_index)
                        and any(step["action"].startswith("assert_") for step in steps)
                        and all(by_index.get(index, {}).get("status") == "passed"
                                and by_index[index].get("action") == step["action"] for index, step in enumerate(steps)))
            if not verified:
                status, reason = "errored", "The worker did not provide completed evidence for every required step. This run is not verified."
        conn.execute("UPDATE acceptance_runs SET status=?,results=?,reason=?,completed_at=? WHERE id=? AND status IN ('queued','running')",
                     (status, json.dumps(results), reason, now(), run_id))


def progress(run_id, results):
    with database() as conn:
        conn.execute("UPDATE acceptance_runs SET results=? WHERE id=? AND status='running'",
                     (json.dumps(results), run_id))


def recover_interrupted():
    with database() as conn:
        conn.execute("UPDATE acceptance_runs SET status='errored',completed_at=?,reason=? WHERE status IN ('queued','running')",
                     (now(), "The API restarted before execution was confirmed complete. Rerun the saved test."))
        for row in conn.execute("SELECT id, body FROM acceptance_suites").fetchall():
            suite = json.loads(row["body"])
            if not suite["finished"]:
                suite.update(finished=True, reason="Execution was interrupted by an API restart. Completed runs remain available; rerun the suite.")
                conn.execute("UPDATE acceptance_suites SET body=? WHERE id=?", (json.dumps(suite), row["id"]))


def save_suite(suite):
    with database() as conn:
        conn.execute("INSERT INTO acceptance_suites (id,body) VALUES (?,?) ON CONFLICT(id) DO UPDATE SET body=excluded.body",
                     (suite["id"], json.dumps(suite)))


def get_suite(suite_id):
    with database() as conn:
        row = conn.execute("SELECT body FROM acceptance_suites WHERE id=?", (suite_id,)).fetchone()
        return json.loads(row["body"]) if row else None


def cancel(run_id):
    with database() as conn:
        conn.execute("UPDATE acceptance_runs SET status='cancelled',completed_at=?,reason=? WHERE id=? AND status IN ('queued','running')",
                     (now(), "Cancelled by the user. Remaining checks were not verified.", run_id))
    return get_run(run_id)
