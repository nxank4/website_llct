#!/usr/bin/env bash
set -euo pipefail

# Sync requirements.txt from pyproject.toml using uv
# Usage: bash sync_requirements.sh

echo "Syncing requirements.txt from pyproject.toml..."

# Check if uv is installed
if ! command -v uv &> /dev/null; then
  echo "Error: uv is not installed. Please install it first:"
  echo "  curl -LsSf https://astral.sh/uv/install.sh | sh"
  echo "  or: pip install uv"
  exit 1
fi

# Generate requirements.txt from pyproject.toml
uv pip compile pyproject.toml -o requirements.txt

echo "✓ requirements.txt has been updated from pyproject.toml"

