# Orchestrator URL Configuration

This document explains how orchestrator URLs are handled in the PEON WebUI, particularly for Docker deployments where internal networking differs from external access.

## Problem

When the WebUI and Orchestrator containers run on the same Docker host:
- Orchestrators should be configured with their external URL (e.g., `http://server.example.com:5000`) for remote access
- But from within Docker, accessing the external IP may fail due to hairpin NAT limitations
- Containers on the same Docker network should communicate directly using service names (e.g., `http://orchestrator:5000`)

## Solution

The WebUI supports optional URL rewriting via environment variables. This allows you to configure different URLs for internal Docker networking while storing the external URLs in the database.

### Configuration via Environment Variables

Set the `ORCHESTRATOR_URL_OVERRIDE` environment variable to map external URLs to internal Docker service names:

**Single orchestrator:**
```yaml
# docker-compose.yml
services:
  webui:
    environment:
      - ORCHESTRATOR_URL_OVERRIDE=http://server.example.com:5000=http://orchestrator:5000
```

**Multiple orchestrators:**
```yaml
services:
  webui:
    environment:
      - ORCHESTRATOR_URL_OVERRIDE=http://server1.example.com:5000=http://orc1:5000,http://server2.example.com:5000=http://orc2:5000
```

Format: `external_url=internal_url,external_url2=internal_url2`

### When to Use URL Overrides

**Use URL overrides when:**
- ✅ Orchestrators run on the same Docker host as WebUI
- ✅ You experience connection timeouts to external URLs from within Docker
- ✅ Orchestrators are on the same Docker network

**Don't use URL overrides when:**
- ❌ Orchestrators are on different physical/virtual hosts
- ❌ External URLs are fully accessible from within Docker containers
- ❌ Using production orchestrators with proper external DNS/routing

### Example Docker Compose Configuration

```yaml
version: '3.8'

services:
  orchestrator:
    image: peon/orchestrator:latest
    container_name: peon.orc
    ports:
      - "5000:5000"
    environment:
      - API_KEY=your-api-key-here
  
  webui:
    image: peon/webui:latest
    container_name: peon.webui
    ports:
      - "80:80"
      - "8001:8001"
    environment:
      # Map external URL to Docker service name
      - ORCHESTRATOR_URL_OVERRIDE=http://server.example.com:5000=http://peon.orc:5000
    volumes:
      - ./data:/data
```

### Production Deployments

For production deployments where orchestrators are on different hosts:
- Configure orchestrators with their actual external URLs
- **Do not** set `ORCHESTRATOR_URL_OVERRIDE`
- The WebUI will connect directly to the configured URLs

## Wizard Input Changes

The orchestrator URL input in the setup wizard has been improved:
- Changed from `type="url"` to `type="text"` to prevent browser URL normalization
- Added helper text: "Include the full URL with protocol and port"
- Added backend validation to ensure URLs start with `http://` or `https://`
- Added example placeholder: `http://server.example.com:5000`

**Important:** Always enter the full external URL including port in the wizard. URL overrides are applied at runtime, not during configuration.
your configuration:

**Check orchestrator URLs in database:**
```bash
docker exec peon.webui python3 -c "
import sqlite3
conn = sqlite3.connect('/data/peon.db')
cursor = conn.cursor()
cursor.execute('SELECT name, base_url FROM orchestrators')
for row in cursor.fetchall():
    print(f'{row[0]}: {row[1]}')
"
```

**Test URL resolution with overrides:**
```bash
# Without override - should return original URL
docker exec peon.webui bash -c "cd /app/backend && python3 -c \"
from core.orchestrator_url import resolve_orchestrator_url
print(resolve_orchestrator_url('http://server.example.com:5000'))
\""

# With override - set environment variable first in docker-compose.yml
# Should return the mapped internal URL
```

**Test actual connectivity:**
```bash
# From webui container to orchestrator
docker exec peon.webui curl -s http://orchestrator:5000/api/v1/orchestrator

# Check webui logs for URL rewrite messages
docker compose logs webui | grep "Orchestrator URL rewritedocker exec peon.webui python3 -c "
from core.orchestrator_url import resolve_orchestrator_url
print(resolve_orchestrator_url('http://server.warcamp.org:5000'))
"
```
