#!/bin/bash
set -e

echo "🚀 Deploying Vehicle Maintenance App on RHEL 9 with Docker"

# Configuration
IMAGE_NAME="meccanico-app"
CONTAINER_NAME="meccanico-container"
HOST_PORT="8080"
DB_VOLUME="meccanico-data"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is installed and running
check_docker() {
    print_status "Checking Docker installation..."
    
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    if ! docker info &> /dev/null; then
        print_error "Docker daemon is not running. Please start Docker service."
        echo "Run: sudo systemctl start docker"
        exit 1
    fi
    
    print_success "Docker is installed and running"
}

# Stop and remove existing container
cleanup_existing() {
    print_status "Cleaning up existing containers..."
    
    if docker ps -q -f name=${CONTAINER_NAME} | grep -q .; then
        print_status "Stopping existing container..."
        docker stop ${CONTAINER_NAME}
    fi
    
    if docker ps -aq -f name=${CONTAINER_NAME} | grep -q .; then
        print_status "Removing existing container..."
        docker rm ${CONTAINER_NAME}
    fi
    
    print_success "Cleanup completed"
}

# Build Docker image
build_image() {
    print_status "Building Docker image..."
    
    if ! docker build -f Dockerfile.rhel9 -t ${IMAGE_NAME}:latest .; then
        print_error "Failed to build Docker image"
        exit 1
    fi
    
    print_success "Docker image built successfully"
}

# Create data volume
create_volume() {
    print_status "Creating data volume..."
    
    if ! docker volume ls -q | grep -q "^${DB_VOLUME}$"; then
        docker volume create ${DB_VOLUME}
        print_success "Data volume created: ${DB_VOLUME}"
    else
        print_status "Data volume already exists: ${DB_VOLUME}"
    fi
}

# Run container
run_container() {
    print_status "Starting container..."
    
    docker run -d \
        --name ${CONTAINER_NAME} \
        --restart unless-stopped \
        -p ${HOST_PORT}:8080 \
        -v ${DB_VOLUME}:/home/data \
        -e SECRET_KEY="${SECRET_KEY:-$(openssl rand -hex 32)}" \
        -e ADMIN_USERNAME="${ADMIN_USERNAME:-admin}" \
        -e ADMIN_PASSWORD="${ADMIN_PASSWORD:-password123}" \
        -e HOST_URL="http://$(hostname -I | awk '{print $1}'):${HOST_PORT}" \
        ${IMAGE_NAME}:latest
    
    if [ $? -eq 0 ]; then
        print_success "Container started successfully"
    else
        print_error "Failed to start container"
        exit 1
    fi
}

# Check container health
check_health() {
    print_status "Waiting for application to start..."
    
    for i in {1..30}; do
        if curl -s -f http://localhost:${HOST_PORT}/ > /dev/null 2>&1; then
            print_success "Application is running and healthy!"
            break
        elif [ $i -eq 30 ]; then
            print_error "Application failed to start within 30 seconds"
            print_status "Container logs:"
            docker logs ${CONTAINER_NAME}
            exit 1
        else
            echo -n "."
            sleep 1
        fi
    done
}

# Show deployment info
show_info() {
    local_ip=$(hostname -I | awk '{print $1}')
    
    echo ""
    echo "🎉 Deployment completed successfully!"
    echo ""
    echo "📋 Application Information:"
    echo "   • Container Name: ${CONTAINER_NAME}"
    echo "   • Image: ${IMAGE_NAME}:latest"
    echo "   • Port: ${HOST_PORT}"
    echo "   • Data Volume: ${DB_VOLUME}"
    echo ""
    echo "🌐 Access URLs:"
    echo "   • Local: http://localhost:${HOST_PORT}"
    echo "   • Network: http://${local_ip}:${HOST_PORT}"
    echo ""
    echo "👤 Default Admin Credentials:"
    echo "   • Username: ${ADMIN_USERNAME:-admin}"
    echo "   • Password: ${ADMIN_PASSWORD:-password123}"
    echo ""
    echo "🔧 Management Commands:"
    echo "   • View logs: docker logs ${CONTAINER_NAME}"
    echo "   • Stop app: docker stop ${CONTAINER_NAME}"
    echo "   • Start app: docker start ${CONTAINER_NAME}"
    echo "   • Remove app: docker rm -f ${CONTAINER_NAME}"
    echo "   • Update app: ./deploy-rhel9.sh"
    echo ""
}

# Main deployment process
main() {
    echo "🏁 Starting deployment process..."
    
    check_docker
    cleanup_existing
    build_image
    create_volume
    run_container
    check_health
    show_info
    
    print_success "Deployment completed successfully! 🚀"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --port)
            HOST_PORT="$2"
            shift 2
            ;;
        --admin-user)
            ADMIN_USERNAME="$2"
            shift 2
            ;;
        --admin-password)
            ADMIN_PASSWORD="$2"
            shift 2
            ;;
        --secret-key)
            SECRET_KEY="$2"
            shift 2
            ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --port PORT              Set host port (default: 8080)"
            echo "  --admin-user USERNAME    Set admin username (default: admin)"
            echo "  --admin-password PASS    Set admin password (default: password123)"
            echo "  --secret-key KEY         Set JWT secret key (auto-generated if not set)"
            echo "  --help                   Show this help message"
            echo ""
            echo "Example:"
            echo "  $0 --port 9000 --admin-user myadmin --admin-password mypassword"
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Run main function
main