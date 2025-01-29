# main.py
from fastapi import FastAPI, HTTPException, Depends
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware

import os
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
import qrcode
import uuid
import secrets
from io import BytesIO
import base64

# Database per i tipi di manutenzione
maintenance_types_db = [
    "Cambio Olio",
    "Cambio Filtri",
    "Cambio Pastiglie Freni",
    "Cambio Cinghia",
    "Revisione"
]

app = FastAPI()

# Abilita CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configurazione base
security = HTTPBasic()
ADMIN_USERNAME = "admin"
ADMIN_PASSWORD = "password123"
HOST_URL = "http://localhost:8000"  # Cambia con il tuo hostname effettivo

# Assicurati che il percorso statico sia corretto
STATIC_DIR = os.path.join(os.path.dirname(
    os.path.realpath(__file__)), "static")
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

class ServiceActivity(BaseModel):
    activity: str
    kilometers: int
    date: datetime


class VehicleService(BaseModel):
    license_plate: str
    activities: List[ServiceActivity] = []


class VehicleResponse(BaseModel):
    id: str
    license_plate: str
    activities: List[ServiceActivity]
    last_update: datetime


# Database simulato
vehicles_db = {}


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


@app.get("/debug/paths")
async def debug_paths():
    return {
        "static_dir": STATIC_DIR,
        "static_exists": os.path.exists(STATIC_DIR),
        "js_dir_exists": os.path.exists(os.path.join(STATIC_DIR, "js")),
        "admin_js_exists": os.path.exists(os.path.join(STATIC_DIR, "js", "admin.js")),
        "files_in_static": os.listdir(STATIC_DIR) if os.path.exists(STATIC_DIR) else [],
        "files_in_js": os.listdir(os.path.join(STATIC_DIR, "js")) if os.path.exists(os.path.join(STATIC_DIR, "js")) else []
    }


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
   
   
@app.delete("/api/vehicle/{vehicle_id}/activity/{activity_index}")
async def delete_activity(
    vehicle_id: str,
    activity_index: int,
    admin: str = Depends(verify_admin)
):
    if vehicle_id not in vehicles_db:
        raise HTTPException(status_code=404, detail="Veicolo non trovato")

    vehicle = vehicles_db[vehicle_id]

    try:
        vehicle["activities"].pop(activity_index)
        vehicle["last_update"] = datetime.now()
    except IndexError:
        raise HTTPException(status_code=404, detail="Attività non trovata")

    return {"status": "success"}


@app.put("/api/vehicle/{vehicle_id}/activity/{activity_index}")
async def update_activity(
    vehicle_id: str,
    activity_index: int,
    activity: ServiceActivity,
    admin: str = Depends(verify_admin)
):
    if vehicle_id not in vehicles_db:
        raise HTTPException(status_code=404, detail="Veicolo non trovato")

    vehicle = vehicles_db[vehicle_id]

    try:
        vehicle["activities"][activity_index] = activity.dict()
        vehicle["last_update"] = datetime.now()
    except IndexError:
        raise HTTPException(status_code=404, detail="Attività non trovata")

    return {"status": "success"}

@app.get("/vehicle/{vehicle_id}")
async def get_vehicle_page(vehicle_id: str):
    return FileResponse("static/vehicle.html")


# Endpoint per ottenere i tipi di manutenzione
@app.get("/api/maintenance-types")
async def get_maintenance_types():
    return maintenance_types_db

# Endpoint per aggiungere un nuovo tipo di manutenzione
@app.post("/api/maintenance-types")
async def add_maintenance_type(type_name: str, admin: str = Depends(verify_admin)):
    if type_name in maintenance_types_db:
        raise HTTPException(status_code=400, detail="Tipo già esistente")
    maintenance_types_db.append(type_name)
    return {"status": "success"}

@app.put("/api/maintenance-types/{old_type}")
async def update_maintenance_type(old_type: str, new_type: str, admin: str = Depends(verify_admin)):
    if old_type not in maintenance_types_db:
        raise HTTPException(status_code=404, detail="Tipo non trovato")
    if new_type in maintenance_types_db:
        raise HTTPException(status_code=400, detail="Nuovo tipo già esistente")
    index = maintenance_types_db.index(old_type)
    maintenance_types_db[index] = new_type
    return {"status": "success"}

@app.delete("/api/maintenance-types/{type_name}")
async def delete_maintenance_type(type_name: str, admin: str = Depends(verify_admin)):
    if type_name not in maintenance_types_db:
        raise HTTPException(status_code=404, detail="Tipo non trovato")
    maintenance_types_db.remove(type_name)
    return {"status": "success"}


@app.get("/api/vehicle/{vehicle_id}")
async def get_vehicle(vehicle_id: str):
    if vehicle_id not in vehicles_db:
        raise HTTPException(status_code=404, detail="Veicolo non trovato")

    vehicle = vehicles_db[vehicle_id]

    # Raggruppa le attività per tipo e prendi solo la più recente
    latest_activities = {}
    for activity in sorted(vehicle["activities"], key=lambda x: x["date"], reverse=True):
        if activity["activity"] not in latest_activities:
            latest_activities[activity["activity"]] = activity

    # Aggiorna il veicolo con solo le ultime attività
    vehicle_response = dict(vehicle)
    vehicle_response["activities"] = list(latest_activities.values())

    return vehicle_response


@app.post("/api/vehicle/")
async def create_vehicle(vehicle: VehicleService, admin: str = Depends(verify_admin)):
    vehicle_id = str(uuid.uuid4())
    qr_code = generate_qr_code(vehicle_id)

    vehicles_db[vehicle_id] = {
        "id": vehicle_id,
        "license_plate": vehicle.license_plate,
        "activities": [],
        "last_update": datetime.now()
    }

    return {
        "vehicle_id": vehicle_id,
        "qr_code": qr_code
    }


@app.get("/api/vehicle/{vehicle_id}/qr")
async def get_vehicle_qr(vehicle_id: str, admin: str = Depends(verify_admin)):
    if vehicle_id not in vehicles_db:
        raise HTTPException(status_code=404, detail="Veicolo non trovato")
    return {"qr_code": generate_qr_code(vehicle_id)}


@app.post("/api/vehicle/{vehicle_id}/activity")
async def add_activity(
    vehicle_id: str,
    activity: ServiceActivity,
    admin: str = Depends(verify_admin)
):
    if vehicle_id not in vehicles_db:
        raise HTTPException(status_code=404, detail="Veicolo non trovato")

    vehicle = vehicles_db[vehicle_id]
    vehicle["activities"].append(activity.dict())
    vehicle["last_update"] = datetime.now()

    return {"status": "success"}


@app.get("/api/vehicles/")
async def list_vehicles(admin: str = Depends(verify_admin)):
    return list(vehicles_db.values())

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="localhost", port=8000)
