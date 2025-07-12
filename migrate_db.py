#!/usr/bin/env python3
"""
Database migration script for adding is_active column to vehicles table.
This script safely adds the new column without losing existing data.
"""
import os
import sqlite3
import sys
from datetime import datetime

def migrate_database(db_path):
    """Add is_active column to vehicles table if it doesn't exist."""
    print(f"Starting migration for database: {db_path}")
    
    # Check if database exists
    if not os.path.exists(db_path):
        print(f"Error: Database file {db_path} does not exist!")
        return False
    
    # Create backup
    backup_path = f"{db_path}.backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    print(f"Creating backup: {backup_path}")
    
    try:
        # Copy database for backup
        import shutil
        shutil.copy2(db_path, backup_path)
        print(f"Backup created successfully: {backup_path}")
    except Exception as e:
        print(f"Error creating backup: {e}")
        return False
    
    # Connect to database
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Check if vehicles table exists
        cursor.execute("""
            SELECT name FROM sqlite_master 
            WHERE type='table' AND name='vehicles'
        """)
        
        if not cursor.fetchone():
            print("Warning: vehicles table does not exist. Creating tables...")
            # Import and run init_db if table doesn't exist
            sys.path.append(os.path.dirname(os.path.abspath(__file__)))
            from database import init_db
            init_db()
            print("Database tables created successfully")
            conn.close()
            return True
        
        # Check if is_active column already exists
        cursor.execute("PRAGMA table_info(vehicles)")
        columns = [column[1] for column in cursor.fetchall()]
        
        if 'is_active' in columns:
            print("Migration already applied: is_active column exists")
            conn.close()
            return True
        
        print("Adding is_active column to vehicles table...")
        
        # Add the new column with default value True (active)
        cursor.execute("""
            ALTER TABLE vehicles 
            ADD COLUMN is_active BOOLEAN DEFAULT 1
        """)
        
        # Update all existing vehicles to be active
        cursor.execute("""
            UPDATE vehicles 
            SET is_active = 1 
            WHERE is_active IS NULL
        """)
        
        # Commit changes
        conn.commit()
        
        # Verify the migration
        cursor.execute("PRAGMA table_info(vehicles)")
        columns = [column[1] for column in cursor.fetchall()]
        
        if 'is_active' in columns:
            print("✅ Migration successful: is_active column added")
            
            # Show vehicle count
            cursor.execute("SELECT COUNT(*) FROM vehicles")
            count = cursor.fetchone()[0]
            print(f"✅ {count} vehicles updated with is_active = True")
            
        else:
            print("❌ Migration failed: is_active column not found")
            conn.close()
            return False
            
    except Exception as e:
        print(f"❌ Migration error: {e}")
        conn.rollback()
        conn.close()
        return False
    
    finally:
        if 'conn' in locals():
            conn.close()
    
    print("Migration completed successfully!")
    return True

def main():
    """Main migration function."""
    # Get database path from environment or use default
    db_path = os.getenv('DB_PATH', '/home/data/service_records.db')
    
    # Allow override from command line
    if len(sys.argv) > 1:
        db_path = sys.argv[1]
    
    print(f"Database Migration Script")
    print(f"========================")
    print(f"Target database: {db_path}")
    print(f"Migration: Add is_active column to vehicles table")
    print()
    
    # Confirm migration
    response = input("Do you want to proceed with the migration? (y/N): ")
    if response.lower() not in ['y', 'yes']:
        print("Migration cancelled.")
        return
    
    # Run migration
    success = migrate_database(db_path)
    
    if success:
        print("\n🎉 Migration completed successfully!")
        print(f"Backup created at: {db_path}.backup_*")
        print("You can now restart your application.")
    else:
        print("\n💥 Migration failed!")
        print("Check the error messages above and try again.")
        sys.exit(1)

if __name__ == "__main__":
    main()