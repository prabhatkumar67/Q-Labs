import os
import sqlite3
import base64

def _db2_driver():
    try:
        import ibm_db_dbi
    except ImportError as exc:
        raise RuntimeError("Db2 requires the optional ibm-db package.") from exc
    return ibm_db_dbi

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")
DB_PATH = os.path.join(DATA_DIR, "platform.db")
FILES_DIR = os.path.join(DATA_DIR, "scenario_files")
IMAGES_DIR = os.path.join(DATA_DIR, "app_images")
CERTS_DIR = os.path.join(DATA_DIR, "certs")


def _get_db_provider() -> str:
    return os.getenv("DB_PROVIDER", "sqlite").strip().lower()


class ResultAdapter:
    def __init__(self, cursor):
        self._cursor = cursor

    def _to_dict(self, row):
        if row is None:
            return None
        if isinstance(row, sqlite3.Row):
            return dict(row)
        if isinstance(row, dict):
            return row

        columns = [col[0].lower() for col in self._cursor.description or []]
        if isinstance(row, tuple):
            return dict(zip(columns, row))
        return row

    def fetchone(self):
        return self._to_dict(self._cursor.fetchone())

    def fetchall(self):
        return [self._to_dict(r) for r in self._cursor.fetchall()]


class DBAdapter:
    def __init__(self, conn):
        self._conn = conn

    def execute(self, sql: str, params=()):
        cursor = self._conn.cursor()
        cursor.execute(sql, params)
        return ResultAdapter(cursor)

    def commit(self):
        self._conn.commit()

    def close(self):
        self._conn.close()


def _get_db2_dsn() -> str:
    dsn = os.getenv("DB2_DSN", "").strip()
    if dsn:
        return dsn

    host = os.getenv("DB2_HOST", "").strip()
    port = os.getenv("DB2_PORT", "50000").strip()
    database = os.getenv("DB2_DATABASE", "").strip()
    uid = os.getenv("DB2_USERNAME", "").strip()
    pwd = os.getenv("DB2_PASSWORD", "").strip()
    security = os.getenv("DB2_SECURITY", "SSL").strip()
    ssl_ca_file = _resolve_db2_ssl_ca_file()

    if not all([host, database, uid, pwd]):
        raise RuntimeError(
            "Missing Db2 configuration. Set DB2_DSN or DB2_HOST/DB2_DATABASE/DB2_USERNAME/DB2_PASSWORD."
        )

    dsn = (
        f"DATABASE={database};HOSTNAME={host};PORT={port};PROTOCOL=TCPIP;"
        f"UID={uid};PWD={pwd};Security={security};"
    )

    if ssl_ca_file:
        dsn += f"SSLServerCertificate={ssl_ca_file};"

    return dsn


def _resolve_db2_ssl_ca_file() -> str:
    direct_file = os.getenv("DB2_SSL_CA_FILE", "").strip()
    if direct_file:
        return direct_file

    cert_base64 = os.getenv("DB2_SSL_CA_BASE64", "").strip()
    if not cert_base64:
        return ""

    cert_name = os.getenv("DB2_SSL_CA_NAME", "db2-ca.pem").strip() or "db2-ca.pem"
    os.makedirs(CERTS_DIR, exist_ok=True)
    cert_path = os.path.join(CERTS_DIR, cert_name)

    if not os.path.exists(cert_path):
        cert_bytes = base64.b64decode(cert_base64)
        with open(cert_path, "wb") as cert_file:
            cert_file.write(cert_bytes)

    return cert_path


def _table_exists_db2(conn, table_name: str) -> bool:
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT 1
        FROM SYSCAT.TABLES
        WHERE TABSCHEMA = CURRENT SCHEMA
          AND TABNAME = ?
        FETCH FIRST 1 ROWS ONLY
        """,
        (table_name.upper(),),
    )
    row = cursor.fetchone()
    cursor.close()
    return row is not None


def _column_exists_db2(conn, table_name: str, column_name: str) -> bool:
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT 1
        FROM SYSCAT.COLUMNS
        WHERE TABSCHEMA = CURRENT SCHEMA
          AND TABNAME = ?
          AND COLNAME = ?
        FETCH FIRST 1 ROWS ONLY
        """,
        (table_name.upper(), column_name.upper()),
    )
    row = cursor.fetchone()
    cursor.close()
    return row is not None


def _init_sqlite_db():
    conn = sqlite3.connect(DB_PATH)
    conn.executescript(
        """
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

        CREATE TABLE IF NOT EXISTS scenarios (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT DEFAULT '',
            config_json TEXT DEFAULT '{}',
            db_file_path TEXT,
            parent_scenario_id TEXT,
            app_version_id TEXT,
            created_at TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS workflows (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT DEFAULT '',
            app_version_id TEXT NOT NULL,
            scenario_id TEXT NOT NULL,
            steps_json TEXT DEFAULT '[]',
            created_at TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS active_containers (
            id TEXT PRIMARY KEY,
            scenario_id TEXT,
            container_id TEXT NOT NULL UNIQUE,
            port INTEGER NOT NULL,
            sandbox_url TEXT NOT NULL,
            status TEXT DEFAULT 'running',
            app_version_id TEXT,
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
    """
    )

    # Migration: add columns if missing on existing tables
    try:
        conn.execute("SELECT name FROM active_containers LIMIT 1")
    except Exception:
        conn.execute("ALTER TABLE active_containers ADD COLUMN name TEXT DEFAULT NULL")

    try:
        conn.execute("SELECT app_version_id FROM active_containers LIMIT 1")
    except Exception:
        conn.execute("ALTER TABLE active_containers ADD COLUMN app_version_id TEXT")

    try:
        conn.execute("SELECT app_version_id FROM scenarios LIMIT 1")
    except Exception:
        conn.execute("ALTER TABLE scenarios ADD COLUMN app_version_id TEXT")

    try:
        conn.execute("SELECT data_path FROM app_versions LIMIT 1")
    except Exception:
        conn.execute("ALTER TABLE app_versions ADD COLUMN data_path TEXT DEFAULT '/app/data'")

    conn.commit()
    conn.close()


def _init_db2_db():
    dsn = _get_db2_dsn()
    conn = _db2_driver().connect(dsn, "", "")
    cursor = conn.cursor()

    if not _table_exists_db2(conn, "apps"):
        cursor.execute(
            """
            CREATE TABLE apps (
                id VARCHAR(64) NOT NULL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                description CLOB(1M) DEFAULT '',
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT TIMESTAMP
            )
            """
        )

    if not _table_exists_db2(conn, "app_versions"):
        cursor.execute(
            """
            CREATE TABLE app_versions (
                id VARCHAR(64) NOT NULL PRIMARY KEY,
                app_id VARCHAR(64) NOT NULL,
                version_tag VARCHAR(128) NOT NULL,
                docker_image_name VARCHAR(512) NOT NULL,
                data_path VARCHAR(1024) DEFAULT '/app/data',
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT TIMESTAMP
            )
            """
        )

    if not _table_exists_db2(conn, "scenarios"):
        cursor.execute(
            """
            CREATE TABLE scenarios (
                id VARCHAR(64) NOT NULL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                description CLOB(1M) DEFAULT '',
                config_json CLOB(1M) DEFAULT '{}',
                db_file_path VARCHAR(1024),
                parent_scenario_id VARCHAR(64),
                app_version_id VARCHAR(64),
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT TIMESTAMP
            )
            """
        )

    if not _table_exists_db2(conn, "workflows"):
        cursor.execute(
            """
            CREATE TABLE workflows (
                id VARCHAR(64) NOT NULL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                description CLOB(1M) DEFAULT '',
                app_version_id VARCHAR(64) NOT NULL,
                scenario_id VARCHAR(64) NOT NULL,
                steps_json CLOB(1M) DEFAULT '[]',
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT TIMESTAMP
            )
            """
        )

    if not _table_exists_db2(conn, "active_containers"):
        cursor.execute(
            """
            CREATE TABLE active_containers (
                id VARCHAR(64) NOT NULL PRIMARY KEY,
                scenario_id VARCHAR(64),
                container_id VARCHAR(128) NOT NULL UNIQUE,
                port INTEGER NOT NULL,
                sandbox_url VARCHAR(512) NOT NULL,
                status VARCHAR(32) DEFAULT 'running',
                app_version_id VARCHAR(64),
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT TIMESTAMP
            )
            """
        )

    if not _table_exists_db2(conn, "qa_runs"):
        cursor.execute(
            """
            CREATE TABLE qa_runs (
                id VARCHAR(64) NOT NULL PRIMARY KEY,
                app_version_id VARCHAR(64) NOT NULL,
                scenario_id VARCHAR(64),
                status VARCHAR(32) DEFAULT 'pending',
                started_at TIMESTAMP,
                completed_at TIMESTAMP,
                video_url VARCHAR(1024),
                issues_found INTEGER DEFAULT 0,
                log_output CLOB(1M)
            )
            """
        )
        
    if not _table_exists_db2(conn, "qa_results"):
        cursor.execute(
            """
            CREATE TABLE qa_results (
                id VARCHAR(64) NOT NULL PRIMARY KEY,
                qa_run_id VARCHAR(64) NOT NULL,
                element_id VARCHAR(255),
                issue_type VARCHAR(128),
                description CLOB(1M),
                screenshot_url VARCHAR(1024),
                severity VARCHAR(32) DEFAULT 'medium'
            )
            """
        )

    if not _column_exists_db2(conn, "active_containers", "name"):
        cursor.execute("ALTER TABLE active_containers ADD COLUMN name VARCHAR(255)")

    if not _column_exists_db2(conn, "active_containers", "app_version_id"):
        cursor.execute("ALTER TABLE active_containers ADD COLUMN app_version_id VARCHAR(64)")

    if not _column_exists_db2(conn, "scenarios", "app_version_id"):
        cursor.execute("ALTER TABLE scenarios ADD COLUMN app_version_id VARCHAR(64)")

    if not _column_exists_db2(conn, "app_versions", "data_path"):
        cursor.execute("ALTER TABLE app_versions ADD COLUMN data_path VARCHAR(1024) DEFAULT '/app/data'")

    conn.commit()
    cursor.close()
    conn.close()


def init_db():
    os.makedirs(DATA_DIR, exist_ok=True)
    os.makedirs(FILES_DIR, exist_ok=True)
    os.makedirs(IMAGES_DIR, exist_ok=True)

    if _get_db_provider() == "db2":
        _init_db2_db()
        return

    _init_sqlite_db()


def get_db() -> DBAdapter:
    if _get_db_provider() == "db2":
        dsn = _get_db2_dsn()
        return DBAdapter(_db2_driver().connect(dsn, "", ""))

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return DBAdapter(conn)
