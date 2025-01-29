# main.py
from fastapi import FastAPI, HTTPException, Depends, Request, Body
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
import os
from pydantic import BaseModel, ConfigDict
import qrcode
import uuid
import secrets
from io import BytesIO
import base64

from database import get_db, Vehicle, Activity, MaintenanceType, init_db


class MaintenanceTypeCreate(BaseModel):
    type_name: str


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


app = FastAPI()

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Basic configuration
security = HTTPBasic()
ADMIN_USERNAME = "admin"
ADMIN_PASSWORD = "password123"
HOST_URL = "http://localhost:8000"

# Static files configuration
STATIC_DIR = os.path.join(os.path.dirname(
    os.path.realpath(__file__)), "static")
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


def verify_admin(credentials: HTTPBasicCredentials = Depends(security)):
    is_username_correct = secrets.compare_digest(
        credentials.username.encode("utf8"), ADMIN_USERNAME.encode("utf8"))
    is_password_correct = secrets.compare_digest(
        credentials.password.encode("utf8"), ADMIN_PASSWORD.encode("utf8"))

    if not (is_username_correct and is_password_correct):
        raise HTTPException(
            status_code=401,
            detail="Credenziali non valide",
            headers={"WWW-Authenticate": "Basic"},
        )
    return credentials.username


def generate_qr_code(vehicle_id: str) -> str:
    qr = qrcode.QRCode(version=1, box_size=10, border=5)
    qr.add_data(f"{HOST_URL}/vehicle/{vehicle_id}")
    qr.make(fit=True)

    img_buffer = BytesIO()
    qr.make_image().save(img_buffer, format="PNG")
    return f"data:image/png;base64,{base64.b64encode(img_buffer.getvalue()).decode()}"


@app.get("/")
async def read_root(admin: str = Depends(verify_admin)):
    index_path = os.path.join(STATIC_DIR, "admin.html")
    if not os.path.exists(index_path):
        raise HTTPException(status_code=404, detail="admin.html not found")
    return FileResponse(index_path)


@app.get("/maintenance")
async def read_maintenance(admin: str = Depends(verify_admin)):
    maintenance_path = os.path.join(STATIC_DIR, "maintenance.html")
    if not os.path.exists(maintenance_path):
        raise HTTPException(
            status_code=404, detail="maintenance.html not found")
    return FileResponse(maintenance_path)


@app.get("/vehicle/{vehicle_id}")
async def get_vehicle_page(vehicle_id: str):
    return FileResponse("static/vehicle.html")


@app.get("/api/maintenance-types")
async def get_maintenance_types(db: Session = Depends(get_db)):
    types = db.query(MaintenanceType).all()
    return [t.name for t in types]


@app.post("/api/maintenance-types")
async def add_maintenance_type(type_name: str = Body(...), admin: str = Depends(verify_admin), db: Session = Depends(get_db)):
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
    admin: str = Depends(verify_admin),
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
    admin: str = Depends(verify_admin),
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
    admin: str = Depends(verify_admin),
    db: Session = Depends(get_db)
):
    vehicle_id = str(uuid.uuid4())
    qr_code = generate_qr_code(vehicle_id)

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
    admin: str = Depends(verify_admin),
    db: Session = Depends(get_db)
):
    vehicle = db.query(Vehicle).filter(Vehicle.id == vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Veicolo non trovato")

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
    admin: str = Depends(verify_admin),
    db: Session = Depends(get_db)
):
    vehicles = db.query(Vehicle).all()
    return [VehicleResponse.model_validate(v) for v in vehicles]


@app.delete("/api/vehicle/{vehicle_id}/activity/{activity_id}")
async def delete_activity(
    vehicle_id: str,
    activity_id: int,
    admin: str = Depends(verify_admin),
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
    admin: str = Depends(verify_admin),
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


@app.on_event("startup")
async def startup_event():
    init_db()

@app.post("/api/maintenance-types")
async def add_maintenance_type(
    type_data: MaintenanceTypeCreate,
    admin: str = Depends(verify_admin),
    db: Session = Depends(get_db)
):
    existing = db.query(MaintenanceType).filter(
        MaintenanceType.name == type_data.type_name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Tipo già esistente")

    new_type = MaintenanceType(name=type_data.type_name)
    db.add(new_type)
    db.commit()
    return {"status": "success"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="localhost", port=8000)
