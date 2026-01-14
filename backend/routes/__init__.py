from fastapi import APIRouter

from .auth import router as auth_router
from .system import router as system_router
from .admin import router as admin_router
from .orchestrators import router as orchestrators_router
from .proxy import router as proxy_router
from .sessions import router as sessions_router
from .chat import router as chat_router
from .console import router as console_router
from .backup import router as backup_router
from .notifications import router as notifications_router

# Create main API router
api_router = APIRouter(prefix="/api")

# Include all sub-routers
api_router.include_router(auth_router, tags=["Authentication"])
api_router.include_router(system_router, tags=["System"])
api_router.include_router(admin_router, tags=["Admin"])
api_router.include_router(orchestrators_router, tags=["Orchestrators"])
api_router.include_router(proxy_router, tags=["Proxy"])
api_router.include_router(sessions_router, tags=["Sessions"])
api_router.include_router(chat_router, tags=["Chat"])
api_router.include_router(console_router, tags=["Console"])
api_router.include_router(backup_router, tags=["Backup"])
api_router.include_router(notifications_router, tags=["Notifications"])
