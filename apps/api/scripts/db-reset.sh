#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
API_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$API_DIR"

# Check if something is already running on port 3001
if ss -tlnp 2>/dev/null | grep -q ":3001 "; then
  echo "ERROR: Port 3001 is already in use. Stop your dev server first."
  exit 1
fi

echo "==> Removing database files..."
rm -f local.db local.db-shm local.db-wal

echo "==> Running migrations..."
pnpm drizzle-kit migrate

echo "==> Seeding database..."
pnpm tsx src/db/seed.ts

# Import CSV files from data/ if any exist
CSV_FILES=(data/*.csv)
if [ -e "${CSV_FILES[0]}" ]; then
  echo "==> Starting server for CSV import..."
  pnpm tsx src/index.ts &>/dev/null &
  SERVER_PID=$!
  sleep 2

  for csv in "${CSV_FILES[@]}"; do
    echo "    Importing $csv..."
    RESULT=$(curl -s -F "file=@$csv" http://localhost:3001/api/import/csv)
    IMPORTED=$(echo "$RESULT" | node -e "process.stdin.on('data',d=>{const r=JSON.parse(d);console.log(r.imported+' imported, '+r.skipped+' skipped, '+r.categorised+' categorised')})")
    echo "    $IMPORTED"
  done

  kill $SERVER_PID 2>/dev/null
  echo "==> Server stopped."
else
  echo "==> No CSV files in data/, skipping import."
fi

echo "==> Done!"
