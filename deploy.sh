#!/usr/bin/env bash

set -euo pipefail
set -x

trap 'status=$?; echo -e "\n[ERROR] Command failed: $BASH_COMMAND"; exit $status' ERR

# Stop the app
pm2 stop over-the-hill || true

# Remove lock file
[ -f pnpm-lock.yaml ] && rm pnpm-lock.yaml

# Pull latest code, force if needed
git pull || { 
  echo "[WARN] git pull failed, attempting forced update..."; 
  git fetch --all && git reset --hard origin/main; 
}

# Install dependencies
pnpm install

# Build the app
pnpm build

# Start the app
pm2 start over-the-hill

echo "\n[INFO] Deployment completed successfully." 