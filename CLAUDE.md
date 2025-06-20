# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a vehicle maintenance tracking application built with FastAPI, featuring user authentication, QR code generation for vehicle tracking, and database backup/restore functionality. The application serves static HTML pages with JavaScript frontends and provides REST API endpoints for vehicle and maintenance data management.

## Architecture

**Backend Stack:**
- FastAPI with Uvicorn server
- SQLAlchemy ORM with SQLite database
- JWT-based authentication with HTTP-only cookies
- Bcrypt password hashing
- Nginx reverse proxy (for Docker deployment)

**Database Models:**
- `User` - User authentication with login timestamps
- `Vehicle` - Vehicle records with UUID-based IDs and license plates
- `Activity` - Maintenance activities linked to vehicles
- `MaintenanceType` - Dynamic maintenance type definitions

**Key Components:**
- `main.py` - FastAPI application with all route handlers
- `database.py` - SQLAlchemy models and database configuration
- `auth.py` - JWT authentication, user management, and password handling
- `security.py` - Admin credentials management (legacy component)
- `backup.py` - Database backup/restore functionality with JSON and SQLite export

**Frontend Structure:**
- Static HTML pages in `/static/` directory
- JavaScript modules in `/static/js/` for dynamic functionality
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
docker run -p 8080:443 vehicle-maintenance-app
```

## Environment Configuration

Key environment variables:
- `DB_PATH` - SQLite database file path (default: `/home/data/service_records.db`)
- `SECRET_KEY` - JWT secret key for token signing
- `ADMIN_USERNAME` - Default admin username (default: `admin`)
- `ADMIN_PASSWORD` - Default admin password (default: `password123`)
- `HOST_URL` - Base URL for QR code generation

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
3. Password change functionality available to authenticated users
4. Admin user initialization on first startup

## QR Code Integration

- Each vehicle gets a UUID-based identifier
- QR codes generated dynamically linking to vehicle detail pages
- Base64-encoded PNG format for immediate display

## Static File Serving

- Static files mounted at `/static` route
- HTML pages served via FileResponse with authentication checks
- JavaScript modules handle frontend interactivity and API calls

## Running progect
- DB_PATH="./service_records.db" python main.py 