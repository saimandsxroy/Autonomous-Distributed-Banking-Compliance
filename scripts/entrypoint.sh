#!/bin/sh
set -e

echo "[FourEyes SRE] Checking database readiness..."
until nc -z -v -w30 ${DB_HOST:-mysql} ${DB_PORT:-3306}
do
  echo "[FourEyes SRE] Waiting for MySQL database connection..."
  sleep 2
done

echo "[FourEyes SRE] Database is reachable. Launching FourEyes Core Banking Engine..."
exec "$@"
