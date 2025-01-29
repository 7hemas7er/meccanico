# Use Python 3.11 slim image as base
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Copy requirements first to leverage Docker cache
COPY requirements.txt .

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create static directory
RUN mkdir -p static/css static/js

# Copy static files to their respective directories
COPY style.css static/css/
COPY admin.js static/js/
COPY maintenance.js static/js/
COPY script.js static/js/
COPY vehicle.js static/js/
COPY *.html static/

# Expose port
EXPOSE 8000

# Command to run the application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]