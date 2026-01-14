# =============================================================================
# PEON Dashboard - Multi-stage Docker Build
# =============================================================================
# BASE: Node.js for frontend build
FROM node:20-alpine AS frontend-builder

WORKDIR /build/frontend

# Copy package files for dependency caching
COPY frontend/package.json frontend/yarn.lock ./

# Install dependencies
RUN yarn install --frozen-lockfile

# Copy frontend source
COPY frontend/ ./

# Build production frontend
ARG REACT_APP_BACKEND_URL=""
ENV REACT_APP_BACKEND_URL=${REACT_APP_BACKEND_URL}
RUN yarn build

# =============================================================================
# RUNTIME: Python for backend + static frontend
FROM python:3.11-slim-bullseye

# CONTAINER: Configuration labels
LABEL "com.peon.description"="PEON Dashboard - Game Server Management"
LABEL "com.peon.type"="webapp"
LABEL "maintainer"="PEON Project"

# VERSION: Build arguments
ARG VERSION=dev
ENV VERSION=${VERSION}
ENV CONTAINER_TYPE="webapp"

# BRANDING: MOTD
RUN echo '╔═══════════════════════════════════════════════════════════╗' > /etc/motd && \
    echo '║                      PEON DASHBOARD                       ║' >> /etc/motd && \
    echo '║              Game Server Management System                ║' >> /etc/motd && \
    echo '╠═══════════════════════════════════════════════════════════╣' >> /etc/motd && \
    echo '║  Version: ${VERSION}                                      ║' >> /etc/motd && \
    echo '║  Backend: http://localhost:8001                           ║' >> /etc/motd && \
    echo '║  API Docs: http://localhost:8001/docs                     ║' >> /etc/motd && \
    echo '╚═══════════════════════════════════════════════════════════╝' >> /etc/motd && \
    echo "cat /etc/motd" >> /etc/bash.bashrc

# OS: Update and install required packages
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    procps \
    nginx \
    && rm -rf /var/lib/apt/lists/*

# PYTHON: Install Python dependencies
WORKDIR /app/backend
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# APPLICATION: Copy backend code
COPY backend/ ./

# FRONTEND: Copy built static files
COPY --from=frontend-builder /build/frontend/build /app/frontend/build

# NGINX: Configure for serving frontend + proxy to backend
RUN echo 'server { \n\
    listen 80; \n\
    server_name _; \n\
    \n\
    # Frontend static files \n\
    location / { \n\
        root /app/frontend/build; \n\
        index index.html; \n\
        try_files $uri $uri/ /index.html; \n\
    } \n\
    \n\
    # Backend API proxy \n\
    location /api { \n\
        proxy_pass http://127.0.0.1:8001; \n\
        proxy_http_version 1.1; \n\
        proxy_set_header Upgrade $http_upgrade; \n\
        proxy_set_header Connection "upgrade"; \n\
        proxy_set_header Host $host; \n\
        proxy_set_header X-Real-IP $remote_addr; \n\
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; \n\
        proxy_read_timeout 86400; \n\
    } \n\
    \n\
    # Game logos static files \n\
    location /game-logos { \n\
        root /app/frontend/build; \n\
        try_files $uri =404; \n\
    } \n\
}' > /etc/nginx/sites-available/default

# DATA: Create data directory for SQLite database
RUN mkdir -p /data
ENV DATABASE_PATH=/data/peon.db

# LOGGING: Configure logging to stdout
ENV PYTHONUNBUFFERED=1
ENV LOG_LEVEL=INFO

# WORKDIR: Set working directory
WORKDIR /app

# INIT: Create startup script
RUN echo '#!/bin/bash \n\
echo "Starting PEON Dashboard v${VERSION}..." \n\
cat /etc/motd \n\
\n\
# Start backend \n\
cd /app/backend \n\
python -m uvicorn server:app --host 0.0.0.0 --port 8001 --log-level info & \n\
BACKEND_PID=$! \n\
\n\
# Wait for backend to start \n\
sleep 3 \n\
\n\
# Start nginx \n\
nginx -g "daemon off;" & \n\
NGINX_PID=$! \n\
\n\
echo "PEON Dashboard started successfully!" \n\
echo "  - Frontend: http://localhost:80" \n\
echo "  - Backend API: http://localhost:8001" \n\
echo "  - API Docs: http://localhost:8001/docs" \n\
\n\
# Wait for any process to exit \n\
wait -n \n\
\n\
# Exit with status of process that exited first \n\
exit $?' > /init.sh && chmod +x /init.sh

# HEALTHCHECK
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8001/api/system/status || exit 1

# EXPOSE: Ports
EXPOSE 80 8001

# VOLUME: Persistent data
VOLUME ["/data"]

# CMD: Start the application
CMD ["/bin/bash", "/init.sh"]
