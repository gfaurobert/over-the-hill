#!/usr/bin/env sh
# Run pending SQL migrations with psql, tracking status in migrationsStatus.csv.
# Loads DATABASE_URL from .env at project root.
#
# In .env add (do not commit the real password):
#   DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@127.0.0.1:54322/postgres
#
# Usage (from project root):
#   ./supabase/scripts/runMigrations.sh

set -e

MIGRATIONS_DIR="supabase/migrations"
STATUS_CSV="${MIGRATIONS_DIR}/migrationsStatus.csv"

# Load .env from project root (script is run from project root)
if [ ! -f .env ]; then
  echo "Error: .env not found. Run this script from the project root."
  exit 1
fi
set -a
. ./.env
set +a

if [ -z "${DATABASE_URL}" ]; then
  echo "Error: DATABASE_URL is not set in .env. Example:"
  echo "  DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@127.0.0.1:54322/postgres"
  exit 1
fi

ensure_status_csv() {
  if [ -f "${STATUS_CSV}" ]; then
    return 0
  fi

  mkdir -p "${MIGRATIONS_DIR}"
  printf '%s\n' "fileName,migrated,migratedAt" > "${STATUS_CSV}"

  set +e
  files=$(ls -1 "${MIGRATIONS_DIR}"/*.sql 2>/dev/null | xargs -n 1 basename | sort -V)
  set -e

  if [ -n "${files}" ]; then
    for name in ${files}; do
      printf '%s\n' "${name},true," >> "${STATUS_CSV}"
    done
  fi
}

normalize_status_csv() {
  tmp="${STATUS_CSV}.tmp"
  files_tmp="${STATUS_CSV}.files.tmp"

  set +e
  ls -1 "${MIGRATIONS_DIR}"/*.sql 2>/dev/null | xargs -n 1 basename | sort -V > "${files_tmp}"
  set -e

  awk -F',' '
    function trim_cr(s) { sub(/\r$/, "", s); return s }
    BEGIN { OFS=","; print "fileName,migrated,migratedAt" }
    NR==1 { next }
    FNR==NR {
      fn=trim_cr($1); mig=trim_cr($2); at=trim_cr($3)
      if (fn!="") { migrated[fn]=mig; migratedAt[fn]=at; known[fn]=1 }
      next
    }
    {
      fn=trim_cr($1)
      if (fn=="") next
      if (!known[fn]) { migrated[fn]="true"; migratedAt[fn]="" }
      print fn, migrated[fn], migratedAt[fn]
      printed[fn]=1
    }
    END {
      for (fn in known) {
        if (!printed[fn]) print fn, migrated[fn], migratedAt[fn]
      }
    }
  ' "${STATUS_CSV}" "${files_tmp}" > "${tmp}"

  mv "${tmp}" "${STATUS_CSV}"
  rm -f "${files_tmp}"
}

pending_from_status_csv() {
  awk -F',' 'NR==1{next} $2=="false"{sub(/\r$/, "", $1); print $1}' "${STATUS_CSV}" | sort -V
}

mark_migrated() {
  file_name="$1"
  migrated_at="$2"

  tmp="${STATUS_CSV}.tmp"

  awk -F',' -v target="${file_name}" -v at="${migrated_at}" '
    BEGIN { OFS="," }
    NR==1 { print $0; next }
    {
      fn=$1; sub(/\r$/, "", fn)
      if (fn==target) { print fn, "true", at; next }
      print $0
    }
  ' "${STATUS_CSV}" > "${tmp}"

  mv "${tmp}" "${STATUS_CSV}"
}

ensure_status_csv
normalize_status_csv

pending=$(pending_from_status_csv)
if [ -z "${pending}" ]; then
  echo "No pending migrations."
  exit 0
fi

count=$(printf '%s\n' "${pending}" | wc -l | xargs)
echo "Running ${count} migration(s)..."

for name in ${pending}; do
  path="${MIGRATIONS_DIR}/${name}"
  if [ ! -f "${path}" ]; then
    echo "Error: migration file listed as pending but missing on disk: ${path}"
    exit 1
  fi

  echo "Running: ${name}"
  psql "${DATABASE_URL}" -v ON_ERROR_STOP=1 -f "${path}"

  migrated_at=$(date -u +%Y-%m-%dT%H:%M:%SZ)
  mark_migrated "${name}" "${migrated_at}"
  echo "Applied: ${name}"
done

echo "All migrations applied successfully."
