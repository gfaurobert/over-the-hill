#!/bin/sh

# deploy-docs.sh: One-way sync of Hugo site from source to destination directory

# Function to display usage
usage() {
    echo "Usage: $0 [--dry-run]"
    echo "  --dry-run: Simulate the sync without making changes"
    exit 1
}

# Check for dry-run flag
DRY_RUN=""
if [ "$1" = "--dry-run" ]; then
    DRY_RUN="--dry-run"
fi

# Define the .env-docs file path (same directory as script)
ENV_FILE="$(dirname "$0")/.env-docs"

# Function to create .env-docs file with user input
create_env_file() {
    echo "The .env-docs file does not exist. Let's create it."
    echo "Please provide the following details:"

    read -p "Source directory (e.g., /home/user/hugo-site/public): " source_dir
    read -p "Destination directory (e.g., /var/www/hugo-site): " dest_dir
    read -p "Web server user (e.g., www-data): " web_user
    read -p "Web server group (e.g., www-data): " web_group

    # Set default values if input is empty
    SOURCE_DIR=${source_dir:-"/home/user/hugo-site/public"}
    DEST_DIR=${dest_dir:-"/var/www/hugo-site"}
    WEB_USER=${web_user:-"www-data"}
    WEB_GROUP=${web_group:-"www-data"}

    # Write to .env-docs file
    cat > "$ENV_FILE" << EOL
SOURCE_DIR="$SOURCE_DIR"
DEST_DIR="$DEST_DIR"
WEB_USER="$WEB_USER"
WEB_GROUP="$WEB_GROUP"
EOL

    if [ $? -ne 0 ]; then
        echo "Error: Failed to create $ENV_FILE"
        exit 1
    fi
    echo "Created $ENV_FILE with provided settings."
}

# Check if .env-docs exists, create it if it doesn't
if [ ! -f "$ENV_FILE" ]; then
    create_env_file
fi

# Load environment variables from .env-docs
. "$ENV_FILE" || { echo "Error: Failed to load $ENV_FILE"; exit 1; }

# Validate required variables
if [ -z "$SOURCE_DIR" ] || [ -z "$DEST_DIR" ] || [ -z "$WEB_USER" ] || [ -z "$WEB_GROUP" ]; then
    echo "Error: Missing required variables in $ENV_FILE"
    exit 1
fi

# Define rsync options
RSYNC_OPTIONS="-avh --delete --exclude='.git' --exclude='*.tmp'"

# Check if source directory exists
if [ ! -d "$SOURCE_DIR" ]; then
    echo "Error: Source directory $SOURCE_DIR does not exist."
    exit 1
fi

# Check if destination directory exists, create if it doesn't
if [ ! -d "$DEST_DIR" ]; then
    echo "Creating destination directory $DEST_DIR..."
    sudo mkdir -p "$DEST_DIR" || { echo "Error: Failed to create $DEST_DIR"; exit 1; }
fi

# Ensure Hugo is built
echo "Building Hugo site..."
cd "$(dirname "$SOURCE_DIR")" || { echo "Error: Failed to change to Hugo directory"; exit 1; }
hugo || { echo "Error: Hugo build failed"; exit 1; }

# Perform rsync
echo "Syncing $SOURCE_DIR to $DEST_DIR..."
sudo rsync $RSYNC_OPTIONS $DRY_RUN "$SOURCE_DIR/" "$DEST_DIR/" || { echo "Error: rsync failed"; exit 1; }

# Set correct permissions
echo "Setting permissions for $DEST_DIR..."
sudo chown -R "$WEB_USER":"$WEB_GROUP" "$DEST_DIR" || { echo "Error: Failed to set ownership"; exit 1; }
sudo chmod -R 755 "$DEST_DIR" || { echo "Error: Failed to set permissions"; exit 1; }

echo "Deployment completed successfully."
