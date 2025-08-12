#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔐 Setting up Supabase Studio Authentication${NC}"

# Check if htpasswd is available
if ! command -v htpasswd &> /dev/null; then
    echo -e "${RED}❌ htpasswd command not found. Installing apache2-utils...${NC}"
    sudo apt-get update
    sudo apt-get install -y apache2-utils
fi

# Prompt for username and password
read -p "Enter username for Supabase Studio: " STUDIO_USERNAME
read -s -p "Enter password for Supabase Studio: " STUDIO_PASSWORD
echo

# Define .env file path (relative to project root)
ENV_FILE=".env"

# Store credentials in .env file
echo -e "${BLUE}📝 Storing credentials in .env file...${NC}"

# Check if .env file exists, if not create it
if [ ! -f "$ENV_FILE" ]; then
    echo -e "${YELLOW}⚠️  .env file not found, creating new one...${NC}"
    touch "$ENV_FILE"
fi

# Remove existing STUDIO_USERNAME and STUDIO_PASSWORD lines if they exist
if [ -f "$ENV_FILE" ]; then
    # Create a temporary file without the existing studio credentials
    grep -v "^STUDIO_USERNAME=" "$ENV_FILE" | grep -v "^STUDIO_PASSWORD=" > "${ENV_FILE}.tmp"
    mv "${ENV_FILE}.tmp" "$ENV_FILE"
fi

# Add the new credentials to .env file
echo "STUDIO_USERNAME=$STUDIO_USERNAME" >> "$ENV_FILE"
echo "STUDIO_PASSWORD=$STUDIO_PASSWORD" >> "$ENV_FILE"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Credentials stored in .env file successfully!${NC}"
    echo -e "${BLUE}📋 .env file location: $ENV_FILE${NC}"
    echo -e "${BLUE}📋 Username: $STUDIO_USERNAME${NC}"
    echo -e "${YELLOW}⚠️  Remember to add .env to .gitignore if not already included${NC}"
else
    echo -e "${RED}❌ Failed to store credentials in .env file${NC}"
    exit 1
fi

# Create or update the password file for nginx
echo -e "${BLUE}📝 Creating nginx password file...${NC}"

# Check if .htpasswd file exists
if [ -f "/etc/nginx/.htpasswd" ]; then
    echo -e "${BLUE}📝 Adding user to existing .htpasswd file...${NC}"
    echo "$STUDIO_PASSWORD" | sudo htpasswd -i /etc/nginx/.htpasswd "$STUDIO_USERNAME"
else
    echo -e "${BLUE}📝 Creating new .htpasswd file...${NC}"
    echo "$STUDIO_PASSWORD" | sudo htpasswd -ci /etc/nginx/.htpasswd "$STUDIO_USERNAME"
fi

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Nginx password file created successfully!${NC}"
    echo -e "${BLUE}📋 Username: $STUDIO_USERNAME${NC}"
    echo -e "${BLUE}📋 Password file: /etc/nginx/.htpasswd${NC}"
    echo ""
    echo -e "${BLUE}🔄 Reloading Nginx configuration...${NC}"
    sudo nginx -t && sudo systemctl reload nginx
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Nginx configuration reloaded successfully!${NC}"
        echo -e "${BLUE}🌐 Supabase Studio is now protected at: https://db.tim.faurobert.fr${NC}"
        echo ""
        echo -e "${GREEN}✅ Setup complete! Credentials stored in .env and nginx configured.${NC}"
    else
        echo -e "${RED}❌ Failed to reload Nginx configuration${NC}"
    fi
else
    echo -e "${RED}❌ Failed to create nginx password file${NC}"
    exit 1
fi 