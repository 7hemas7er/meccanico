# Description: Dockerfile for deploying FastAPI app to Azure App Service
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

# Copy all files
COPY . .

# Configure nginx - Update to listen on port 8080 for Azure
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

# Set environment variables
ENV DB_PATH=/home/data/service_records.db
ENV SECRET_KEY=change-this-secret-key-in-production
ENV ADMIN_USERNAME=admin
ENV ADMIN_PASSWORD=password123
# Update host URL to use your Azure App Service URL
ENV HOST_URL=https://meccanico-aregf0d6g6ahf5gn.italynorth-01.azurewebsites.net/

# Expose port 8080 for Azure
EXPOSE 443

# Command to run both nginx and uvicorn
CMD ["/start.sh"]
