# Vehicle Maintenance App - RHEL 9 Docker Deployment

## Prerequisites

### System Requirements
- RHEL 9 (or compatible distribution)
- Docker installed and running
- 2GB+ RAM available
- 5GB+ disk space

### Install Docker on RHEL 9

```bash
# Update system
sudo dnf update -y

# Install Docker
sudo dnf config-manager --add-repo https://download.docker.com/linux/rhel/docker-ce.repo
sudo dnf install -y docker-ce docker-ce-cli containerd.io

# Start and enable Docker service
sudo systemctl start docker
sudo systemctl enable docker

# Add user to docker group (optional, to avoid sudo)
sudo usermod -aG docker $USER
newgrp docker

# Verify installation
docker --version
docker info
```

## Quick Deployment

### Automatic Deployment
The easiest way to deploy is using the provided script:

```bash
# Make script executable
chmod +x deploy-rhel9.sh

# Deploy with default settings
./deploy-rhel9.sh

# Deploy with custom settings
./deploy-rhel9.sh --port 9000 --admin-user myadmin --admin-password mypassword
```

### Manual Deployment

```bash
# 1. Build the image
docker build -f Dockerfile.rhel9 -t meccanico-app:latest .

# 2. Create data volume
docker volume create meccanico-data

# 3. Run container
docker run -d \
  --name meccanico-container \
  --restart unless-stopped \
  -p 8080:8080 \
  -v meccanico-data:/home/data \
  -e SECRET_KEY="your-secret-key-here" \
  -e ADMIN_USERNAME="admin" \
  -e ADMIN_PASSWORD="password123" \
  -e HOST_URL="http://your-server-ip:8080" \
  meccanico-app:latest
```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `SECRET_KEY` | JWT secret key for token signing | Auto-generated |
| `ADMIN_USERNAME` | Default admin username | `admin` |
| `ADMIN_PASSWORD` | Default admin password | `password123` |
| `HOST_URL` | Base URL for QR code generation | `http://localhost:8080` |
| `DB_PATH` | SQLite database file path | `/home/data/service_records.db` |

### Port Configuration
- Default port: `8080`
- Can be changed during deployment: `--port 9000`
- Container internal port: `8080` (don't change)

## Access & Usage

### Web Interface
- **URL**: `http://your-server-ip:8080`
- **Default Login**: 
  - Username: `admin`
  - Password: `password123`

### API Endpoints
- **API Base**: `http://your-server-ip:8080/api`
- **Documentation**: `http://your-server-ip:8080/docs`
- **Login**: `POST /token`
- **Vehicles**: `GET /api/vehicles/`

## Management Commands

### Container Management
```bash
# View logs
docker logs meccanico-container

# Follow logs (real-time)
docker logs -f meccanico-container

# Stop application
docker stop meccanico-container

# Start application
docker start meccanico-container

# Restart application
docker restart meccanico-container

# Remove container (data persists in volume)
docker rm -f meccanico-container
```

### Data Management
```bash
# Backup database
docker run --rm -v meccanico-data:/data -v $(pwd):/backup \
  alpine tar czf /backup/meccanico-backup-$(date +%Y%m%d).tar.gz -C /data .

# Restore database
docker run --rm -v meccanico-data:/data -v $(pwd):/backup \
  alpine tar xzf /backup/meccanico-backup-YYYYMMDD.tar.gz -C /data

# View data volume contents
docker run --rm -v meccanico-data:/data alpine ls -la /data
```

### Image Management
```bash
# Update application
git pull  # Get latest code
./deploy-rhel9.sh  # Redeploy

# Remove old images
docker image prune -f

# View image size
docker images meccanico-app
```

## Troubleshooting

### Common Issues

#### 1. Port Already in Use
```bash
# Check what's using the port
sudo ss -tulpn | grep :8080

# Use different port
./deploy-rhel9.sh --port 9000
```

#### 2. Permission Denied
```bash
# Add user to docker group
sudo usermod -aG docker $USER
newgrp docker

# Or use sudo
sudo ./deploy-rhel9.sh
```

#### 3. Container Won't Start
```bash
# Check logs
docker logs meccanico-container

# Check container status
docker ps -a

# Remove and recreate
docker rm -f meccanico-container
./deploy-rhel9.sh
```

#### 4. Database Issues
```bash
# Reset database (WARNING: This deletes all data)
docker volume rm meccanico-data
./deploy-rhel9.sh
```

### Firewall Configuration

If the application is not accessible from other machines:

```bash
# RHEL 9 with firewalld
sudo firewall-cmd --permanent --add-port=8080/tcp
sudo firewall-cmd --reload

# Check firewall status
sudo firewall-cmd --list-ports
```

### SELinux Considerations

If experiencing SELinux issues:

```bash
# Check SELinux status
sestatus

# View SELinux denials
sudo ausearch -m avc -ts recent

# Allow Docker (if needed)
sudo setsebool -P container_manage_cgroup on
```

## Security Recommendations

### Production Deployment
1. **Change default credentials**:
   ```bash
   ./deploy-rhel9.sh --admin-user youradmin --admin-password strongpassword
   ```

2. **Use strong secret key**:
   ```bash
   ./deploy-rhel9.sh --secret-key "$(openssl rand -hex 32)"
   ```

3. **Enable HTTPS**: Use reverse proxy (nginx/traefik) for SSL termination

4. **Limit network access**: Configure firewall rules appropriately

5. **Regular updates**: Keep Docker and system updated

### Backup Strategy
- **Daily backups**: Automate database backups
- **Version control**: Keep application code in git
- **Image registry**: Push images to private registry for production

## Performance Tuning

### Resource Limits
```bash
# Run with resource limits
docker run -d \
  --name meccanico-container \
  --restart unless-stopped \
  -p 8080:8080 \
  -v meccanico-data:/home/data \
  --memory="1g" \
  --cpus="1.0" \
  meccanico-app:latest
```

### Monitoring
```bash
# Monitor resource usage
docker stats meccanico-container

# Check container health
docker inspect meccanico-container | grep -A 5 Health
```

## Support

For issues specific to RHEL 9 deployment:
1. Check container logs: `docker logs meccanico-container`
2. Verify Docker installation: `docker info`
3. Check system resources: `free -h` and `df -h`
4. Review firewall settings: `sudo firewall-cmd --list-all`

For application-specific issues, refer to the main project documentation.