-- Cloudflare D1 Database Schema
-- Vehicle Maintenance Application

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT DEFAULT 'user',
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login DATETIME
);

-- Vehicles table
CREATE TABLE IF NOT EXISTS vehicles (
    id TEXT PRIMARY KEY,
    license_plate TEXT UNIQUE NOT NULL,
    last_update DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Activities table (maintenance records)
CREATE TABLE IF NOT EXISTS activities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    vehicle_id TEXT NOT NULL,
    activity TEXT NOT NULL,
    kilometers INTEGER NOT NULL,
    date DATETIME NOT NULL,
    FOREIGN KEY (vehicle_id) REFERENCES vehicles (id) ON DELETE CASCADE
);

-- Maintenance types table
CREATE TABLE IF NOT EXISTS maintenance_types (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL
);

-- QR settings table
CREATE TABLE IF NOT EXISTS qr_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    host_url TEXT DEFAULT 'https://your-app.pages.dev',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_vehicles_license_plate ON vehicles(license_plate);
CREATE INDEX IF NOT EXISTS idx_activities_vehicle_id ON activities(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_activities_date ON activities(date);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- Insert default maintenance types
INSERT OR IGNORE INTO maintenance_types (name) VALUES 
('Cambio olio'),
('Revisione'),
('Tagliando'),
('Riparazione'),
('Lavaggio'),
('Controllo pneumatici'),
('Cambio filtri'),
('Controllo freni');

-- Insert default QR settings
INSERT OR IGNORE INTO qr_settings (host_url) VALUES ('https://your-app.pages.dev');