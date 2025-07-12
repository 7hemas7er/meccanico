# Dockerfile for local Docker deployment
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
RUN mkdir -p static/css static/js && \
    mkdir -p /home/data

# Copy all files including migration script
COPY . .
COPY migrate_simple.sql .

# Configure nginx for local deployment
RUN echo ' \
    server { \
    listen 80; \
    location / { \
    proxy_pass http://127.0.0.1:8000; \
    proxy_set_header Host $host; \
    proxy_set_header X-Real-IP $remote_addr; \
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; \
    proxy_set_header X-Forwarded-Proto $scheme; \
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

# Set environment variables (can be overridden at runtime)
ENV DB_PATH=/home/data/service_records.db
ENV SECRET_KEY=change-this-secret-key-in-production
ENV ADMIN_USERNAME=admin
ENV ADMIN_PASSWORD=password123
ENV HOST_URL=http://localhost:8080

# Expose port 80 for local deployment
EXPOSE 80

# Command to run both nginx and uvicorn
CMD ["/start.sh"]
