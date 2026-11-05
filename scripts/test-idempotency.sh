#!/bin/bash
set -e

KEY="test-idemp-$(date +%s)"
echo "[TEST] Executing first run with key $KEY..."
curl -s -X POST http://localhost:8081/journal/transfer \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: $KEY" \
  -H "Authorization: Basic YWxpY2U6cGFzc3dvcmQxMjM=" \
  -d '{"sourceAccountId":1,"destinationAccountId":2,"amount":50.00,"currency":"USD"}'

echo "\n[TEST] Executing duplicate replay (should return 200 cached)..."
curl -s -X POST http://localhost:8081/journal/transfer \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: $KEY" \
  -H "Authorization: Basic YWxpY2U6cGFzc3dvcmQxMjM=" \
  -d '{"sourceAccountId":1,"destinationAccountId":2,"amount":50.00,"currency":"USD"}'

echo "\n[TEST] Executing tampered payload (should return 422 hash mismatch)..."
curl -s -X POST http://localhost:8081/journal/transfer \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: $KEY" \
  -H "Authorization: Basic YWxpY2U6cGFzc3dvcmQxMjM=" \
  -d '{"sourceAccountId":1,"destinationAccountId":2,"amount":999.00,"currency":"USD"}'
