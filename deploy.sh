#!/usr/bin/env bash

set -euo pipefail
set -x

trap 'status=$?; echo -e "\n[ERROR] Command failed: $BASH_COMMAND"; exit $status' ERR

# Check if .env.local exists and has proper permissions
if [ -f .env.local ]; then
    echo "[INFO] Found .env.local file"
    # Check file permissions (should be 600)
    PERMS=$(stat -c "%a" .env.local)
    if [ "$PERMS" != "600" ]; then
        echo "[WARN] .env.local has permissions $PERMS, should be 600"
        echo "[INFO] Fixing permissions..."
        chmod 600 .env.local
    fi
else
    echo "[WARN] No .env.local file found. Make sure to create one with your environment variables."
fi

# Check environment variables before deployment
echo "[INFO] Checking environment variables..."
if ! node check-env.js; then
    echo "[ERROR] Environment check failed. Please set the required environment variables."
    echo "[INFO] For production with .env.local file, make sure it contains:"
    echo "  NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co"
    echo "  NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here"
    echo "  SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here"
    exit 1
fi

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
echo "[INFO] Environment variables loaded from .env.local" 