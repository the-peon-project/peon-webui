# PEON Web UI Guide

This repo contains the PEON dashboard application. It is the busiest application surface in the workspace and the only repo with a clear committed automated test suite.

## Scope

- Backend API: `backend/`
- Frontend app: `frontend/`
- Python tests: `tests/`
- Docker packaging: `Dockerfile`, `docker-compose.example.yml`

## Runtime Map

- Backend framework: FastAPI
- Backend entrypoint: `backend/server.py`
- Backend default port: `8001`
- Frontend stack: React + CRACO
- Frontend entrypoint: `frontend/src/App.js`
- Frontend default port: `3000`
- Persistent backend data: SQLite under `/data` in containerized runs

## Working Rules

1. Treat backend and frontend as separate validation surfaces.
2. When changing API shapes, check frontend consumers in `frontend/src/` and backend route definitions in `backend/routes/`.
3. When changing auth, permissions, or admin flows, inspect tests under `tests/` before editing.
4. Keep Docker and local-development commands aligned when ports, env vars, or startup behavior change.
5. If user-visible behavior changes, update `peon-docs/` source docs in the same pass.

## Commands

### Backend

```bash
cd /home/richard/development/peon-webui/backend
python3 -m pip install -r requirements.txt
python3 server.py
```

### Frontend

```bash
cd /home/richard/development/peon-webui/frontend
yarn install
yarn start
```

### Tests

```bash
cd /home/richard/development/peon-webui
python3 -m pytest tests

cd /home/richard/development/peon-webui/frontend
CI=true yarn test --watchAll=false
```

## Important Files

- Backend app: `backend/server.py`
- Backend config: `backend/core/config.py`
- Backend routes: `backend/routes/`
- Frontend package metadata: `frontend/package.json`
- Frontend app root: `frontend/src/App.js`
- API tests: `tests/test_peon_dashboard.py`
- Permission tests: `tests/test_role_permissions.py`
- Docker example: `docker-compose.example.yml`

## Validation Expectations

- Backend route or auth changes: run `python3 -m pytest tests`
- Frontend UI changes: run `CI=true yarn test --watchAll=false`
- Broad full-stack changes: validate backend tests first, then frontend tests
- If tests rely on external environment configuration, say so explicitly in the result

## Known Constraints

- The committed Python tests use HTTP requests and may rely on a configured backend target via `REACT_APP_BACKEND_URL`.
- Frontend scripts are CRACO-based: `start`, `build`, and `test` are all routed through CRACO.
- Backend CORS, secrets, and sync interval are configured in `backend/core/config.py` and `.env`.

## Cross-Repo Dependencies

- Calls `peon-orc` APIs for orchestrator and server control
- User-visible behavior should be reflected in `peon-docs/`
- Any backend assumptions about plans or images may require checking `peon-warplans/` or `peon-wartable/`

## Default Workflow

1. Identify whether the change is backend, frontend, or both.
2. Read the owning route/component/test first.
3. Make the smallest repo-local edit.
4. Run the narrowest backend or frontend validation that can fail meaningfully.
5. Check whether docs also need to change.