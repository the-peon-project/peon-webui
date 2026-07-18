# PEON Dashboard

A modern web application for managing game servers using the PEON ecosystem (peon-orchestrator, peon-warplans).

## Brand Guide

PEON's visual identity should feel like a war camp command console: practical, sturdy, and slightly medieval without becoming ornamental.

### Design Principles

- Use slate, steel, bone, green, and light blue as the core palette.
- Avoid purple, violet, indigo, and neon-magenta accents in product UI.
- Keep surfaces grounded and functional: stone-like panels, beveled edges, and clear hierarchy.
- Reserve bright green for success/online states, red for danger/offline states, and light blue for informational emphasis.
- Prefer readable, high-contrast layouts over decorative flourishes.

### Typography

- Use strong display faces for headings and compact readable body text.
- In classic mode, typography may feel pixel-era and game-like.
- In clean mode, typography should stay crisp and modern.

### Shape Language

- Rounded corners should be modest in clean mode and squared off in classic mode.
- Panels, modals, buttons, and cards should look like they belong to the same control surface.
- Shadows should imply depth but never overpower content.

### Visual States

- Success: green.
- Warning: amber or gold.
- Error: red.
- Informational / active selection: slate or light blue.

### Theme Modes

- `clean`: the current production default, modern and restrained.
- `horde`: a fortified warcamp theme with iron, bone, leather, and battle-green accents.
- `alliance`: a human castle theme with stone, steel, royal blue, and bannered symmetry.

Theme controls live in the Admin panel and are restricted to admin users.

All new UI should build from these rules before introducing any new visual treatment.

## Features

- **Server Management**: Start, stop, restart, and update game servers
- **Real-time Console**: Stream server logs in real-time
- **Community Chat**: Markdown-enabled chat with emoji support
- **Gaming Sessions**: Schedule and manage gaming sessions with RSVPs
- **Admin Panel**: Feature toggles, audit logs, backup/restore, notifications
- **User Management**: Role-based access control (admin, moderator, user)

## Quick Start with Docker

### Build

```bash
docker build -t peon-dashboard .
```

### Run

```bash
docker run -d \
  --name peon-dashboard \
  -p 80:80 \
  -v peon-data:/data \
  peon-dashboard
```

### Access

- **Dashboard**: http://localhost
- **API Docs**: http://localhost:8001/docs

## Development Setup

### Prerequisites

- Node.js 20+
- Python 3.11+
- Yarn

### Backend

```bash
cd backend
python3 -m pip install -r requirements.txt
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

Or from repository root:

```bash
python3 -m uvicorn backend.server:app --host 0.0.0.0 --port 8001 --reload
```

### Frontend

```bash
cd frontend
yarn install
REACT_APP_BACKEND_URL=http://localhost:8001 yarn start
```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_PATH` | SQLite database path | `/data/peon.db` |
| `JWT_SECRET` | JWT signing secret | Auto-generated |
| `LOG_LEVEL` | Logging level | `INFO` |
| `REACT_APP_BACKEND_URL` | Backend API URL | `/api` |

### Orchestrator URL in Docker

When WebUI and ORC run in the same Docker Compose stack, configure orchestrators with the internal service URL (for example `http://peon.orc:5000`) so API calls resolve from inside the WebUI container.

## Architecture

```
/app
├── backend/
│   ├── core/           # Config, database, security, websocket
│   ├── models/         # Pydantic models
│   ├── routes/         # API routes
│   ├── services/       # Business logic
│   └── server.py       # FastAPI application
├── frontend/
│   ├── public/         # Static assets
│   └── src/
│       ├── components/ # React components
│       ├── utils/      # Helper functions
│       └── App.js      # Main application
└── Dockerfile          # Multi-stage build
```

## API Endpoints

See `/docs` endpoint for interactive API documentation.

### Key Endpoints

- `POST /api/auth/login` - Authentication
- `GET /api/orchestrators` - List orchestrators
- `GET /api/proxy/{orch_id}/servers` - List servers
- `PUT /api/proxy/{orch_id}/server/{action}/{uid}` - Server actions
- `GET /api/admin/features` - Feature toggles
- `POST /api/backup/create` - Create backup
- `POST /api/notifications/test` - Test notifications

## License

Part of the PEON Project. See LICENSE for details.
