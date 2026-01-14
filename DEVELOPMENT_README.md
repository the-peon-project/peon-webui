# PEON Dashboard - Development Guide

A modern web application for managing game servers through the PEON ecosystem.

## Technology Stack

- **Frontend**: React 18 with hooks, Lucide icons, TailwindCSS-style classes
- **Backend**: FastAPI (Python 3.11), SQLite database
- **Real-time**: WebSocket for live chat
- **Authentication**: JWT tokens with RBAC

## Quick Start (Development)

### Prerequisites
- Node.js 18+
- Python 3.11+
- yarn

### Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python server.py
```

Backend runs on `http://localhost:8001`

### Frontend Setup

```bash
cd frontend
yarn install
yarn start
```

Frontend runs on `http://localhost:3000`

### Environment Variables

**Frontend** (`.env`):
```env
REACT_APP_BACKEND_URL=http://localhost:8001
```

**Backend** (`.env`):
```env
SECRET_KEY=your-secret-key-change-in-production
CORS_ORIGINS=http://localhost:3000
```

## Docker Deployment

### Building the Image

```bash
# Build with version tag
docker build -t peon-webapp:latest --build-arg VERSION=1.0.0 .

# Or with a specific backend URL for production
docker build -t peon-webapp:latest \
  --build-arg VERSION=1.0.0 \
  --build-arg REACT_APP_BACKEND_URL=https://your-domain.com .
```

### Running the Container

```bash
docker run -d \
  --name peon-webapp \
  -p 80:80 \
  -p 8001:8001 \
  -v peon-data:/data \
  peon-webapp:latest
```

### Docker Compose Integration

Add the following to your project's `docker-compose.yml`:

```yaml
version: '3.8'

services:
  peon-webapp:
    image: peon-webapp:latest
    # Or build from source:
    # build:
    #   context: ./peon-webapp
    #   args:
    #     VERSION: "1.0.0"
    #     REACT_APP_BACKEND_URL: ""
    container_name: peon-webapp
    restart: unless-stopped
    ports:
      - "80:80"       # Web interface
      - "8001:8001"   # API (optional, for direct access)
    volumes:
      - peon-webapp-data:/data                    # SQLite database
      - ./game-logos:/app/frontend/build/game-logos  # Custom game logos
    environment:
      - SECRET_KEY=your-production-secret-key
      - LOG_LEVEL=INFO
    networks:
      - peon-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8001/api/system/status"]
      interval: 30s
      timeout: 10s
      retries: 3

volumes:
  peon-webapp-data:

networks:
  peon-network:
    external: true
```

### Full PEON Stack Example

```yaml
version: '3.8'

services:
  # PEON Orchestrator
  peon-orc:
    image: peon-orc:latest
    container_name: peon-orc
    restart: unless-stopped
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - peon-servers:/home/peon/servers
      - ./warplans:/home/peon/warplans
    environment:
      - API_KEY=your-orchestrator-api-key
    ports:
      - "5000:5000"
    networks:
      - peon-network

  # PEON Dashboard
  peon-webapp:
    image: peon-webapp:latest
    container_name: peon-webapp
    restart: unless-stopped
    depends_on:
      - peon-orc
    ports:
      - "80:80"
    volumes:
      - peon-webapp-data:/data
      - ./game-logos:/app/frontend/build/game-logos
    environment:
      - SECRET_KEY=your-webapp-secret-key
    networks:
      - peon-network

volumes:
  peon-servers:
  peon-webapp-data:

networks:
  peon-network:
    driver: bridge
```

## Project Structure

```
peon-webapp/
├── Dockerfile
├── README.md
├── backend/
│   ├── server.py           # Main FastAPI application
│   ├── requirements.txt
│   ├── core/               # Core modules
│   │   ├── config.py       # Configuration
│   │   ├── database.py     # Database helpers
│   │   ├── security.py     # Auth & JWT
│   │   └── websocket.py    # WebSocket manager
│   ├── models/             # Pydantic models
│   ├── routes/             # API routes
│   └── services/           # Business logic
└── frontend/
    ├── package.json
    ├── public/
    │   ├── game-logos/     # Game logo images
    │   └── peon-logo.png
    └── src/
        ├── App.js          # Main component
        ├── App.css         # Styles
        ├── HomePage.js
        ├── ServersPage.js
        ├── UsersPage.js
        ├── components/     # Reusable components
        ├── hooks/          # Custom hooks
        └── utils/          # Utility functions
```

## Key Features

### Server Management
- Multi-orchestrator support
- Start/Stop/Restart servers
- Server health stats (CPU, memory, uptime)
- Deploy new servers from warplans
- Detailed server info modal

### User Management
- Role-based access control (Admin, Moderator, User)
- Link users to specific orchestrators or servers
- Password management
- Chat ban/unban

### Community Features
- Real-time chat with WebSocket
- Markdown support in messages
- Emoji picker
- Gaming session scheduler with RSVP

### Admin Panel
- Feature toggles (chat, sessions, online users, stats)
- Audit log with filtering by category
- System configuration

## API Documentation

Access the interactive API documentation at:
- Swagger UI: `http://localhost:8001/docs`
- ReDoc: `http://localhost:8001/redoc`

## Logging

All application logs are output to stdout for container compatibility:
- Backend logs: Python logging to stdout
- Nginx logs: Access and error logs to stdout/stderr

View logs with:
```bash
docker logs -f peon-webapp
```

## Game Logos

Place game logo images in the `game-logos` directory:
- Filename: `{game_uid}.png` (or .jpg, .webp, .svg, .gif)
- Example: `valheim.png`, `minecraft.png`
- Recommended size: 128x128px or larger (will be resized automatically)

## Security Notes

1. **Change the SECRET_KEY** in production
2. Use HTTPS in production (configure nginx or use a reverse proxy)
3. The first user created via the setup wizard is always an admin
4. API keys for orchestrators are stored encrypted

## Troubleshooting

### Container won't start
Check logs: `docker logs peon-webapp`

### WebSocket connection fails
Ensure ports are properly exposed and no firewall is blocking WebSocket connections.

### Database reset
Delete the volume to reset: `docker volume rm peon-webapp-data`

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests
5. Submit a pull request

## License

MIT License - See LICENSE file for details.
