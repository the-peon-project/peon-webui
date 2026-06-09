import logging
import os
import uuid
from datetime import datetime, timezone

from core.database import get_db
from core.security import get_password_hash

logger = logging.getLogger(__name__)


def _is_enabled(value: str) -> bool:
    return str(value).strip().lower() in {"1", "true", "yes", "on"}


def ensure_test_users() -> None:
    """Ensure expected test users exist for integration/API test runs.

    This is disabled by default and is intended for controlled test deployments
    (for example, dockerized local stacks).
    """
    if not _is_enabled(os.environ.get("PEON_ENABLE_TEST_SEED", "false")):
        return

    now = datetime.now(timezone.utc).isoformat()
    users = [
        {
            "username": os.environ.get("PEON_TEST_ADMIN_USERNAME", "admin"),
            "email": os.environ.get("PEON_TEST_ADMIN_EMAIL", "admin@peon.local"),
            "password": os.environ.get("PEON_TEST_ADMIN_PASSWORD", "admin123456"),
            "role": "admin",
        },
        {
            "username": os.environ.get("PEON_TEST_DASH_USERNAME", "testadmin"),
            "email": os.environ.get("PEON_TEST_DASH_EMAIL", "testadmin@peon.local"),
            "password": os.environ.get("PEON_TEST_DASH_PASSWORD", "Test1234!"),
            "role": "admin",
        },
    ]

    conn = get_db()
    cursor = conn.cursor()

    try:
        created = 0
        updated = 0

        for user in users:
            password_hash = get_password_hash(user["password"])
            cursor.execute("SELECT id FROM users WHERE username = ?", (user["username"],))
            existing = cursor.fetchone()

            if existing:
                cursor.execute(
                    """
                    UPDATE users
                    SET email = ?, password_hash = ?, role = ?, is_chat_banned = 0
                    WHERE username = ?
                    """,
                    (user["email"], password_hash, user["role"], user["username"]),
                )
                updated += 1
            else:
                cursor.execute(
                    """
                    INSERT INTO users (id, username, email, password_hash, role, is_chat_banned, created_at)
                    VALUES (?, ?, ?, ?, ?, 0, ?)
                    """,
                    (
                        str(uuid.uuid4()),
                        user["username"],
                        user["email"],
                        password_hash,
                        user["role"],
                        now,
                    ),
                )
                created += 1

        # Mark initialized when seed mode is enabled so auth/system checks are consistent.
        cursor.execute(
            "INSERT OR REPLACE INTO system_config (key, value) VALUES ('initialized', 'true')"
        )

        conn.commit()
        logger.info(
            "Test seed complete (created=%s, updated=%s).", created, updated
        )
    finally:
        conn.close()
