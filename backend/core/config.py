import os
import logging
import sys
from pathlib import Path
from dotenv import load_dotenv

ROOT_DIR = Path(__file__).parent.parent
load_dotenv(ROOT_DIR / '.env')

# Application settings
SECRET_KEY = os.environ.get('SECRET_KEY', 'your-secret-key-change-in-production')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours

# Background sync interval (5 minutes)
SYNC_INTERVAL = 300

# CORS settings
CORS_ORIGINS = os.environ.get('CORS_ORIGINS', '*').split(',')

# Feature flags (stored in DB, defaults here)
DEFAULT_FEATURES = {
    'online_users': True,
    'chat': True,
    'gaming_sessions': True,
    'server_stats': True,
}

# Role permissions
ROLE_PERMISSIONS = {
    'admin': {
        'can_manage_users': True,
        'can_manage_orchestrators': True,
        'can_manage_servers': True,
        'can_manage_sessions': True,
        'can_moderate_chat': True,
        'can_view_servers': True,
        'can_view_audit_log': True,
    },
    'moderator': {
        'can_manage_users': False,
        'can_manage_orchestrators': False,
        'can_manage_servers': False,
        'can_manage_sessions': True,
        'can_moderate_chat': True,
        'can_view_servers': True,
        'can_view_audit_log': False,
    },
    'user': {
        'can_manage_users': False,
        'can_manage_orchestrators': False,
        'can_manage_servers': False,
        'can_manage_sessions': False,
        'can_moderate_chat': False,
        'can_view_servers': True,
        'can_view_audit_log': False,
    }
}

# Configure logging to stdout for container compatibility
def setup_logging():
    """Configure logging to stdout for container environments"""
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[
            logging.StreamHandler(sys.stdout)
        ]
    )
    # Ensure all loggers output to stdout
    for handler in logging.root.handlers[:]:
        logging.root.removeHandler(handler)
    
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s'))
    logging.root.addHandler(handler)
    logging.root.setLevel(logging.INFO)

# Settings object for easy access
class Settings:
    SECRET_KEY = SECRET_KEY
    ALGORITHM = ALGORITHM
    ACCESS_TOKEN_EXPIRE_MINUTES = ACCESS_TOKEN_EXPIRE_MINUTES
    SYNC_INTERVAL = SYNC_INTERVAL
    CORS_ORIGINS = CORS_ORIGINS
    ROOT_DIR = ROOT_DIR
    
settings = Settings()
