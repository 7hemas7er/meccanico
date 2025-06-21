#!/bin/bash
set -e

echo "🚀 Setting up Vehicle Maintenance App for Cloudflare Pages + D1"

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

# Check if required tools are installed
check_requirements() {
    print_status "Checking requirements..."
    
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed. Please install Node.js first."
        exit 1
    fi
    
    if ! command -v npx &> /dev/null; then
        print_error "npx is not installed. Please install Node.js first."
        exit 1
    fi
    
    print_success "Requirements check passed"
}

# Install Wrangler CLI
install_wrangler() {
    print_status "Installing Wrangler CLI..."
    
    # Install as project dependency
    npm install
    print_success "Wrangler CLI installed"
}

# Login to Cloudflare
login_cloudflare() {
    print_status "Checking Cloudflare authentication..."
    
    if npx wrangler whoami &> /dev/null; then
        print_success "Already logged in to Cloudflare"
    else
        print_warning "Please log in to Cloudflare..."
        npx wrangler login
    fi
}

# Install project dependencies
install_dependencies() {
    print_status "Installing project dependencies..."
    npm install
    print_success "Dependencies installed"
}

# Initialize D1 database
init_database() {
    print_status "Initializing D1 database..."
    
    # Apply schema to database
    print_status "Applying database schema..."
    npx wrangler d1 execute vehicle-maintenance-db --file=schema.sql
    
    print_success "Database initialized with schema"
}

# Update asset paths in HTML files
update_html_files() {
    print_status "Updating HTML file asset paths..."
    
    # Find and update all HTML files
    find public/ -name "*.html" -type f | while read -r file; do
        # Update CSS links
        sed -i 's|/static/css/|/assets/css/|g' "$file"
        # Update JS scripts
        sed -i 's|/static/js/|/assets/js/|g' "$file"
        # Add config.js if not present
        if ! grep -q "config.js" "$file"; then
            sed -i '/<script src="\/assets\/js\/theme.js"><\/script>/i\    <script src="/assets/js/config.js"></script>' "$file"
        fi
    done
    
    print_success "HTML files updated"
}

# Update JavaScript files to use new API
update_javascript_files() {
    print_status "Updating JavaScript files..."
    
    # Update all JS files to use api wrapper
    find public/assets/js/ -name "*.js" -not -name "config.js" -type f | while read -r file; do
        # Replace fetch calls with api wrapper
        sed -i "s|fetch('/api/|api.fetch('/api/|g" "$file"
        sed -i "s|fetch(\"/api/|api.fetch(\"/api/|g" "$file"
        sed -i "s|fetch('/token|api.postForm('/api/token|g" "$file"
        sed -i "s|fetch(\"/token|api.postForm(\"/api/token|g" "$file"
    done
    
    print_success "JavaScript files updated"
}

# Test local development
test_local() {
    print_status "Testing local development environment..."
    
    print_warning "Starting local development server..."
    print_warning "Open http://localhost:8788 in your browser to test"
    print_warning "Press Ctrl+C to stop the development server"
    
    npx wrangler pages dev public --d1=DB
}

# Deploy to Cloudflare Pages
deploy_production() {
    print_status "Deploying to Cloudflare Pages..."
    
    # Apply schema to production database
    print_status "Applying schema to production database..."
    npx wrangler d1 execute vehicle-maintenance-db --env=production --file=schema.sql
    
    # Deploy to Pages
    print_status "Deploying to Cloudflare Pages..."
    npx wrangler pages deploy public --project-name=vehicle-maintenance-app
    
    print_success "Deployment completed!"
}

# Show help
show_help() {
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  setup     - Complete setup (install, login, init database)"
    echo "  dev       - Start local development server"
    echo "  deploy    - Deploy to production"
    echo "  db:init   - Initialize database only"
    echo "  help      - Show this help"
    echo ""
    echo "Examples:"
    echo "  $0 setup     # Complete setup"
    echo "  $0 dev       # Start development"
    echo "  $0 deploy    # Deploy to production"
}

# Show deployment info
show_deployment_info() {
    echo ""
    echo "🎉 Setup completed successfully!"
    echo ""
    echo "📋 Next Steps:"
    echo "   1. Run: $0 dev (to start local development)"
    echo "   2. Run: $0 deploy (to deploy to production)"
    echo ""
    echo "🌐 URLs:"
    echo "   • Local development: http://localhost:8788"
    echo "   • Production: https://vehicle-maintenance-app.pages.dev"
    echo ""
    echo "👤 Default Admin Credentials:"
    echo "   • Username: admin"
    echo "   • Password: password123"
    echo ""
    echo "🔧 Management Commands:"
    echo "   • npx wrangler pages dev public --d1=DB (local development)"
    echo "   • npx wrangler pages deploy public (deploy)"
    echo "   • npx wrangler d1 execute vehicle-maintenance-db --command=\"SELECT * FROM users\" (query database)"
    echo ""
}

# Main script logic
case "${1:-setup}" in
    "setup")
        check_requirements
        install_wrangler
        login_cloudflare
        install_dependencies
        update_html_files
        update_javascript_files
        init_database
        show_deployment_info
        ;;
    "dev")
        test_local
        ;;
    "deploy")
        deploy_production
        ;;
    "db:init")
        init_database
        ;;
    "help"|"--help"|"-h")
        show_help
        ;;
    *)
        print_error "Unknown command: $1"
        show_help
        exit 1
        ;;
esac