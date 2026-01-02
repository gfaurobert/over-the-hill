#!/bin/bash

# Script to check and configure UFW for Supabase local development ports

echo "🔍 Checking UFW status..."
echo ""

# Check if UFW is installed
if ! command -v ufw &> /dev/null; then
    echo "❌ UFW is not installed. Installing..."
    sudo apt-get update && sudo apt-get install -y ufw
fi

# Check UFW status
echo "📊 Current UFW status:"
sudo ufw status verbose
echo ""

# Supabase default ports
PORTS=(
    3010    # REST Admin API (the one failing)
    54321   # Kong API Gateway
    54322   # Postgres database
    54323   # GoTrue (Auth)
    54324   # PostgREST (REST API)
    54325   # Realtime
    54326   # Storage
    54327   # imgproxy
    54328   # Studio
)

echo "🔐 Checking if ports are open in UFW..."
echo ""

# Check each port
for port in "${PORTS[@]}"; do
    if sudo ufw status | grep -q "$port"; then
        echo "✅ Port $port is already configured"
    else
        echo "⚠️  Port $port is NOT configured"
    fi
done

echo ""
echo "📝 To open all Supabase ports, run:"
echo ""
for port in "${PORTS[@]}"; do
    echo "sudo ufw allow $port/tcp"
done

echo ""
echo "💡 Or run this script with --open flag to automatically open all ports:"
echo "   sudo bash $0 --open"

# If --open flag is provided, open all ports
if [ "$1" == "--open" ]; then
    echo ""
    echo "🔓 Opening all Supabase ports..."
    for port in "${PORTS[@]}"; do
        echo "Opening port $port..."
        sudo ufw allow $port/tcp
    done
    echo ""
    echo "✅ All ports have been opened!"
    echo ""
    echo "📊 Updated UFW status:"
    sudo ufw status verbose
fi

