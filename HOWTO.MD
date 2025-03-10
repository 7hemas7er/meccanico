# Deploying to Azure App Service

## 1. Update your Dockerfile

Modify your Dockerfile to properly handle Azure App Service requirements:

```dockerfile
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
    listen 8080; \
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
ENV HOST_URL=https://your-app-name.azurewebsites.net

# Expose port 8080 for Azure
EXPOSE 8080

# Command to run both nginx and uvicorn
CMD ["/start.sh"]
```

## 2. Azure App Service Configuration

1. Create an Azure App Service with Docker Container support.
2. Set up Continuous Deployment from your GitHub repository or use Azure Container Registry.
3. Configure the following App Settings in Azure Portal:

   - `SECRET_KEY`: A secure random string for JWT encryption
   - `ADMIN_USERNAME`: Your admin username
   - `ADMIN_PASSWORD`: A strong password for admin
   - `HOST_URL`: Your Azure App Service URL (https://your-app-name.azurewebsites.net)

## 3. Database Considerations

For the database in a production environment:

1. **Option 1 - Persistent Storage**: Configure an Azure File Share and mount it to your container for persistent SQLite storage.

   ```yaml
   # In your App Service Configuration
   WEBSITES_ENABLE_APP_SERVICE_STORAGE: true
   ```

   Then configure a path mapping for the `/home/data` directory to your Azure File Share.

2. **Option 2 - Full Database Service**: Replace SQLite with Azure SQL Database or Azure Database for PostgreSQL.

## 4. Security Considerations

1. Update your `SECRET_KEY` to a strong random string.
2. Enable HTTPS only in your App Service configuration.
3. Update your token logic to set secure cookies (set `secure=True` in the cookie settings).
4. Consider adding Azure Application Gateway or Front Door for additional security.

## 5. Deployment Commands

```bash
# Build your Docker image
docker build -t vehicle-maintenance-app .

# Test locally
docker run -p 8080:8080 vehicle-maintenance-app

# Push to Azure Container Registry
az acr login --name YourRegistryName
docker tag vehicle-maintenance-app YourRegistryName.azurecr.io/vehicle-maintenance-app:latest
docker push YourRegistryName.azurecr.io/vehicle-maintenance-app:latest

# Deploy to Azure App Service
az webapp config container set --name YourAppServiceName --resource-group YourResourceGroup --docker-custom-image-name YourRegistryName.azurecr.io/vehicle-maintenance-app:latest
```