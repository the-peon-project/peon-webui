"""
Orchestrator URL resolution helper
Handles URL rewriting for Docker networking scenarios via environment configuration
"""
import os
import logging

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
    # Check environment variable for URL overrides
    override = os.environ.get('ORCHESTRATOR_URL_OVERRIDE')
    if not override:
        # No overrides configured, use URL as-is
        return configured_url
    
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
    
    # No matching override found, use URL as-is
    return configured_url
