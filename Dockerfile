FROM python:3.11-slim

# Install nginx
RUN apt-get update && \
    apt-get install -y nginx && \
    rm -rf /var/lib/apt/lists/* && \
    rm -f /etc/nginx/sites-enabled/default && \
    rm -f /etc/nginx/sites-available/default && \
    rm -rf /usr/share/nginx/html/*

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

# Configure nginx
RUN echo ' \
    server { \
    listen 443; \
    location / { \
    proxy_pass http://127.0.0.1:8000; \
    proxy_set_header Host $host; \
    proxy_set_header X-Real-IP $remote_addr; \
    } \
    location /static { \
    alias /app/static; \
    } \
    } \
    ' > /etc/nginx/conf.d/default.conf

# Create startup script
RUN echo '#!/bin/bash\n\
    service nginx start\n\
    uvicorn main:app --host 127.0.0.1 --port 8000\n\
    ' > /start.sh && chmod +x /start.sh

# Expose port
EXPOSE 443

# Command to run both nginx and uvicorn
CMD ["/start.sh"]