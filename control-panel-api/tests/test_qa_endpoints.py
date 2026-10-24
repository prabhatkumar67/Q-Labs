"""Exercise real endpoint functions against a temporary database, without Docker startup."""

from contextlib import contextmanager
import ast
from pathlib import Path
import sqlite3
import tempfile
import unittest

from fastapi import HTTPException
from pydantic import BaseModel
from typing import Literal, Optional

from app.db import DBAdapter
from app.qa_reporting import can_mark_passed, summarize_results


@contextmanager
def connection(path):
    conn = sqlite3.connect(path)
    try:
        with conn:
            yield conn
    finally:
        conn.close()


class EndpointTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.path = Path(self.directory.name) / "test.db"
        with connection(self.path) as conn:
            conn.executescript("""
                CREATE TABLE apps (id TEXT, name TEXT);
                CREATE TABLE app_versions (id TEXT, app_id TEXT, docker_image_name TEXT, version_tag TEXT);
                CREATE TABLE qa_runs (id TEXT, app_version_id TEXT, status TEXT, started_at TEXT,
                    completed_at TEXT, issues_found INTEGER, video_url TEXT, log_output TEXT);
                CREATE TABLE qa_results (qa_run_id TEXT, issue_type TEXT, severity TEXT);
                INSERT INTO qa_runs VALUES ('qa_test', 'v1', 'running', '', NULL, 0, NULL, NULL);
            """)

        def get_db():
            conn = sqlite3.connect(self.path)
            conn.row_factory = sqlite3.Row
            return DBAdapter(conn)

        names = {"list_qa_runs", "get_qa_run", "update_qa_run", "QARunUpdate"}
        source = ast.parse((Path(__file__).parents[1] / "app/main.py").read_text(encoding="utf-8"))
        nodes = [n for n in source.body if isinstance(n, (ast.FunctionDef, ast.ClassDef)) and n.name in names]
        for node in nodes:
            node.decorator_list = []
        self.namespace = dict(get_db=get_db, BaseModel=BaseModel, Literal=Literal, Optional=Optional,
                              HTTPException=HTTPException, summarize_results=summarize_results,
                              can_mark_passed=can_mark_passed)
        exec(compile(ast.Module(body=nodes, type_ignores=[]), "actual-endpoints", "exec"), self.namespace)

    def test_empty_run_rejects_success_and_reports_zero(self):
        run = self.namespace["list_qa_runs"]()[0]
        self.assertEqual(run["total_tests"], 0)
        with self.assertRaises(HTTPException) as error:
            self.namespace["update_qa_run"]("qa_test", self.namespace["QARunUpdate"](status="passed"))
        self.assertEqual(error.exception.status_code, 409)

    def test_legacy_false_pass_is_reported_as_blocked(self):
        with connection(self.path) as conn:
            conn.execute("UPDATE qa_runs SET status='passed'")
        self.assertEqual(self.namespace["list_qa_runs"]()[0]["status"], "blocked")
        self.assertEqual(self.namespace["get_qa_run"]("qa_test")["status"], "blocked")

    def test_completed_smoke_checks_can_pass(self):
        with connection(self.path) as conn:
            conn.executemany("INSERT INTO qa_results VALUES ('qa_test', 'request', ?)", [("info",)] * 3)
        self.namespace["update_qa_run"]("qa_test", self.namespace["QARunUpdate"](status="passed"))
        run = self.namespace["get_qa_run"]("qa_test")
        self.assertEqual((run["status"], run["passed_tests"], run["total_tests"]), ("passed", 3, 3))
