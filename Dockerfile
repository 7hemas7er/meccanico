FROM python:3.11-slim

# Install nginx
RUN apt-get update && \
    apt-get install -y nginx supervisor && \
    rm -rf /var/lib/apt/lists/* && \
    rm -f /etc/nginx/sites-enabled/default

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

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Create SQLite database directory
RUN mkdir -p data

# Configure supervisor
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Expose ports
EXPOSE 80
EXPOSE 443

# Start supervisor (which will start both nginx and uvicorn)
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]