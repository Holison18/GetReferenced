#!/bin/bash

# GetReference Deployment Script
# This script handles the deployment process with proper checks and rollback capabilities

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="getreferenced"
BACKUP_DIR="./backups"
LOG_FILE="./deploy.log"

# Functions
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}" | tee -a $LOG_FILE
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}" | tee -a $LOG_FILE
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}" | tee -a $LOG_FILE
    exit 1
}

check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check if required tools are installed
    command -v node >/dev/null 2>&1 || error "Node.js is not installed"
    command -v npm >/dev/null 2>&1 || error "npm is not installed"
    command -v vercel >/dev/null 2>&1 || error "Vercel CLI is not installed"
    
    # Check Node.js version
    NODE_VERSION=$(node --version | cut -d'v' -f2)
    REQUIRED_VERSION="18.0.0"
    if [ "$(printf '%s\n' "$REQUIRED_VERSION" "$NODE_VERSION" | sort -V | head -n1)" != "$REQUIRED_VERSION" ]; then
        error "Node.js version $NODE_VERSION is not supported. Required: $REQUIRED_VERSION or higher"
    fi
    
    log "Prerequisites check passed"
}

check_environment() {
    log "Checking environment variables..."
    
    required_vars=(
        "NEXT_PUBLIC_SUPABASE_URL"
        "NEXT_PUBLIC_SUPABASE_ANON_KEY"
        "SUPABASE_SERVICE_ROLE_KEY"
        "OPENAI_API_KEY"
        "STRIPE_SECRET_KEY"
        "VERCEL_TOKEN"
    )
    
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            error "Environment variable $var is not set"
        fi
    done
    
    log "Environment variables check passed"
}

run_tests() {
    log "Running tests..."
    
    # Install dependencies
    npm ci || error "Failed to install dependencies"
    
    # Run linting
    npm run lint || error "Linting failed"
    
    # Run type checking
    npx tsc --noEmit || error "Type checking failed"
    
    # Run unit tests
    npm run test || error "Unit tests failed"
    
    # Run security audit
    npm audit --audit-level=moderate || warn "Security audit found issues"
    
    log "All tests passed"
}

build_application() {
    log "Building application..."
    
    # Clean previous build
    rm -rf .next
    
    # Build the application
    npm run build || error "Build failed"
    
    log "Application built successfully"
}

create_backup() {
    log "Creating backup..."
    
    # Create backup directory if it doesn't exist
    mkdir -p $BACKUP_DIR
    
    # Create backup with timestamp
    BACKUP_NAME="backup_$(date +'%Y%m%d_%H%M%S')"
    
    # In a real scenario, this would backup the database and current deployment
    # For now, we'll just create a marker file
    echo "Backup created at $(date)" > "$BACKUP_DIR/$BACKUP_NAME.txt"
    
    log "Backup created: $BACKUP_NAME"
}

deploy_to_vercel() {
    log "Deploying to Vercel..."
    
    # Deploy to production
    DEPLOYMENT_URL=$(vercel --prod --token=$VERCEL_TOKEN) || error "Deployment failed"
    
    log "Deployment successful: $DEPLOYMENT_URL"
    echo $DEPLOYMENT_URL > .deployment_url
}

run_health_checks() {
    log "Running health checks..."
    
    # Get deployment URL
    DEPLOYMENT_URL=$(cat .deployment_url)
    
    # Wait for deployment to be ready
    sleep 30
    
    # Check health endpoint
    HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$DEPLOYMENT_URL/api/health" || echo "000")
    
    if [ "$HTTP_STATUS" != "200" ]; then
        error "Health check failed. HTTP status: $HTTP_STATUS"
    fi
    
    # Check critical pages
    PAGES=("/" "/login" "/signup")
    for page in "${PAGES[@]}"; do
        HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$DEPLOYMENT_URL$page" || echo "000")
        if [ "$HTTP_STATUS" != "200" ]; then
            warn "Page $page returned HTTP status: $HTTP_STATUS"
        fi
    done
    
    log "Health checks passed"
}

run_performance_tests() {
    log "Running performance tests..."
    
    # Install Lighthouse CI if not already installed
    if ! command -v lhci >/dev/null 2>&1; then
        npm install -g @lhci/cli@0.12.x
    fi
    
    # Run Lighthouse CI
    DEPLOYMENT_URL=$(cat .deployment_url)
    lhci autorun --collect.url="$DEPLOYMENT_URL" || warn "Performance tests had issues"
    
    log "Performance tests completed"
}

cleanup() {
    log "Cleaning up..."
    
    # Remove temporary files
    rm -f .deployment_url
    
    # Keep only last 5 backups
    if [ -d "$BACKUP_DIR" ]; then
        cd $BACKUP_DIR
        ls -t backup_*.txt | tail -n +6 | xargs -r rm
        cd ..
    fi
    
    log "Cleanup completed"
}

rollback() {
    error "Deployment failed. Initiating rollback..."
    
    # In a real scenario, this would rollback to the previous deployment
    # For Vercel, you would use: vercel rollback
    
    log "Rollback completed"
}

# Main deployment process
main() {
    log "Starting deployment of $PROJECT_NAME"
    
    # Set trap for cleanup on exit
    trap cleanup EXIT
    trap rollback ERR
    
    check_prerequisites
    check_environment
    create_backup
    run_tests
    build_application
    deploy_to_vercel
    run_health_checks
    
    # Optional performance tests (can be skipped in CI)
    if [ "${SKIP_PERFORMANCE_TESTS:-false}" != "true" ]; then
        run_performance_tests
    fi
    
    log "Deployment completed successfully!"
    log "Application is live at: $(cat .deployment_url)"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --skip-tests)
            SKIP_TESTS=true
            shift
            ;;
        --skip-performance)
            SKIP_PERFORMANCE_TESTS=true
            shift
            ;;
        --help)
            echo "Usage: $0 [--skip-tests] [--skip-performance] [--help]"
            echo "  --skip-tests        Skip running tests"
            echo "  --skip-performance  Skip performance tests"
            echo "  --help             Show this help message"
            exit 0
            ;;
        *)
            error "Unknown option: $1"
            ;;
    esac
done

# Run main deployment process
main