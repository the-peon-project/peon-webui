# Orchestrator URL Configuration

This document explains how PEON WebUI resolves orchestrator URLs in local and containerized deployments.

## Why this exists

When WebUI runs in Docker, values like http://localhost:5000 usually point to the WebUI container itself, not your host machine. That can make orchestrator test/connect/sync calls fail even though the URL looks valid in the UI.

## Runtime URL resolution order

1. If ORCHESTRATOR_URL_OVERRIDE is set and a mapping matches, that mapping is used.
2. Else if the configured URL host is localhost or 127.0.0.1, WebUI rewrites it to ORCHESTRATOR_LOCALHOST_TARGET.
3. Else the configured URL is used as-is.

Default ORCHESTRATOR_LOCALHOST_TARGET value: host.docker.internal

## Environment variables

ORCHESTRATOR_URL_OVERRIDE
- Optional explicit mapping list.
- Format: external_url=internal_url,external_url2=internal_url2
- Example:
  ORCHESTRATOR_URL_OVERRIDE=http://server1.example.com:5000=http://orc1:5000,http://server2.example.com:5000=http://orc2:5000

ORCHESTRATOR_LOCALHOST_TARGET
- Optional host used when users configure localhost or 127.0.0.1 in the UI.
- Default: host.docker.internal
- Example:
  ORCHESTRATOR_LOCALHOST_TARGET=172.17.0.1

## Standalone deployment in /home/richard/peon

If you are running the standalone stack from /home/richard/peon and added a local orchestrator in WebUI, set these environment values on the WebUI service in your compose fragment:

- ORCHESTRATOR_LOCALHOST_TARGET=host.docker.internal
- ORCHESTRATOR_URL_OVERRIDE=http://localhost:5000=http://peon.orc:5000

This gives you both behaviors:
- localhost entries from the UI are rewritten safely.
- explicit overrides for known external/local URLs still work.

## Compose example

services:
  webui:
    environment:
      - ORCHESTRATOR_LOCALHOST_TARGET=host.docker.internal
      - ORCHESTRATOR_URL_OVERRIDE=http://localhost:5000=http://peon.orc:5000

## What to enter in the UI

In the setup wizard and orchestrator modal, always enter a full URL including scheme and port, for example:
- http://localhost:5000
- http://server.example.com:5000

## Quick verification

1. Confirm stored orchestrator URLs:
   docker exec peon.webui python3 -c "import sqlite3; c=sqlite3.connect('/data/peon.db'); cur=c.cursor(); cur.execute('select name, base_url from orchestrators'); print(cur.fetchall())"
2. Test orchestrator endpoint from container network:
   docker exec peon.webui curl -s http://peon.orc:5000/api/v1/orchestrator
3. Check backend logs for rewrite messages:
   docker compose logs webui | grep "Orchestrator URL rewrite\|Orchestrator localhost rewrite"
