#!/bin/bash
set -e

echo "[TEST] Triggering 3-hop AML cycle scenario..."
curl -s -X POST http://localhost:8081/compliance/demo/seed-aml-scenarios \
  -H "Authorization: Basic c2FyYWhfY29tcGxpYW5jZTpwYXNzd29yZDEyMw=="
echo "\n[TEST] Scenario seeded successfully."
