# PEON Dashboard

A modern web application for managing game servers using the PEON ecosystem (peon-orchestrator, peon-warplans).

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
pip install -r requirements.txt
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
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
