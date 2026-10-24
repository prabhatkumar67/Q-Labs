#!/usr/bin/env python3
"""
Seed the database with realistic fake QA runs and results.
Uses SQLite only (no app.db import) so it runs without full API deps.
Run from control-panel-api: python3 scripts/seed_qa_runs.py
Requires: control-panel-api/data/platform.db to exist (start the API once), or run with --init to create tables.
"""
import os
import sqlite3
import sys
import uuid
from datetime import datetime, timezone, timedelta

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
API_DIR = os.path.dirname(SCRIPT_DIR)
DATA_DIR = os.path.join(API_DIR, "data")
DB_PATH = os.path.join(DATA_DIR, "platform.db")

# Q Labs seed: QA run outcomes
QA_RUNS = [
    {"status": "passed", "issues": 0, "tag": "v1.0"},
    {"status": "failed", "issues": 1, "tag": "v1.0"},
    {"status": "failed", "issues": 2, "tag": "v1.1"},
    {"status": "passed", "issues": 0, "tag": "v1.1"},
    {"status": "failed", "issues": 3, "tag": "v1.2-beta"},
    {"status": "passed", "issues": 0, "tag": "v1.2-beta"},
    {"status": "failed", "issues": 1, "tag": "v1.2-beta"},
    {"status": "running", "issues": 0, "tag": "v1.2-beta"},
]

FAILURE_RESULTS = [
    {
        "issue_type": "request",
        "description": "GET /cart returned 404 in Q Labs demo environment.",
        "element_id": "/cart",
        "severity": "high",
    },
    {
        "issue_type": "request",
        "description": "GET /admin/orders returned 500 when loading order dashboard.",
        "element_id": "/admin/orders",
        "severity": "critical",
    },
    {
        "issue_type": "assertion",
        "description": "Cart total mismatch after discount code: expected $42.00, got $44.00.",
        "element_id": "[data-testid='cart-total']",
        "severity": "medium",
    },
    {
        "issue_type": "smoke",
        "description": "Smoke check: /faq timed out while loading content.",
        "element_id": "/faq",
        "severity": "medium",
    },
    {
        "issue_type": "console_error",
        "description": "Console error: Uncaught TypeError in product grid when applying filter.",
        "element_id": "[data-testid='product-grid']",
        "severity": "high",
    },
]


def ensure_tables(conn):
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS apps (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT DEFAULT '',
            created_at TEXT DEFAULT (datetime('now'))
        );
        CREATE TABLE IF NOT EXISTS app_versions (
            id TEXT PRIMARY KEY,
            app_id TEXT NOT NULL,
            version_tag TEXT NOT NULL,
            docker_image_name TEXT NOT NULL,
            data_path TEXT DEFAULT '/app/data',
            created_at TEXT DEFAULT (datetime('now'))
        );
        CREATE TABLE IF NOT EXISTS qa_runs (
            id TEXT PRIMARY KEY,
            app_version_id TEXT NOT NULL,
            scenario_id TEXT,
            status TEXT DEFAULT 'pending',
            started_at TEXT,
            completed_at TEXT,
            video_url TEXT,
            issues_found INTEGER DEFAULT 0,
            log_output TEXT
        );
        CREATE TABLE IF NOT EXISTS qa_results (
            id TEXT PRIMARY KEY,
            qa_run_id TEXT NOT NULL,
            element_id TEXT,
            issue_type TEXT,
            description TEXT,
            screenshot_url TEXT,
            severity TEXT DEFAULT 'medium'
        );
    """)
    conn.commit()


def ensure_app_and_versions(conn):
    cur = conn.execute("SELECT id, version_tag FROM app_versions")
    rows = cur.fetchall()
    if rows:
        return {r[1]: r[0] for r in rows}

    app_id = "storefront-app"
    conn.execute(
        "INSERT INTO apps (id, name, description) VALUES (?, ?, ?)",
        (app_id, "Q Labs Storefront", "E-commerce storefront for sandbox testing"),
    )
    versions = [
        ("ver-v1.0", app_id, "v1.0", "qlabs-storefront-app-v1.0:latest"),
        ("ver-v1.1", app_id, "v1.1", "qlabs-storefront-app-v1.1:latest"),
        ("ver-v1.2", app_id, "v1.2-beta", "qlabs-storefront-app-v1.2:latest"),
    ]
    for vid, aid, tag, image in versions:
        conn.execute(
            "INSERT INTO app_versions (id, app_id, version_tag, docker_image_name) VALUES (?, ?, ?, ?)",
            (vid, aid, tag, image),
        )
    conn.commit()
    return {"v1.0": "ver-v1.0", "v1.1": "ver-v1.1", "v1.2-beta": "ver-v1.2"}


def seed(init: bool = False):
    os.makedirs(DATA_DIR, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row

    if init:
        ensure_tables(conn)
    tag_to_id = ensure_app_and_versions(conn)

    now = datetime.now(timezone.utc)
    failure_idx = 0

    for i, run_spec in enumerate(QA_RUNS):
        tag = run_spec["tag"]
        app_version_id = tag_to_id.get(tag) or list(tag_to_id.values())[0]
        run_id = f"qa_{uuid.uuid4().hex[:8]}"
        started = now - timedelta(days=len(QA_RUNS) - i, hours=2 + i, minutes=i * 7)
        started_at = started.strftime("%Y-%m-%dT%H:%M:%S.000Z")
        completed_at = None
        if run_spec["status"] != "running":
            completed_at = (started + timedelta(minutes=3 + i, seconds=i * 12)).strftime(
                "%Y-%m-%dT%H:%M:%S.000Z"
            )

        conn.execute(
            """INSERT INTO qa_runs (
                id, app_version_id, scenario_id, status, started_at, completed_at, issues_found
            ) VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (
                run_id,
                app_version_id,
                None,
                run_spec["status"],
                started_at,
                completed_at,
                run_spec["issues"],
            ),
        )

        for _ in range(run_spec["issues"]):
            res = FAILURE_RESULTS[failure_idx % len(FAILURE_RESULTS)]
            failure_idx += 1
            result_id = f"res_{uuid.uuid4().hex[:8]}"
            conn.execute(
                """INSERT INTO qa_results (
                    id, qa_run_id, element_id, issue_type, description, screenshot_url, severity
                ) VALUES (?, ?, ?, ?, ?, ?, ?)""",
                (
                    result_id,
                    run_id,
                    res["element_id"],
                    res["issue_type"],
                    res["description"],
                    None,
                    res["severity"],
                ),
            )

    conn.commit()
    conn.close()
    print(f"Seeded {len(QA_RUNS)} QA runs with realistic results.")


if __name__ == "__main__":
    init_flag = "--init" in sys.argv
    if init_flag:
        print("Creating tables if missing...")
    seed(init=init_flag)
