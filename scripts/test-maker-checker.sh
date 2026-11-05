#!/bin/bash
set -e

echo "[TEST] Submitting corporate wire as Maker (Alice)..."
RES=$(curl -s -X POST http://localhost:8081/corporate-wires \
  -H "Content-Type: application/json" \
  -H "Authorization: Basic YWxpY2U6cGFzc3dvcmQxMjM=" \
  -d '{"sourceAccountId":1,"destinationAccountId":2,"amount":12000.00,"description":"Q4 Cloud Infrastructure"}')
echo "$RES"
