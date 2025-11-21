#!/bin/bash

# Script để test local: lint và build cho cả client và server
# Sử dụng: ./scripts/test-local.sh [client|server|all]

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Function to test client
test_client() {
    print_info "Testing Client (Frontend)..."
    cd client
    
    print_info "Installing dependencies..."
    pnpm install
    
    print_info "Running ESLint..."
    if pnpm run lint; then
        print_info "✓ ESLint passed"
    else
        print_error "✗ ESLint failed"
        cd ..
        return 1
    fi
    
    print_info "Building client..."
    if pnpm run build; then
        print_info "✓ Client build successful"
    else
        print_error "✗ Client build failed"
        cd ..
        return 1
    fi
    
    cd ..
    print_info "✓ Client test completed successfully"
}

# Function to test server
test_server() {
    print_info "Testing Server (Backend)..."
    cd server
    
    # Check if ruff is available
    if command -v ruff &> /dev/null; then
        print_info "Running Ruff (linter)..."
        if ruff check .; then
            print_info "✓ Ruff check passed"
        else
            print_warning "✗ Ruff check found issues (non-blocking)"
        fi
        
        print_info "Running Ruff (formatter check)..."
        if ruff format --check .; then
            print_info "✓ Ruff format check passed"
        else
            print_warning "✗ Ruff format check found issues (non-blocking)"
        fi
    else
        print_warning "Ruff not found. Install with: pip install ruff or uv add --dev ruff"
    fi
    
    # Check if mypy is available
    if command -v mypy &> /dev/null; then
        print_info "Running MyPy (type checker)..."
        if mypy app/; then
            print_info "✓ MyPy check passed"
        else
            print_warning "✗ MyPy check found issues (non-blocking)"
        fi
    else
        print_warning "MyPy not found. Install with: pip install mypy or uv add --dev mypy"
    fi
    
    # Check if Python syntax is valid
    print_info "Checking Python syntax..."
    if python -m py_compile app/main.py; then
        print_info "✓ Python syntax check passed"
    else
        print_error "✗ Python syntax check failed"
        cd ..
        return 1
    fi
    
    cd ..
    print_info "✓ Server test completed successfully"
}

# Main script
TARGET=${1:-all}

case $TARGET in
    client)
        test_client
        ;;
    server)
        test_server
        ;;
    all)
        print_info "Running full test suite..."
        test_client
        test_server
        print_info "✓ All tests completed successfully!"
        ;;
    *)
        print_error "Invalid target: $TARGET"
        echo "Usage: $0 [client|server|all]"
        exit 1
        ;;
esac

