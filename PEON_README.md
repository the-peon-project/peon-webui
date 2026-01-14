# PEON Web Application

A **Warcraft-themed** web application for managing multiple PEON orchestrator instances with multitenancy support.

![PEON Logo](./peon/media/PEON_L2R_large.png)

## 🎮 Features

### Core Functionality
- **Admin Wizard**: First-run setup wizard to initialize system with admin user and first orchestrator
- **Dynamic API Switching**: Dropdown selector to switch between multiple orchestrator instances
- **Multitenancy**: Admin can link users to specific orchestrators and servers
- **JWT Authentication**: Secure token-based authentication for webapp
- **API Key Management**: Per-orchestrator API keys for secure communication
- **Auto-Sync**: Background task syncs server states every 5 minutes from all orchestrators
- **SQLite Database**: Lightweight local database with cached server states
- **Dark Mode**: Warcraft RTS-inspired aesthetic (medieval, dark theme)

### User Roles
- **Admin**: Full access to all orchestrators, can manage users and orchestrator instances
- **User**: Access only to linked orchestrators and their servers

## 🏗️ Architecture

### Backend (FastAPI + SQLite)
- **Framework**: FastAPI with async support
- **Database**: SQLite with automatic initialization
- **Authentication**: JWT tokens (24-hour expiry)
- **Orchestrator Communication**: HTTP proxy with API Key authentication
- **Background Tasks**: Async server state synchronization every 5 minutes

### Frontend (React + Tailwind)
- **Framework**: React 19
- **Styling**: Custom Warcraft-themed CSS + Tailwind
- **State Management**: React hooks + localStorage
- **HTTP Client**: Axios with auth interceptors
- **UI Components**: Radix UI primitives

### Cloned Repositories
The following PEON project repositories are included:
- **peon-orc**: The orchestrator API (Flask-based)
- **peon-webui**: Original web UI (Flask-based)
- **peon**: Main project with media assets
- **peon-bot-discord**: Discord bot integration

## 📦 Data Models

### User
- id, username, email, password_hash, role, created_at

### Orchestrator Instance
- id, name, base_url, api_key, description, version, is_active, created_by, created_at, last_synced

### User-Orchestrator Access (Multitenancy)
- id, user_id, orchestrator_id, created_at

### Server Links
- id, user_id, orchestrator_id, server_uid, permissions, created_at

### Cached Servers
- id, orchestrator_id, server_data (JSON), synced_at

## 🔌 API Endpoints

### System
- `GET /api/system/status` - Check initialization status
- `POST /api/system/wizard` - Initialize system with admin user

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - Register new user (admin only)
- `GET /api/auth/me` - Get current user info

### Orchestrator Management
- `GET /api/orchestrators` - List accessible orchestrators
- `POST /api/orchestrators` - Add new orchestrator (admin only)
- `PUT /api/orchestrators/:id` - Update orchestrator (admin only)
- `DELETE /api/orchestrators/:id` - Delete orchestrator (admin only)

### Admin - User Management
- `GET /api/admin/users` - List all users with their access
- `POST /api/admin/link-user-orchestrator` - Link user to orchestrator
- `DELETE /api/admin/link-user-orchestrator` - Unlink user from orchestrator

### Proxy Endpoints (Dynamic Routing)
- `GET /api/proxy/:orch_id/servers` - Get cached servers from orchestrator
- `GET|POST|PUT|DELETE /api/proxy/:orch_id/*` - Proxy requests to orchestrator API

## 🚀 Quick Start

### First Time Setup

1. **Start Services**:
   ```bash
   sudo supervisorctl restart all
   ```

2. **Access the Web App**:
   - Open browser to the frontend URL
   - You'll be greeted with the **Admin Wizard**

3. **Complete Admin Wizard**:
   - Create admin username, email, password
   - Add your first orchestrator instance:
     - Name: "Main Server"
     - URL: "http://your-orchestrator:5000"
     - API Key: (from orchestrator's environment)
   - Click "Begin Your Quest"

4. **You're Ready!**:
   - Auto-logged in as admin
   - Orchestrator selector dropdown in header
   - Manage servers, add more orchestrators, create users

### Adding More Orchestrators

1. Navigate to **Orchestrators** tab (admin only)
2. Click **Add Orchestrator**
3. Fill in:
   - Name (unique identifier)
   - Base URL (orchestrator API endpoint)
   - API Key (X-Api-Key header value)
   - Version (optional, for tracking)
   - Description (optional)
4. Submit - automatically linked to your admin account

### User Management

1. Navigate to **Users** tab (admin only)
2. View all users and their orchestrator access
3. To register new user:
   - Use `POST /api/auth/register` endpoint
4. To link user to orchestrator:
   - Use admin panel or API endpoint

### Switching Orchestrators

- Use dropdown in header: **Orchestrator: [Select]**
- Selection persists in localStorage
- Server list auto-refreshes when switched
- Each orchestrator has its own API key for secure communication

## 🎨 Warcraft Theme

The UI is inspired by Warcraft RTS games:
- **Fonts**: Cinzel (titles) + Inter (body)
- **Colors**: Gold (#ffd700), Bronze (#8b7355), Dark Blue (#0f0c29)
- **Textures**: Stone backgrounds, medieval borders
- **Effects**: Glowing text, shadows, hover animations
- **Status Colors**: 
  - Online: Green glow
  - Offline: Red glow
  - Pending: Yellow glow

## 🔧 Configuration

### Backend Environment (.env)
```env
SECRET_KEY="your-secret-key-here"
CORS_ORIGINS="*"
```

### Frontend Environment (.env)
```env
REACT_APP_BACKEND_URL=https://your-backend-url.com
```

### Database Location
- SQLite file: `/app/backend/peon.db`
- Auto-created on first run
- Contains all users, orchestrators, and cached data

## 🔄 Background Sync

The backend runs an async background task that:
- Runs every 5 minutes
- Fetches server list from each active orchestrator
- Updates cached_servers table
- Updates last_synced timestamp
- Handles orchestrator failures gracefully

This ensures:
- Fast server list loading (from cache)
- Reduced orchestrator API load
- Up-to-date server states

## 🛡️ Security

### Authentication Flow
1. User logs in → JWT token issued (24h expiry)
2. Token stored in localStorage
3. All API requests include `Authorization: Bearer <token>`
4. Backend validates token and extracts user info

### Orchestrator Communication
1. Each orchestrator has unique API key
2. API key stored encrypted in database
3. Requests proxied through backend with `X-Api-Key` header
4. Users never see orchestrator API keys

### Access Control
- Admin sees all orchestrators
- Users see only linked orchestrators
- Server actions proxied through access checks
- Role-based endpoint protection

## 📚 Orchestrator API Reference

The PEON orchestrators use Flask REST API:

### Get All Servers
```bash
GET /api/v1/servers
Headers: X-Api-Key: <your-api-key>
```

### Get Server Info
```bash
GET /api/v1/server/<action>/<server_uid>
Actions: info, stats, save
```

### Server Actions
```bash
PUT /api/v1/server/<action>/<server_uid>
Actions: create, start, stop, restart, update, description
```

### Delete Server
```bash
DELETE /api/v1/server/destroy/<server_uid>
```

### Plans (Game Templates)
```bash
GET /api/v1/plans
GET /api/v1/plan/<game_uid>
```

## 🎯 Next Steps

### Suggested Enhancements
1. **Server Creation UI**: Form to create new servers with game selection
2. **Real-time Updates**: WebSocket for live server status
3. **Server Logs**: View container logs from UI
4. **Backup Management**: Schedule and restore server backups
5. **User Profiles**: Custom settings and preferences
6. **Audit Logs**: Track all admin actions
7. **Email Notifications**: Alert on server events
8. **Multi-language**: i18n support
9. **Mobile App**: React Native version
10. **Discord Integration**: Link to peon-bot-discord

## 📝 Development

### Backend
```bash
cd /app/backend
# Install deps
pip install -r requirements.txt
# Run
uvicorn server:app --reload --port 8001
```

### Frontend
```bash
cd /app/frontend
# Install deps
yarn install
# Run
yarn start
```

### Database Reset
```bash
rm /app/backend/peon.db
# Restart backend to recreate
```

## 🐛 Troubleshooting

### Backend not starting
```bash
tail -f /var/log/supervisor/backend.err.log
```

### Frontend build errors
```bash
cd /app/frontend
yarn install
```

### Orchestrator connection failed
- Check orchestrator URL is accessible
- Verify API key is correct
- Check orchestrator logs for errors

### Sync not working
- Check backend logs for sync errors
- Verify orchestrator API is responding
- Check network connectivity

## 📄 License

This project uses components from the PEON project (FOSS).

## 🙏 Credits

- **PEON Project**: https://github.com/the-peon-project
- **Warcraft**: Inspiration for theme and aesthetics
- **Emergent**: Development platform

---

**Ready to command your warcamp!** 🏰⚔️
