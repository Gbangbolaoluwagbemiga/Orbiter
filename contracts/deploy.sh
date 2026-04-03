#!/bin/bash

# Deploy script for Payeer contracts
# Source this file or run it directly

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Load environment variables
if [ -f ../.env ]; then
  source ../.env
  echo "✓ Loaded environment variables from .env"
else
  echo "✗ .env file not found!"
  exit 1
fi

# Check if PRIVATE_KEY is set
if [ -z "$PRIVATE_KEY" ]; then
  echo "✗ PRIVATE_KEY not set in .env"
  exit 1
fi

echo "🚀 Deploying Payeer contracts..."
echo "Network: $1 (default: alfajores)"

NETWORK=${1:-alfajores}

npx hardhat ignition deploy ignition/modules/Payeer.js --network $NETWORK

if [ $? -eq 0 ]; then
  echo "✓ Deployment successful!"
  echo "📍 Check deployment details in: ignition/deployments/chain-*/deployment.json"
else
  echo "✗ Deployment failed"
  exit 1
fi
