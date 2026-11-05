#!/bin/bash
set -e

echo "[TEST] Executing EOD Nostro/Vostro statement reconciliation run..."
curl -s -X POST http://localhost:8081/reconciliation/eod-statement \
  -H "Authorization: Basic c2FyYWhfY29tcGxpYW5jZTpwYXNzd29yZDEyMw=="
echo "\n[TEST] Reconciliation run executed."
