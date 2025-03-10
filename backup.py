# backup.py
import os
import sqlite3
import tempfile
import shutil
import json
from datetime import datetime
from typing import Dict, List, Any, Optional
from fastapi import UploadFile
from fastapi.responses import FileResponse
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class DatabaseBackup:
    def __init__(self, db_path: str):
        """Initialize with the path to the SQLite database file"""
        self.db_path = db_path

    async def export_database(self) -> str:
        """
        Export the database to a downloadable file
        Returns the path to the temporary exported file
        """
        try:
            # Create a temporary directory for the export
            temp_dir = tempfile.mkdtemp()
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            export_filename = f"service_records_backup_{timestamp}.db"
            export_path = os.path.join(temp_dir, export_filename)

            # Copy the database file
            shutil.copy2(self.db_path, export_path)

            logger.info(f"Database exported to {export_path}")
            return export_path
        except Exception as e:
            logger.error(f"Error exporting database: {str(e)}")
            raise

    async def export_as_json(self) -> str:
        """
        Export the database as a JSON file
        Returns the path to the temporary JSON file
        """
        try:
            # Create a temporary directory for the export
            temp_dir = tempfile.mkdtemp()
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            export_filename = f"service_records_backup_{timestamp}.json"
            export_path = os.path.join(temp_dir, export_filename)

            # Connect to the database
            conn = sqlite3.connect(self.db_path)
            conn.row_factory = sqlite3.Row

            # Extract data from each table
            cursor = conn.cursor()

            # Get all table names
            cursor.execute(
                "SELECT name FROM sqlite_master WHERE type='table';")
            tables = cursor.fetchall()

            data = {}

            for table in tables:
                table_name = table[0]
                cursor.execute(f"SELECT * FROM {table_name}")
                rows = cursor.fetchall()

                # Convert rows to list of dicts
                data[table_name] = [dict(row) for row in rows]

            # Write to JSON file
            with open(export_path, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=4, default=str)

            conn.close()
            logger.info(f"Database exported as JSON to {export_path}")
            return export_path
        except Exception as e:
            logger.error(f"Error exporting database as JSON: {str(e)}")
            raise

    async def import_database(self, file: UploadFile) -> bool:
        """
        Import a database file, replacing the current database
        Returns True if successful
        """
        if not file.filename or not (file.filename.endswith('.db') or file.filename.endswith('.sqlite')):
            raise ValueError(
                "Invalid file format. Must be a .db or .sqlite file")

        try:
            # Create a temporary file to save the uploaded content
            temp_file = tempfile.NamedTemporaryFile(delete=False)

            # Write uploaded content to the temporary file
            content = await file.read()
            temp_file.write(content)
            temp_file.close()

            # Verify the file is a valid SQLite database
            try:
                conn = sqlite3.connect(temp_file.name)
                cursor = conn.cursor()
                cursor.execute("PRAGMA integrity_check;")
                integrity = cursor.fetchone()[0]
                conn.close()

                if integrity != "ok":
                    os.unlink(temp_file.name)
                    raise ValueError(
                        "The uploaded file is not a valid SQLite database")
            except sqlite3.Error:
                os.unlink(temp_file.name)
                raise ValueError(
                    "The uploaded file is not a valid SQLite database")

            # Backup the current database
            backup_dir = os.path.dirname(self.db_path)
            backup_timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            backup_file = os.path.join(
                backup_dir, f"service_records_backup_{backup_timestamp}.db")

            # Make sure the current database exists
            if os.path.exists(self.db_path):
                shutil.copy2(self.db_path, backup_file)
                logger.info(f"Current database backed up to {backup_file}")

            # Replace the current database with the uploaded one
            shutil.copy2(temp_file.name, self.db_path)
            os.unlink(temp_file.name)

            logger.info("Database successfully imported")
            return True
        except Exception as e:
            logger.error(f"Error importing database: {str(e)}")
            if os.path.exists(temp_file.name):
                os.unlink(temp_file.name)
            raise

    async def import_json(self, file: UploadFile) -> bool:
        """
        Import a JSON file into the database
        Returns True if successful
        """
        if not file.filename or not file.filename.endswith('.json'):
            raise ValueError("Invalid file format. Must be a .json file")

        try:
            # Read JSON data
            content = await file.read()
            json_data = json.loads(content.decode('utf-8'))

            # Backup the current database
            backup_dir = os.path.dirname(self.db_path)
            backup_timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            backup_file = os.path.join(
                backup_dir, f"service_records_backup_{backup_timestamp}.db")

            # Make sure the current database exists
            if os.path.exists(self.db_path):
                shutil.copy2(self.db_path, backup_file)
                logger.info(f"Current database backed up to {backup_file}")

            # Connect to the database
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()

            # Drop all existing data in tables
            cursor.execute("PRAGMA foreign_keys = OFF;")

            for table_name in json_data:
                # Skip sqlite_sequence table and any other system tables
                if table_name.startswith('sqlite_'):
                    continue

                # Check if table exists and drop it
                cursor.execute(f"DELETE FROM {table_name};")

            # Import data for each table
            for table_name, rows in json_data.items():
                # Skip sqlite_sequence table and any other system tables
                if table_name.startswith('sqlite_'):
                    continue

                # Get table columns
                cursor.execute(f"PRAGMA table_info({table_name});")
                columns = [column[1] for column in cursor.fetchall()]

                # Insert rows
                for row in rows:
                    # Filter row data to only include existing columns
                    filtered_row = {k: v for k,
                                    v in row.items() if k in columns}

                    if not filtered_row:
                        continue

                    placeholders = ", ".join(["?"] * len(filtered_row))
                    columns_str = ", ".join(filtered_row.keys())

                    cursor.execute(
                        f"INSERT INTO {table_name} ({columns_str}) VALUES ({placeholders})",
                        list(filtered_row.values())
                    )

            cursor.execute("PRAGMA foreign_keys = ON;")
            conn.commit()
            conn.close()

            logger.info("JSON data successfully imported into database")
            return True
        except Exception as e:
            logger.error(f"Error importing JSON data: {str(e)}")
            raise
