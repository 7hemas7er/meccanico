# main.py
from fastapi import FastAPI, HTTPException, Depends, Request, Body, status,  Security, Response,File, UploadFile, BackgroundTasks
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.responses import FileResponse, RedirectResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timedelta
import os
from backup import DatabaseBackup
import uuid
import qrcode
from io import BytesIO
import base64
from datetime import datetime
from database import get_db, Vehicle, Activity, MaintenanceType, User, QRSettings, init_db
from pydantic import BaseModel, ConfigDict
from auth import update_user_password

from security import (
    verify_admin,
    AdminCredentials,
    get_password_hash,
    verify_password,
    init_admin_credentials
)

# Import auth module
from auth import (
    Token, UserCreate, UserResponse, UserUpdate,
    get_current_active_user, get_current_admin_user, create_access_token,
    get_user, create_user, update_user_password,
    update_login_timestamp, verify_password, init_admin_user,
    ACCESS_TOKEN_EXPIRE_MINUTES  # Add this import
)


# Models


class PasswordChange(BaseModel):
    old_password: str
    new_password: str
    
class MaintenanceTypeCreate(BaseModel):
    type_name: str

class QRSettingsUpdate(BaseModel):
    host_url: str

class QRSettingsResponse(BaseModel):
    host_url: str


class ServiceActivity(BaseModel):
    activity: str
    kilometers: int
    date: datetime

    model_config = ConfigDict(from_attributes=True)


class VehicleService(BaseModel):
    license_plate: str
    activities: List[ServiceActivity] = []

    model_config = ConfigDict(from_attributes=True)


class VehicleResponse(BaseModel):
    id: str
    license_plate: str
    activities: List[ServiceActivity]
    last_update: datetime

    model_config = ConfigDict(from_attributes=True)


app = FastAPI(
    title="Vehicle Maintenance API",
    description="Secure vehicle maintenance tracking system",
    version="1.0.0",
    docs_url=None,  # Disable in production
    redoc_url=None  # Disable in production
)

# Security headers middleware
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    
    # Security headers
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    
    # HTTPS enforcement in production
    if request.url.scheme == "https":
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    
    # Content Security Policy
    csp = (
        "default-src 'self'; "
        "script-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com https://cdn.jsdelivr.net; "
        "style-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com https://cdn.jsdelivr.net; "
        "img-src 'self' data:; "
        "font-src 'self'; "
        "connect-src 'self'; "
        "frame-ancestors 'none'"
    )
    response.headers["Content-Security-Policy"] = csp
    
    return response

# Enable CORS with security restrictions
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://manutenzioni.giovanardiivo.it",
        "https://meccanico.fly.dev",
        "http://localhost:8000",  # Development only
        "http://127.0.0.1:8000"  # Development only
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept"],
)

# Basic configuration
HOST_URL = os.getenv("HOST_URL", "http://localhost:8000")

# Static files configuration
STATIC_DIR = os.path.join(os.path.dirname(
    os.path.realpath(__file__)), "static")
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

# QR code generation function


def generate_qr_code(vehicle_id: str, db: Session = None) -> str:
    # Get host URL from database settings or fallback to environment/default
    host_url = HOST_URL
    if db:
        qr_settings = db.query(QRSettings).first()
        if qr_settings:
            host_url = qr_settings.host_url
    
    qr = qrcode.QRCode(version=1, box_size=10, border=5)
    qr.add_data(f"{host_url}/vehicle/{vehicle_id}")
    qr.make(fit=True)

    img_buffer = BytesIO()
    qr.make_image().save(img_buffer, format="PNG")
    return f"data:image/png;base64,{base64.b64encode(img_buffer.getvalue()).decode()}"

# Auth endpoints


# Token endpoint in main.py - replace this in your main.py file
@app.post("/token", response_model=Token)
async def login_for_access_token(
    response: Response,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    user = get_user(db, form_data.username)
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Update last login timestamp
    update_login_timestamp(db, user.username)

    # Create access token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username},
        expires_delta=access_token_expires
    )

    # Set the token as an HTTP-only cookie
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        expires=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        samesite="lax",
        secure=False  # Set to True if using HTTPS
    )

    return {"access_token": access_token, "token_type": "bearer"}

@app.put("/api/change-password")
async def change_password(
    password_data: PasswordChange,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    # Verifica la password attuale
    if not verify_password(password_data.old_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Password attuale non valida"
        )

    # Valida la nuova password
    if len(password_data.new_password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La nuova password deve essere di almeno 8 caratteri"
        )

    # Aggiorna la password
    success = update_user_password(
        db, current_user.username, password_data.new_password)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Errore durante l'aggiornamento della password"
        )

    return {"message": "Password aggiornata con successo"}

# Aggiungi questa rotta per la pagina HTML


@app.get("/change-password")
async def change_password_page(current_user: User = Depends(get_current_active_user)):
    password_path = os.path.join(STATIC_DIR, "change-password.html")
    if not os.path.exists(password_path):
        raise HTTPException(
            status_code=404, detail="change-password.html not found")
    return FileResponse(password_path)

# Main routes


@app.get("/")
async def read_root():
    return RedirectResponse(url="/login")


@app.get("/login")
async def login_page():
    login_path = os.path.join(STATIC_DIR, "login.html")
    if not os.path.exists(login_path):
        raise HTTPException(status_code=404, detail="login.html not found")
    return FileResponse(login_path)


@app.get("/settings")
async def settings_page(current_user: User = Depends(get_current_admin_user)):
    settings_path = os.path.join(STATIC_DIR, "settings.html")
    if not os.path.exists(settings_path):
        raise HTTPException(status_code=404, detail="settings.html not found")
    return FileResponse(settings_path)


@app.get("/admin")
async def admin_page(current_user: User = Depends(get_current_active_user)):
    admin_path = os.path.join(STATIC_DIR, "admin.html")
    if not os.path.exists(admin_path):
        raise HTTPException(status_code=404, detail="admin.html not found")
    return FileResponse(admin_path)


@app.get("/maintenance")
async def maintenance_page(current_user: User = Depends(get_current_active_user)):
    maintenance_path = os.path.join(STATIC_DIR, "maintenance.html")
    if not os.path.exists(maintenance_path):
        raise HTTPException(
            status_code=404, detail="maintenance.html not found")
    return FileResponse(maintenance_path)

@app.get("/users")
async def users_page(current_user: User = Depends(get_current_admin_user)):
    users_path = os.path.join(STATIC_DIR, "users.html")
    if not os.path.exists(users_path):
        raise HTTPException(status_code=404, detail="users.html not found")
    return FileResponse(users_path)


@app.get("/vehicle/{vehicle_id}")
async def get_vehicle_page(vehicle_id: str):
    return FileResponse("static/vehicle.html")

# API endpoints


@app.get("/api/maintenance-types")
async def get_maintenance_types(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    types = db.query(MaintenanceType).all()
    return [t.name for t in types]


@app.post("/api/maintenance-types")
async def add_maintenance_type(
    type_name: str = Body(...),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    existing = db.query(MaintenanceType).filter(
        MaintenanceType.name == type_name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Tipo già esistente")

    new_type = MaintenanceType(name=type_name)
    db.add(new_type)
    db.commit()
    return {"status": "success"}


@app.put("/api/maintenance-types/{old_type}")
async def update_maintenance_type(
    old_type: str,
    new_type: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    maintenance_type = db.query(MaintenanceType).filter(
        MaintenanceType.name == old_type).first()
    if not maintenance_type:
        raise HTTPException(status_code=404, detail="Tipo non trovato")

    existing = db.query(MaintenanceType).filter(
        MaintenanceType.name == new_type).first()
    if existing:
        raise HTTPException(status_code=400, detail="Nuovo tipo già esistente")

    maintenance_type.name = new_type
    db.commit()
    return {"status": "success"}


@app.delete("/api/maintenance-types/{type_name}")
async def delete_maintenance_type(
    type_name: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    maintenance_type = db.query(MaintenanceType).filter(
        MaintenanceType.name == type_name).first()
    if not maintenance_type:
        raise HTTPException(status_code=404, detail="Tipo non trovato")

    db.delete(maintenance_type)
    db.commit()
    return {"status": "success"}


@app.get("/api/vehicle/{vehicle_id}")
async def get_vehicle(vehicle_id: str, db: Session = Depends(get_db)):
    vehicle = db.query(Vehicle).filter(Vehicle.id == vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Veicolo non trovato")

    return VehicleResponse.model_validate(vehicle)


@app.post("/api/vehicle/")
async def create_vehicle(
    vehicle: VehicleService,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    vehicle_id = str(uuid.uuid4())
    qr_code = generate_qr_code(vehicle_id, db)

    new_vehicle = Vehicle(
        id=vehicle_id,
        license_plate=vehicle.license_plate
    )
    db.add(new_vehicle)
    db.commit()

    return {
        "vehicle_id": vehicle_id,
        "qr_code": qr_code
    }


@app.post("/api/vehicle/{vehicle_id}/activity")
async def add_activity(
    vehicle_id: str,
    activity: ServiceActivity,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    vehicle = db.query(Vehicle).filter(Vehicle.id == vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Veicolo non trovato")

    # Verifica se esiste già il tipo di manutenzione, altrimenti lo crea
    existing_type = db.query(MaintenanceType).filter(
        MaintenanceType.name == activity.activity).first()

    if not existing_type and activity.activity != "altro":
        # Se non esiste e non è "altro" (che è il valore del dropdown, non un'attività reale)
        # Crea un nuovo tipo di manutenzione
        new_type = MaintenanceType(name=activity.activity)
        db.add(new_type)

    new_activity = Activity(
        vehicle_id=vehicle_id,
        activity=activity.activity,
        kilometers=activity.kilometers,
        date=activity.date
    )
    db.add(new_activity)
    db.commit()

    return {"status": "success"}


@app.get("/api/vehicles/")
async def list_vehicles(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    vehicles = db.query(Vehicle).all()
    return [VehicleResponse.model_validate(v) for v in vehicles]


@app.delete("/api/vehicle/{vehicle_id}/activity/{activity_id}")
async def delete_activity(
    vehicle_id: str,
    activity_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    activity = db.query(Activity).filter(
        Activity.id == activity_id,
        Activity.vehicle_id == vehicle_id
    ).first()

    if not activity:
        raise HTTPException(status_code=404, detail="Attività non trovata")

    db.delete(activity)
    db.commit()
    return {"status": "success"}


@app.put("/api/vehicle/{vehicle_id}/activity/{activity_id}")
async def update_activity(
    vehicle_id: str,
    activity_id: int,
    activity_update: ServiceActivity,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    activity = db.query(Activity).filter(
        Activity.id == activity_id,
        Activity.vehicle_id == vehicle_id
    ).first()

    if not activity:
        raise HTTPException(status_code=404, detail="Attività non trovata")

    activity.activity = activity_update.activity
    activity.kilometers = activity_update.kilometers
    activity.date = activity_update.date

    db.commit()
    return {"status": "success"}


@app.get("/api/vehicle/{vehicle_id}/qr")
async def regenerate_qr(
    vehicle_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    vehicle = db.query(Vehicle).filter(Vehicle.id == vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Veicolo non trovato")

    qr_code = generate_qr_code(vehicle_id, db)
    return {"qr_code": qr_code}

# Get current user info endpoint


@app.get("/api/user", response_model=UserResponse)
async def read_users_me(current_user: User = Depends(get_current_active_user)):
    return current_user

@app.get("/api/user/role")
async def get_user_role(current_user: User = Depends(get_current_active_user)):
    return {"role": current_user.role, "is_admin": current_user.role == "admin"}

# User management endpoints (admin only)
@app.get("/api/users", response_model=List[UserResponse])
async def get_all_users(response: Response, db: Session = Depends(get_db), current_user: User = Depends(get_current_admin_user)):
    # Headers anti-cache per evitare problemi con utenti eliminati
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    
    users = db.query(User).all()
    return users

@app.post("/api/users", response_model=UserResponse)
async def create_new_user(user: UserCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_admin_user)):
    db_user = get_user(db, username=user.username)
    if db_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    return create_user(db=db, user=user)

@app.delete("/api/users/{user_id}")
async def delete_user(user_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_admin_user)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.role == "admin":
        raise HTTPException(status_code=400, detail="Cannot delete admin user")
    db.delete(user)
    db.commit()
    return {"status": "success"}

@app.put("/api/users/{user_id}/toggle-active")
async def toggle_user_active(user_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_admin_user)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.role == "admin":
        raise HTTPException(status_code=400, detail="Cannot modify admin user")
    user.is_active = not user.is_active
    db.commit()
    return {"status": "success", "is_active": user.is_active}


@app.on_event("startup")
async def startup_event():
    init_db()
    init_admin_credentials()  # Initialize admin credentials

    # Create default admin user if not exists
    db = next(get_db())
    init_admin_user(db)


@app.post("/logout")
async def logout():
    response = JSONResponse({"status": "success"})
    response.delete_cookie(key="access_token")
    return response

# QR Settings endpoints
@app.get("/api/qr-settings", response_model=QRSettingsResponse)
async def get_qr_settings(
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Get current QR code settings"""
    qr_settings = db.query(QRSettings).first()
    if not qr_settings:
        # Create default settings if none exist
        qr_settings = QRSettings(host_url=HOST_URL)
        db.add(qr_settings)
        db.commit()
        db.refresh(qr_settings)
    
    return QRSettingsResponse(host_url=qr_settings.host_url)

@app.put("/api/qr-settings")
async def update_qr_settings(
    settings: QRSettingsUpdate,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Update QR code settings"""
    qr_settings = db.query(QRSettings).first()
    if not qr_settings:
        # Create new settings if none exist
        qr_settings = QRSettings(host_url=settings.host_url)
        db.add(qr_settings)
    else:
        # Update existing settings
        qr_settings.host_url = settings.host_url
    
    db.commit()
    return {"message": "QR settings updated successfully"}


@app.get("/api/database/export")
async def export_database(
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_active_user)
):
    """Export database as a downloadable file"""
    try:
        # Create an instance of DatabaseBackup
        db_backup = DatabaseBackup(
            os.getenv('DB_PATH', '/home/data/service_records.db'))

        # Export the database
        export_path = await db_backup.export_database()

        # Schedule file cleanup after download
        def cleanup(path: str):
            try:
                if os.path.exists(path):
                    os.unlink(path)
                if os.path.exists(os.path.dirname(path)) and not os.listdir(os.path.dirname(path)):
                    os.rmdir(os.path.dirname(path))
            except Exception as e:
                print(f"Error cleaning up: {e}")

        background_tasks.add_task(cleanup, export_path)

        # Return the file for download
        return FileResponse(
            path=export_path,
            filename=os.path.basename(export_path),
            media_type="application/octet-stream"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Database export failed: {str(e)}"
        )


@app.get("/api/database/export-json")
async def export_database_json(
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_active_user)
):
    """Export database as JSON file"""
    try:
        # Create an instance of DatabaseBackup
        db_backup = DatabaseBackup(
            os.getenv('DB_PATH', '/home/data/service_records.db'))

        # Export the database as JSON
        export_path = await db_backup.export_as_json()

        # Schedule file cleanup after download
        def cleanup(path: str):
            try:
                if os.path.exists(path):
                    os.unlink(path)
                if os.path.exists(os.path.dirname(path)) and not os.listdir(os.path.dirname(path)):
                    os.rmdir(os.path.dirname(path))
            except Exception as e:
                print(f"Error cleaning up: {e}")

        background_tasks.add_task(cleanup, export_path)

        # Return the file for download
        return FileResponse(
            path=export_path,
            filename=os.path.basename(export_path),
            media_type="application/json"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"JSON export failed: {str(e)}"
        )


@app.post("/api/database/import")
async def import_database(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_active_user)
):
    """Import database from a file"""
    try:
        # Create an instance of DatabaseBackup
        db_backup = DatabaseBackup(
            os.getenv('DB_PATH', '/home/data/service_records.db'))

        # Check file extension
        if file.filename.endswith('.json'):
            # Import as JSON
            result = await db_backup.import_json(file)
        elif file.filename.endswith('.db') or file.filename.endswith('.sqlite'):
            # Import as SQLite database
            result = await db_backup.import_database(file)
        else:
            raise HTTPException(
                status_code=400,
                detail="Unsupported file format. Please upload a .db, .sqlite, or .json file."
            )

        if result:
            return {"message": "Database successfully imported"}
        else:
            raise HTTPException(
                status_code=500,
                detail="Database import failed"
            )
    except ValueError as e:
        raise HTTPException(
            status_code=400,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Database import failed: {str(e)}"
        )

# Add this route to serve the backup.html page


@app.get("/backup")
async def backup_page(current_user: User = Depends(get_current_admin_user)):
    """Serve the backup management page"""
    backup_path = os.path.join(STATIC_DIR, "backup.html")
    if not os.path.exists(backup_path):
        raise HTTPException(status_code=404, detail="backup.html not found")
    return FileResponse(backup_path)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="localhost", port=8000)
