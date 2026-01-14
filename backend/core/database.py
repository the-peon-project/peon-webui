import sqlite3
from pathlib import Path

ROOT_DIR = Path(__file__).parent.parent
DB_PATH = ROOT_DIR / 'peon.db'

def get_db():
    """Get database connection with row factory"""
    conn = sqlite3.connect(DB_PATH, timeout=30.0)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")  # Better concurrency
    return conn

def dict_from_row(row):
    """Convert SQLite row to dictionary"""
    return dict(zip(row.keys(), row)) if row else None

def init_db():
    """Initialize database with all required tables"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Users table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            username TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'user',
            is_chat_banned INTEGER DEFAULT 0,
            created_at TEXT NOT NULL
        )
    ''')
    
    # Orchestrator instances table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS orchestrators (
            id TEXT PRIMARY KEY,
            name TEXT UNIQUE NOT NULL,
            base_url TEXT NOT NULL,
            api_key TEXT NOT NULL,
            description TEXT,
            version TEXT,
            is_active INTEGER DEFAULT 1,
            created_by TEXT NOT NULL,
            created_at TEXT NOT NULL,
            last_synced TEXT,
            FOREIGN KEY (created_by) REFERENCES users(id)
        )
    ''')
    
    # User-Orchestrator access table (multitenancy)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS user_orchestrator_access (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            orchestrator_id TEXT NOT NULL,
            created_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (orchestrator_id) REFERENCES orchestrators(id),
            UNIQUE(user_id, orchestrator_id)
        )
    ''')
    
    # Server links table (user access to specific servers)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS server_links (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            orchestrator_id TEXT NOT NULL,
            server_uid TEXT NOT NULL,
            permissions TEXT DEFAULT 'read',
            created_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (orchestrator_id) REFERENCES orchestrators(id),
            UNIQUE(user_id, orchestrator_id, server_uid)
        )
    ''')
    
    # Cached servers table (synced every 5 minutes)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS cached_servers (
            id TEXT PRIMARY KEY,
            orchestrator_id TEXT NOT NULL,
            server_data TEXT NOT NULL,
            synced_at TEXT NOT NULL,
            FOREIGN KEY (orchestrator_id) REFERENCES orchestrators(id)
        )
    ''')
    
    # System config table (for admin wizard and feature flags)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS system_config (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        )
    ''')
    
    # Gaming sessions table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS gaming_sessions (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            description TEXT,
            orchestrator_id TEXT NOT NULL,
            server_uid TEXT,
            scheduled_time TEXT NOT NULL,
            duration_minutes INTEGER DEFAULT 120,
            created_by TEXT NOT NULL,
            created_at TEXT NOT NULL,
            status TEXT DEFAULT 'scheduled',
            FOREIGN KEY (orchestrator_id) REFERENCES orchestrators(id),
            FOREIGN KEY (created_by) REFERENCES users(id)
        )
    ''')
    
    # Session RSVPs table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS session_rsvps (
            id TEXT PRIMARY KEY,
            session_id TEXT NOT NULL,
            user_id TEXT NOT NULL,
            status TEXT DEFAULT 'attending',
            created_at TEXT NOT NULL,
            FOREIGN KEY (session_id) REFERENCES gaming_sessions(id),
            FOREIGN KEY (user_id) REFERENCES users(id),
            UNIQUE(session_id, user_id)
        )
    ''')
    
    # Chat messages table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS chat_messages (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            message TEXT NOT NULL,
            created_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    ''')
    
    # Audit log table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS audit_log (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            username TEXT NOT NULL,
            action_type TEXT NOT NULL,
            category TEXT NOT NULL,
            target_type TEXT,
            target_id TEXT,
            details TEXT,
            ip_address TEXT,
            created_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    ''')
    
    # Online users tracking table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS online_users (
            user_id TEXT PRIMARY KEY,
            username TEXT NOT NULL,
            last_seen TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    ''')
    
    # Add new columns to existing tables if they don't exist
    try:
        cursor.execute("ALTER TABLE users ADD COLUMN is_chat_banned INTEGER DEFAULT 0")
    except sqlite3.OperationalError:
        pass  # Column already exists
    
    conn.commit()
    conn.close()
