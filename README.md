# Meccanico

Vehicle maintenance tracker: vehicles with a licence plate, maintenance activities,
maintenance types you define, and a QR code per vehicle that opens its service history.
Single-container FastAPI app with a SQLite database, JWT cookies and a JSON/SQLite
backup and restore. Interface in Italian.

- `main.py`: routes and pages (vehicles, activities, maintenance types, users, QR,
  backup).
- `database.py`: SQLAlchemy models (`User`, `Vehicle`, `Activity`, `MaintenanceType`,
  `QRSettings`).
- `auth.py`, `security.py`: JWT authentication, password hashing, first-run admin.
- `backup.py`: export and import of the whole database.
- `static/`: the pages served by FastAPI; `public/` and `functions/`: the same front
  end for Cloudflare Pages with D1.

## Run

```bash
pip install -r requirements.txt
uvicorn main:app --reload           # http://127.0.0.1:8000
# or
docker compose up -d
```

On first start the app creates the admin user from `ADMIN_USERNAME` and
`ADMIN_PASSWORD` (defaults: `admin` / `password123`); change the password from the Settings page.
`deploy-rhel9.sh`, `fly.toml` and `setup-cloudflare.sh` cover the three deployment
targets used so far: a RHEL 9 host, Fly.io and Cloudflare Pages.
