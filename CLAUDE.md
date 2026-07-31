# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a vehicle maintenance tracking application built with FastAPI, featuring user authentication, QR code generation for vehicle tracking, and database backup/restore functionality. The application serves static HTML pages with JavaScript frontends and provides REST API endpoints for vehicle and maintenance data management. The project supports multiple deployment platforms including Docker Compose, Fly.io, Cloudflare Pages, and RHEL 9 environments.

## Architecture

**Backend Stack:**
- FastAPI with Uvicorn server
- SQLAlchemy ORM with SQLite database
- JWT-based authentication with HTTP-only cookies
- Bcrypt password hashing
- Nginx reverse proxy (for Docker deployment)

**Database Models:**
- `User` - User authentication with login timestamps and active status
- `Vehicle` - Vehicle records with UUID-based IDs and license plates
- `Activity` - Maintenance activities linked to vehicles
- `MaintenanceType` - Dynamic maintenance type definitions
- `QRSettings` - Configurable QR code generation settings

**Key Components:**
- `main.py` - FastAPI application with all route handlers
- `database.py` - SQLAlchemy models and database configuration
- `auth.py` - JWT authentication, user management, and password handling
- `security.py` - Admin credentials management (legacy component)
- `backup.py` - Database backup/restore functionality with JSON and SQLite export

**Frontend Structure:**
- Dual frontend architecture:
  - `/static/` - Traditional FastAPI deployment (Docker, local)
  - `/public/` - Cloudflare Pages deployment
- JavaScript modules for dynamic functionality with environment-aware API routing
- Theme support and modular architecture
- Single-page application patterns with API consumption

## Development Commands

**Local Development:**
```bash
# Install dependencies
pip install -r requirements.txt

# Run development server
python main.py
# or using uvicorn directly
uvicorn main:app --host localhost --port 8000 --reload
```

**Docker Development:**
```bash
# Build Docker image
docker build -t vehicle-maintenance-app .

# Run locally (maps to port 8080)
docker run -p 8080:80 vehicle-maintenance-app

# Docker Compose (recommended for local development)
docker-compose up -d
```

**Multi-Platform Deployment:**
```bash
# Fly.io deployment (with remote build)
fly deploy

# Fly.io deployment (with local build - cost optimized)
./deploy-fly-local.sh

# Cloudflare Pages (serverless)
npm run deploy:cloudflare

# RHEL 9 Docker deployment
./deploy-rhel9.sh
```

## Environment Configuration

Key environment variables:
- `DB_PATH` - SQLite database file path (default: `/home/data/service_records.db`)
- `SECRET_KEY` - JWT secret key for token signing
- `ADMIN_USERNAME` - Default admin username (default: `admin`)
- `ADMIN_PASSWORD` - Default admin password (default: `password123`)
- `HOST_URL` - Base URL for QR code generation (configurable via QR settings API)

**Platform-Specific Configurations:**
- **Docker Compose**: Volume persistence via `meccanico-data` volume
- **Fly.io**: Volume mounting to `/home/data` with auto-stop/start machines
- **Cloudflare**: D1 database integration with serverless functions
- **RHEL 9**: Enterprise Linux optimized Docker configuration

## Database Management

**Database initialization:**
- Database tables are automatically created on application startup via `init_db()`
- Default admin user is created if it doesn't exist
- Database path is configurable via `DB_PATH` environment variable

**Backup/Restore:**
- Supports SQLite database file export/import
- JSON export/import for cross-platform compatibility
- Automatic backup creation before imports
- Accessible via `/backup` admin interface

## Authentication Flow

1. Cookie-based JWT authentication with HTTP-only cookies
2. Token expires after 24 hours (`ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24`)
3. Password change functionality available to authenticated users (`/change-password`)
4. Admin user initialization on first startup
5. User management with active/inactive status and deletion capabilities

## QR Code Integration

- Each vehicle gets a UUID-based identifier
- QR codes generated dynamically linking to vehicle detail pages
- Base64-encoded PNG format for immediate display
- Configurable base URL via QR settings API (`/api/qr-settings`)
- Admin can update host URL for different deployment environments

## Static File Serving

- Static files mounted at `/static` route
- HTML pages served via FileResponse with authentication checks
- JavaScript modules handle frontend interactivity and API calls

## Running project
- DB_PATH="./service_records.db" python main.py

## Cost-Optimized Deployment

**Local Build + Fly.io Deploy:**
- **Benefits**: No build costs on Fly.io, faster deployments, better resource utilization
- **Requirements**: Docker installed locally, flyctl authenticated
- **Usage**: `./deploy-fly-local.sh`

**Process:**
1. Build Docker image locally
2. Push to Fly.io registry
3. Deploy using pre-built image
4. **Cost Savings**: ~50-80% on build costs vs remote builds

## Deployment Configurations

**Available deployment files:**
- `docker-compose.yml` - Local Docker development with volume persistence
- `fly.toml` - Fly.io deployment configuration with volume mounting
- `deploy-fly-local.sh` - Cost-optimized Fly.io deployment with local Docker build
- `wrangler.toml` - Cloudflare Pages + D1 serverless deployment
- `Dockerfile.rhel9` - RHEL 9 enterprise Docker configuration
- `deploy-rhel9.sh` - RHEL 9 deployment automation script

**Security Updates:**
- Updated dependencies for security fixes (Pillow 11.3.0, Starlette 0.47.1, FastAPI 0.116.1)
- Fixes for CVE-2024-47874 and other security vulnerabilities
- Security headers middleware (HSTS, CSP, X-Frame-Options, etc.)
- Restricted CORS policy for production security
- API documentation disabled in production

**Security Features:**
- JWT authentication with HTTP-only cookies
- Bcrypt password hashing with automatic salt
- SQL injection protection via SQLAlchemy ORM
- Input validation with Pydantic
- Security headers for XSS/clickjacking protection
- HTTPS enforcement in production
- See `SECURITY.md` for complete security guide

## Key API Endpoints

**Authentication:**
- `POST /api/login` - User authentication   
- `POST /api/logout` - User logout
- `PUT /api/change-password` - Password change for authenticated users

**User Management:**
- `GET /api/users` - List all users (admin)
- `PUT /api/users/{user_id}/toggle-active` - Toggle user active status
- `DELETE /api/users/{user_id}` - Delete user

**QR Settings:**
- `GET /api/qr-settings` - Get current QR code settings
- `PUT /api/qr-settings` - Update QR code base URL

**Vehicles & Activities:**
- `GET /api/vehicles` - List vehicles
- `POST /api/vehicles` - Create vehicle
- `GET /api/activities` - List maintenance activities
- `POST /api/activities` - Create maintenance activity 