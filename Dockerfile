# Use Python 3.11 slim image as base
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Copy requirements first to leverage Docker cache
COPY requirements.txt .

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Create directory structure
RUN mkdir -p static/css static/js

# Copy static files
COPY static/css/style.css static/css/
COPY static/js/admin.js static/js/
COPY static/js/maintenance.js static/js/
COPY static/js/script.js static/js/
COPY static/js/vehicle.js static/js/
COPY static/*.html static/

# Copy Python files
COPY main.py .
COPY database.py .

# Create SQLite database directory
RUN mkdir -p data

# Expose port
EXPOSE 8000

# Command to run the application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]