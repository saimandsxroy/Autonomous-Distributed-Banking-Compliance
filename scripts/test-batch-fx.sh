#!/bin/bash
set -e

echo "[TEST] Requesting live FX quote (USD to INR)..."
curl -s "http://localhost:8081/fx/quote?from=USD&to=INR&amount=1000.00"
echo "\n[TEST] FX quote calculated."
