# PEON Dashboard - Product Requirements Document

## Overview
A web application to manage game servers based on the PEON ecosystem (peon-orchestrator, peon-warplans).

## Technology Stack
- **Frontend**: React 18, Lucide icons, modern CSS animations
- **Backend**: FastAPI (Python), SQLite database
- **Real-time**: WebSocket for live chat
- **Auth**: JWT with RBAC (admin, moderator, user)

## Core Features

### ✅ Phase 1: Code Architecture (COMPLETED)
- Backend refactored into modular structure:
  - `/backend/core/` - config, database, security, websocket
  - `/backend/routes/` - auth, admin, system, orchestrators, proxy, sessions, chat, console, backup, notifications
  - `/backend/models/` - Pydantic models
  - `/backend/services/` - audit, features, user, orchestrator
- Frontend refactored:
  - `/frontend/src/components/common/` - Icons, Loading, Alert, Button, Modal
  - `/frontend/src/components/server/` - ServerCard, ServerInfoModal, ServerUpdateModal, ServerHealthStats, ServerConsoleModal
  - `/frontend/src/components/chat/` - ChatMessage, ChatInput, EmojiPicker
  - `/frontend/src/components/admin/` - AuditLogPanel, FeatureTogglesPanel, BackupRestorePanel, NotificationsPanel
  - `/frontend/src/utils/` - api, jsonParser, markdown, logos
- Logging configured to stdout for container compatibility

### ✅ Phase 2: UI/Visual Overhaul (COMPLETED)
- Game logos moved to right side of server cards, height-limited
- All logos use object-fit: contain (shrink to fit)
- Emoji characters replaced with Lucide icons throughout
- Smooth CSS animations (fade-in, slide-in, modal-in, pulse, spin)
- Heading changed from "PEON Warcamp" to "PEON"
- "Health" changed to "Usage" on dashboard
- Loading animations for orchestrator stats (SkeletonStats)
- Loading animation when fetching deploy plans

### ✅ Phase 3: Server Management Enhancements (COMPLETED)
- "Get Info" modal parses JSON into modern nested list with bullet points
- Collapsible sections with expand/collapse icons
- Update button shows modal with options (Full Update, Quick Update, Validate)
- Logo support for any web image format (png, jpg, webp, svg, gif)
- Click active server on homepage navigates to filtered servers view

### ✅ Phase 4: Chat & Community Features (COMPLETED)
- Markdown rendering in chat (react-markdown)
- Emoji picker with shortcuts (:), :D, :fire:, etc.)
- Admin can clear all chat messages
- Admin can remove specific user's chat history
- Admin can ban/unban users from chat

### ✅ Phase 5: User & Access Management (COMPLETED)
- Password change functionality for users
- Admin can reset any user's password
- Default credentials removed from login form
- Admin can link/unlink users to orchestrators
- Admin can link/unlink users to specific servers
- Delete/cancel gaming sessions
- Admin Feature Toggles panel:
  - Online Users card toggle
  - Chat feature toggle
  - Gaming Sessions toggle
  - Server Stats toggle
- Admin Audit Log with categories:
  - User actions
  - Server actions
  - Chat moderation
  - Session management
  - Auth events
  - System events

### ✅ Phase 6: DevOps & Documentation (COMPLETED)
- Dockerfile created with multi-stage build
- README.md with docker-compose instructions
- Container follows peon-orc patterns (VERSION, MOTD, labels)
- All logs output to stdout

### ✅ Phase 7: Advanced Features (COMPLETED - January 14, 2026)
- **Bug Fixes:**
  - Fixed orchestrator notification showing when no orchestrators configured
  - Fixed duplicate "No orchestrators configured" message on servers page
  - Fixed community chat toggle not hiding chat when disabled
  
- **Real-time Server Console:**
  - WebSocket-based console log streaming
  - HTTP fallback for log fetching
  - Color-coded log lines (error, warning, info)
  - Pause/resume auto-scroll
  - Download logs functionality
  - Clear logs button
  - Console button added to running server cards

- **Backup & Restore:**
  - Create backups of all configuration
  - Download backup files
  - Upload backup files
  - Selective restore (orchestrators, settings, sessions)
  - Backup includes: users (without passwords), orchestrators, system config, gaming sessions, access controls
  - Audit log integration

- **External Notifications:**
  - Discord webhook integration
  - Email SMTP integration
  - Configurable event types (server start/stop, new session)
  - Test notification buttons
  - Status indicators for each channel

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login with username/password
- `GET /api/auth/me` - Get current user info
- `POST /api/auth/refresh` - Refresh JWT token
- `GET /api/auth/permissions` - Get role permissions
- `POST /api/auth/change-password` - Change own password

### System
- `GET /api/system/status` - Check initialization status
- `POST /api/system/wizard` - Complete first-run setup
- `GET /api/system/features` - Get feature flags

### Admin
- `GET /api/admin/users` - List all users
- `POST /api/admin/users` - Create user
- `PUT /api/admin/users/{id}` - Update user
- `DELETE /api/admin/users/{id}` - Delete user
- `POST /api/admin/users/{id}/reset-password` - Reset password
- `POST /api/admin/users/{id}/ban-chat` - Ban from chat
- `POST /api/admin/users/{id}/unban-chat` - Unban from chat
- `DELETE /api/admin/users/{id}/chat-history` - Delete user's chat
- `POST /api/admin/link-user-orchestrator` - Link user to orchestrator
- `DELETE /api/admin/link-user-orchestrator` - Unlink user from orchestrator
- `POST /api/admin/link-user-server` - Link user to server
- `DELETE /api/admin/link-user-server` - Unlink user from server
- `GET /api/admin/features` - Get feature flags
- `PUT /api/admin/features` - Update feature flags
- `GET /api/admin/audit-log` - Get audit logs

### Orchestrators
- `GET /api/orchestrators` - List orchestrators
- `POST /api/orchestrators` - Create orchestrator
- `PUT /api/orchestrators/{id}` - Update orchestrator
- `DELETE /api/orchestrators/{id}` - Delete orchestrator
- `POST /api/orchestrators/test` - Test connection

### Proxy (Server Actions)
- `GET /api/proxy/plans` - Get available game plans
- `GET /api/proxy/{orch_id}/servers` - List servers
- `GET /api/proxy/{orch_id}/server/info/{uid}` - Get server info
- `GET /api/proxy/{orch_id}/server/stats/{uid}` - Get server stats
- `POST /api/proxy/{orch_id}/deploy` - Deploy new server
- `PUT /api/proxy/{orch_id}/server/{action}/{uid}` - Server action (start/stop/restart/update)

### Console
- `GET /api/console/{orch_id}/{server_uid}/logs` - Get server logs
- `WS /api/console/ws/{orch_id}/{server_uid}` - WebSocket for real-time logs

### Backup
- `GET /api/backup/list` - List all backups
- `POST /api/backup/create` - Create new backup
- `GET /api/backup/download/{filename}` - Download backup file
- `DELETE /api/backup/{filename}` - Delete backup
- `POST /api/backup/restore/{filename}` - Restore from backup
- `POST /api/backup/upload` - Upload backup file

### Notifications
- `GET /api/notifications/status` - Get notification channels status
- `GET /api/notifications/discord/config` - Get Discord config
- `PUT /api/notifications/discord/config` - Update Discord config
- `GET /api/notifications/email/config` - Get Email config
- `PUT /api/notifications/email/config` - Update Email config
- `POST /api/notifications/test` - Send test notification
- `POST /api/notifications/send` - Send notification

### Sessions
- `GET /api/sessions` - List gaming sessions
- `POST /api/sessions` - Create session
- `PUT /api/sessions/{id}` - Update session
- `DELETE /api/sessions/{id}` - Delete session
- `POST /api/sessions/{id}/rsvp` - RSVP to session
- `DELETE /api/sessions/{id}/rsvp` - Cancel RSVP

### Chat
- `GET /api/chat/messages` - Get chat messages
- `POST /api/chat/messages` - Send message
- `DELETE /api/chat/messages/{id}` - Delete message
- `DELETE /api/chat/clear` - Clear all chat
- `GET /api/chat/online` - Get online users
- `WS /api/ws/chat` - WebSocket for real-time chat

## Database Schema

### Tables
- `users` - User accounts with roles
- `orchestrators` - Orchestrator instances
- `user_orchestrator_access` - User-to-orchestrator links
- `server_links` - User-to-server links
- `cached_servers` - Server cache
- `system_config` - System configuration (includes feature flags, notification configs)
- `gaming_sessions` - Scheduled sessions
- `session_rsvps` - Session RSVPs
- `chat_messages` - Chat messages
- `audit_log` - Audit trail
- `online_users` - Active users tracking

### ✅ Phase 8: Code Cleanup & Standards (COMPLETED - January 14, 2026)
- **Regression Testing**: Full test suite passed (18/18 backend tests, 100% frontend)
- **Lint Fixes**:
  - Fixed Python bare except clauses in routes/console.py and routes/proxy.py
  - Fixed React useEffect dependencies in AuditLogPanel.js and ServerInfoModal.js
  - Fixed React unstable nested components in ChatMessage.js (moved markdown components outside render)
  - Fixed App.js setState in useEffect warning
- **Container Standards**:
  - Added `.dockerignore` for optimized Docker builds
  - Updated `README.md` with comprehensive documentation
  - Project structure follows peon-orc patterns
  - All application code in `/app/backend` and `/app/frontend`
  - Dockerfile multi-stage build working correctly

## Completed - January 14, 2026
All requested features have been implemented:
- 24 original feature requests
- 3 bug fixes (orchestrator notification, duplicate message, chat toggle)
- 3 advanced features (console, backup, notifications)
