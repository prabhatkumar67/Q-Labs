import base64
import importlib
import os
import sqlite3
import sys
import tempfile
import types
import unittest
from unittest.mock import patch


if "ibm_db_dbi" not in sys.modules:
    ibm_db_dbi_stub = types.ModuleType("ibm_db_dbi")

    def _stub_connect(*args, **kwargs):
        raise RuntimeError("ibm_db_dbi.connect should not be called in these unit tests")

    ibm_db_dbi_stub.connect = _stub_connect
    sys.modules["ibm_db_dbi"] = ibm_db_dbi_stub


db = importlib.import_module("app.db")


class DbModuleTests(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp_dir.cleanup)

        self.original_data_dir = db.DATA_DIR
        self.original_db_path = db.DB_PATH
        self.original_files_dir = db.FILES_DIR
        self.original_certs_dir = db.CERTS_DIR

        db.DATA_DIR = self.temp_dir.name
        db.DB_PATH = os.path.join(self.temp_dir.name, "platform.db")
        db.FILES_DIR = os.path.join(self.temp_dir.name, "scenario_files")
        db.CERTS_DIR = os.path.join(self.temp_dir.name, "certs")

        self.addCleanup(self._restore_module_paths)

    def _restore_module_paths(self):
        db.DATA_DIR = self.original_data_dir
        db.DB_PATH = self.original_db_path
        db.FILES_DIR = self.original_files_dir
        db.CERTS_DIR = self.original_certs_dir

    def test_init_db_sqlite_creates_expected_tables_and_column(self):
        with patch.dict(os.environ, {"DB_PROVIDER": "sqlite"}, clear=False):
            db.init_db()

        conn = sqlite3.connect(db.DB_PATH)
        try:
            tables = {
                row[0]
                for row in conn.execute(
                    "SELECT name FROM sqlite_master WHERE type='table'"
                ).fetchall()
            }
            self.assertIn("scenarios", tables)
            self.assertIn("active_containers", tables)

            columns = {
                row[1]
                for row in conn.execute("PRAGMA table_info(active_containers)").fetchall()
            }
            self.assertIn("name", columns)
        finally:
            conn.close()

    def test_get_db2_dsn_from_split_env_without_ca(self):
        with patch.dict(
            os.environ,
            {
                "DB2_DSN": "",
                "DB2_HOST": "db2-host.example.com",
                "DB2_PORT": "30957",
                "DB2_DATABASE": "bludb",
                "DB2_USERNAME": "db2user",
                "DB2_PASSWORD": "db2pass",
                "DB2_SECURITY": "SSL",
                "DB2_SSL_CA_FILE": "",
                "DB2_SSL_CA_BASE64": "",
                "DB2_SSL_CA_NAME": "db2-ca.pem",
            },
            clear=False,
        ):
            dsn = db._get_db2_dsn()

        self.assertIn("DATABASE=bludb;", dsn)
        self.assertIn("HOSTNAME=db2-host.example.com;", dsn)
        self.assertIn("PORT=30957;", dsn)
        self.assertIn("UID=db2user;", dsn)
        self.assertIn("PWD=db2pass;", dsn)
        self.assertIn("Security=SSL;", dsn)
        self.assertNotIn("SSLServerCertificate=", dsn)

    def test_get_db2_dsn_uses_explicit_dsn_verbatim(self):
        explicit_dsn = "DATABASE=testdb;HOSTNAME=custom-host;PORT=50000;PROTOCOL=TCPIP;UID=u;PWD=p;"
        with patch.dict(
            os.environ,
            {
                "DB2_DSN": explicit_dsn,
                "DB2_HOST": "should-not-be-used",
                "DB2_DATABASE": "should-not-be-used",
                "DB2_USERNAME": "should-not-be-used",
                "DB2_PASSWORD": "should-not-be-used",
            },
            clear=False,
        ):
            self.assertEqual(db._get_db2_dsn(), explicit_dsn)

    def test_get_db2_dsn_raises_when_required_fields_missing(self):
        with patch.dict(
            os.environ,
            {
                "DB2_DSN": "",
                "DB2_HOST": "",
                "DB2_DATABASE": "",
                "DB2_USERNAME": "",
                "DB2_PASSWORD": "",
            },
            clear=False,
        ):
            with self.assertRaises(RuntimeError):
                db._get_db2_dsn()

    def test_resolve_db2_ssl_ca_file_prefers_direct_file(self):
        direct_path = os.path.join(self.temp_dir.name, "direct.pem")
        with open(direct_path, "w", encoding="utf-8") as handle:
            handle.write("dummy-cert")

        with patch.dict(
            os.environ,
            {
                "DB2_SSL_CA_FILE": direct_path,
                "DB2_SSL_CA_BASE64": "",
                "DB2_SSL_CA_NAME": "ignored.pem",
            },
            clear=False,
        ):
            resolved = db._resolve_db2_ssl_ca_file()

        self.assertEqual(resolved, direct_path)

    def test_resolve_db2_ssl_ca_file_decodes_base64_and_reuses_file(self):
        cert_bytes = b"-----BEGIN CERTIFICATE-----\nFAKE\n-----END CERTIFICATE-----\n"
        encoded = base64.b64encode(cert_bytes).decode("utf-8")

        with patch.dict(
            os.environ,
            {
                "DB2_SSL_CA_FILE": "",
                "DB2_SSL_CA_BASE64": encoded,
                "DB2_SSL_CA_NAME": "ca-test.pem",
            },
            clear=False,
        ):
            first_path = db._resolve_db2_ssl_ca_file()
            second_path = db._resolve_db2_ssl_ca_file()

        self.assertEqual(first_path, second_path)
        self.assertTrue(os.path.exists(first_path))
        with open(first_path, "rb") as cert_file:
            self.assertEqual(cert_file.read(), cert_bytes)

    def test_get_db_returns_sqlite_adapter_by_default(self):
        with patch.dict(os.environ, {"DB_PROVIDER": "sqlite"}, clear=False):
            conn_adapter = db.get_db()
            try:
                result = conn_adapter.execute("SELECT 1 AS value").fetchone()
                self.assertEqual(result["value"], 1)
            finally:
                conn_adapter.close()


if __name__ == "__main__":
    unittest.main()