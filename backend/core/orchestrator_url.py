"""
Orchestrator URL resolution helper
Handles URL rewriting for Docker networking scenarios via environment configuration
"""
import os
import logging
from urllib.parse import urlparse, urlunparse

logger = logging.getLogger(__name__)

def resolve_orchestrator_url(configured_url: str) -> str:
    """
    Resolve orchestrator URL, applying Docker networking rewrites if configured.
    
    This function allows administrators to configure URL mappings via environment
    variables when orchestrators are accessible via different URLs from within
    Docker containers (e.g., using service names) versus from external clients.
    
    Example use case:
    - External URL: http://server.example.com:5000
    - Internal Docker URL: http://orchestrator-service:5000
    
    Configure via ORCHESTRATOR_URL_OVERRIDE environment variable:
    ORCHESTRATOR_URL_OVERRIDE="http://server.example.com:5000=http://orchestrator-service:5000"
    
    Multiple mappings can be comma-separated:
    ORCHESTRATOR_URL_OVERRIDE="http://server1.com:5000=http://orc1:5000,http://server2.com:5000=http://orc2:5000"
    
    Args:
        configured_url: The URL as configured by the user/wizard
        
    Returns:
        The actual URL to use for API calls (either rewritten or original)
    """
    if not configured_url:
        return configured_url

    # Check environment variable for URL overrides
    override = os.environ.get('ORCHESTRATOR_URL_OVERRIDE')
    if override:
        # Parse and apply URL mappings
        # Format: "external1=internal1,external2=internal2"
        for mapping in override.split(','):
            if '=' not in mapping:
                continue
            
            external, internal = mapping.split('=', 1)
            external = external.strip()
            internal = internal.strip()
            
            if configured_url.startswith(external):
                resolved = configured_url.replace(external, internal, 1)
                logger.info(f"Orchestrator URL rewrite: {configured_url} -> {resolved}")
                return resolved
    
    # Automatic localhost rewrite for containerized webui deployments.
    # Users often configure orchestrators as http://localhost:5000 in the UI,
    # which resolves to the webui container itself instead of the host machine.
    try:
        parsed = urlparse(configured_url)
        if parsed.hostname in {'localhost', '127.0.0.1'}:
            localhost_target = os.environ.get('ORCHESTRATOR_LOCALHOST_TARGET', 'host.docker.internal').strip()
            if localhost_target:
                netloc = localhost_target
                if parsed.port:
                    netloc = f"{localhost_target}:{parsed.port}"
                rewritten = urlunparse((
                    parsed.scheme,
                    netloc,
                    parsed.path,
                    parsed.params,
                    parsed.query,
                    parsed.fragment,
                ))
                logger.info(f"Orchestrator localhost rewrite: {configured_url} -> {rewritten}")
                return rewritten
    except Exception as exc:
        logger.warning(f"Failed to process orchestrator localhost rewrite for '{configured_url}': {exc}")
    
    # No matching override found, use URL as-is
    return configured_url
