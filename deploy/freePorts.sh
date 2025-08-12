#!/bin/bash
TCP_PORTS=$(netstat -tuln | grep LISTEN | awk '$1 == "tcp" {split($4, arr, ":"); print arr[2]}' | sort -n | uniq)
TCP6_PORTS=$(netstat -tuln | grep LISTEN | awk '$1 == "tcp6" {split($4, arr, ":"); print arr[length(arr)]}' | sort -n | uniq)

# Remove duplicates
USED_PORTS=$(echo "$TCP_PORTS $TCP6_PORTS" | tr ' ' '\n' | sort -n | uniq)

# Print ports
# echo "Used ports:"
# echo "$USED_PORTS"

# Find free ports
FREE_PORTS=()
START_PORT=3000
COUNT=0

while [ $COUNT -lt 6 ]; do
    # Check if port is in USED_PORTS
    if ! echo "$USED_PORTS" | grep -wq "$START_PORT"; then
        FREE_PORTS+=($START_PORT)
        COUNT=$((COUNT + 1))
    fi
    START_PORT=$((START_PORT + 1))
done

# Write the port assignments to .env, checking for existing values

ENV_FILE=".env"

# Prepare the port variable names and values
PORT_VARS=(
  "NEXTJS_APP_PORT=${FREE_PORTS[0]}"
  "STUDIO_PORT=${FREE_PORTS[1]}"
  "DB_PORT=${FREE_PORTS[2]}"
  "API_PORT=${FREE_PORTS[3]}"
  "ANALYTICS_PORT=${FREE_PORTS[4]}"
  "INBUCKET_PORT=${FREE_PORTS[5]}"
)

# Check if .env exists and if any of the port vars are already set
OVERWRITE=false
if [ -f "$ENV_FILE" ]; then
  FOUND_EXISTING=false
  for VAR in "${PORT_VARS[@]}"; do
    VAR_NAME=$(echo "$VAR" | cut -d= -f1)
    if grep -q "^$VAR_NAME=" "$ENV_FILE"; then
      FOUND_EXISTING=true
      break
    fi
  done

  if [ "$FOUND_EXISTING" = true ]; then
    echo "Some port variables already exist in $ENV_FILE."
    read -p "Do you want to overwrite them? (y/N): " CONFIRM
    if [[ "$CONFIRM" =~ ^[Yy]$ ]]; then
      OVERWRITE=true
    else
      echo "Aborting update to $ENV_FILE."
      exit 0
    fi
  else
    OVERWRITE=true
  fi
else
  # .env does not exist, create it
  touch "$ENV_FILE"
  OVERWRITE=true
fi

if [ "$OVERWRITE" = true ]; then
  # Remove existing port assignments from .env
  for VAR in "${PORT_VARS[@]}"; do
    VAR_NAME=$(echo "$VAR" | cut -d= -f1)
    sed -i "/^$VAR_NAME=/d" "$ENV_FILE"
  done

  # Add a section header if not present
  if ! grep -q "^## Ports" "$ENV_FILE"; then
    echo -e "\n## Ports" >> "$ENV_FILE"
  fi

  # Append the new port assignments
  for VAR in "${PORT_VARS[@]}"; do
    echo "$VAR" >> "$ENV_FILE"
  done

  echo ".env file updated with port assignments."
  echo "NEXTJS_APP_PORT=${FREE_PORTS[0]}"
  echo "STUDIO_PORT=${FREE_PORTS[1]}"
  echo "DB_PORT=${FREE_PORTS[2]}"
  echo "API_PORT=${FREE_PORTS[3]}"
  echo "ANALYTICS_PORT=${FREE_PORTS[4]}"
  echo "INBUCKET_PORT=${FREE_PORTS[5]}"
  echo "NEXTJS_APP_PORT=${FREE_PORTS[0]}"
fi



