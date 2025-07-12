-- Simple database migration for adding is_active column to vehicles table
-- This SQL script can be run on any SQLite database (local or Fly.io)

-- Add is_active column if it doesn't exist (safe migration)
-- SQLite will ignore this if the column already exists
ALTER TABLE vehicles ADD COLUMN is_active BOOLEAN DEFAULT 1;

-- Set all existing vehicles as active
UPDATE vehicles SET is_active = 1 WHERE is_active IS NULL;

-- Verify the migration
.schema vehicles