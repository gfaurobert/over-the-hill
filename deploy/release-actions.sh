#!/usr/bin/env sh
# Runs all optional release scripts on the deployment server.
# Looks for shell scripts in deploy/release-scripts and executes each one.
# If there are no scripts, exits successfully with a message.

set -eu

PROJECT_ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
cd "$PROJECT_ROOT"

SCRIPTS_DIR="deploy/release-scripts"

if [ ! -d "$SCRIPTS_DIR" ]; then
  echo "No release actions to perform (directory $SCRIPTS_DIR does not exist)."
  exit 0
fi

set +e
scripts=$(find "$SCRIPTS_DIR" -maxdepth 1 -type f -name '*.sh' | sort)
set -e

if [ -z "$scripts" ]; then
  echo "No release actions to perform (no scripts in $SCRIPTS_DIR)."
  exit 0
fi

echo "Running release actions from $SCRIPTS_DIR..."

for script in $scripts; do
  echo "Running release script: $script"
  sh "$script"
  echo "Finished release script: $script"
done

echo "All release scripts completed successfully."
