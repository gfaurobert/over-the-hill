#!/bin/bash

# Usage: ./svg2icons.sh input.svg base_output_name
# Example: ./svg2icons.sh logo.svg favicon

SVG="$1"
BASENAME="$2"

if [ -z "$SVG" ] || [ -z "$BASENAME" ]; then
  echo "Usage: $0 input.svg base_output_name"
  exit 1
fi

# Sizes you want for PNGs
SIZES=(16 32 48 64 128 256)

# Convert to PNGs
for SIZE in "${SIZES[@]}"; do
  convert -background none -resize ${SIZE}x${SIZE} "$SVG" "${BASENAME}-${SIZE}x${SIZE}.png"
done

# Convert to ICO (using the PNGs)
convert "${BASENAME}-16x16.png" "${BASENAME}-32x32.png" "${BASENAME}-48x48.png" "${BASENAME}.ico"

echo "Done! PNGs and ICO created." 