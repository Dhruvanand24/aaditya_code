#!/usr/bin/env sh

set -e

echo "Initializing Uptime Monitor API development environment..."

if ! command -v node >/dev/null 2>&1; then
  echo "Error: Node.js is not installed or not in PATH."
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "Error: npm is not installed or not in PATH."
  exit 1
fi

echo "Node version: $(node -v)"
echo "npm version: $(npm -v)"

echo "Installing dependencies..."
npm install

if [ ! -f ".env" ]; then
  echo "Creating .env from .env.example..."
  cp .env.example .env
else
  echo ".env already exists, skipping creation."
fi

echo "Making test scripts executable..."
chmod +x tests/*.sh

echo
echo "Initialization complete."
echo "Next steps:"
echo "1) Ensure MongoDB is running locally."
echo "2) Review and update .env if needed."
echo "3) Start server: npm start"
