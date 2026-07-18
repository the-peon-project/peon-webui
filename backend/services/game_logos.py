from __future__ import annotations

import logging
import shutil
import urllib.request
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)

SUPPORTED_LOGO_EXTENSIONS = ["png", "jpg", "jpeg", "webp", "svg", "gif"]
REMOTE_WARPLANS_BRANCHES = ["main", "master"]

_PROJECT_ROOT = Path(__file__).resolve().parents[2]
_CACHE_DIR = Path("/data/game-logos")

_LOCAL_WARPLANS_DIRS = [
    Path("/app/peon-warplans"),
    _PROJECT_ROOT.parent / "peon-warplans",
]

_STATIC_LOGO_DIRS = [
    Path("/app/frontend/build/game-logos"),
    _PROJECT_ROOT / "frontend" / "public" / "game-logos",
]


def _safe_game_uid(game_uid: str) -> str:
    return "".join(ch for ch in (game_uid or "").strip().lower() if ch.isalnum() or ch in ["-", "_"])


def _ensure_cache_dir() -> Path:
    _CACHE_DIR.mkdir(parents=True, exist_ok=True)
    return _CACHE_DIR


def _existing_logo(base_dir: Path, game_uid: str, filename_prefix: Optional[str] = None) -> Optional[Path]:
    prefix = filename_prefix or game_uid
    for ext in SUPPORTED_LOGO_EXTENSIONS:
        candidate = base_dir / f"{prefix}.{ext}"
        if candidate.is_file():
            return candidate
    return None


def _copy_to_cache(source: Path, game_uid: str) -> Optional[Path]:
    try:
        cache_dir = _ensure_cache_dir()
        ext = source.suffix.lower()
        target = cache_dir / f"{game_uid}{ext}"
        shutil.copy2(source, target)
        return target
    except Exception as exc:
        logger.warning("Failed to copy logo %s to cache: %s", source, exc)
        return None


def _find_local_warplan_logo(game_uid: str) -> Optional[Path]:
    for warplans_dir in _LOCAL_WARPLANS_DIRS:
        game_dir = warplans_dir / game_uid
        logo = _existing_logo(game_dir, game_uid="logo", filename_prefix="logo")
        if logo:
            return logo
    return None


def _download_remote_logo(game_uid: str) -> Optional[Path]:
    cache_dir = _ensure_cache_dir()

    for branch in REMOTE_WARPLANS_BRANCHES:
        for ext in SUPPORTED_LOGO_EXTENSIONS:
            remote_url = (
                f"https://raw.githubusercontent.com/the-peon-project/peon-warplans/"
                f"{branch}/{game_uid}/logo.{ext}"
            )
            target = cache_dir / f"{game_uid}.{ext}"
            try:
                with urllib.request.urlopen(remote_url, timeout=8) as response:  # nosec B310
                    if response.status != 200:
                        continue
                    target.write_bytes(response.read())
                return target
            except Exception:
                continue

    return None


def ensure_logo_for_game(game_uid: str) -> Optional[Path]:
    """Ensure a logo exists in cache for the given game and return its path."""
    safe_uid = _safe_game_uid(game_uid)
    if not safe_uid:
        return None

    cache_dir = _ensure_cache_dir()
    if cached := _existing_logo(cache_dir, safe_uid):
        return cached

    if local_warplan_logo := _find_local_warplan_logo(safe_uid):
        if cached_logo := _copy_to_cache(local_warplan_logo, safe_uid):
            return cached_logo

    if downloaded := _download_remote_logo(safe_uid):
        return downloaded

    return None


def resolve_logo_path(game_uid: str, requested_ext: Optional[str] = None) -> Optional[Path]:
    """Resolve the best available logo path for a game, with fallback to default logo."""
    safe_uid = _safe_game_uid(game_uid)
    if not safe_uid:
        return None

    requested_ext = (requested_ext or "").strip().lower()
    cache_dir = _ensure_cache_dir()

    if requested_ext in SUPPORTED_LOGO_EXTENSIONS:
        requested_path = cache_dir / f"{safe_uid}.{requested_ext}"
        if requested_path.is_file():
            return requested_path

    if cached := _existing_logo(cache_dir, safe_uid):
        return cached

    if hydrated := ensure_logo_for_game(safe_uid):
        return hydrated

    for static_dir in _STATIC_LOGO_DIRS:
        if requested_ext in SUPPORTED_LOGO_EXTENSIONS:
            requested_path = static_dir / f"{safe_uid}.{requested_ext}"
            if requested_path.is_file():
                return requested_path

        if fallback := _existing_logo(static_dir, safe_uid):
            return fallback

    for static_dir in _STATIC_LOGO_DIRS:
        default_logo = static_dir / "logo.png"
        if default_logo.is_file():
            return default_logo

    return None
