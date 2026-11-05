#!/bin/bash
set -e

echo "[TEST] Checking Spring Boot Actuator Health..."
curl -s http://localhost:8081/actuator/health | grep "UP"
echo "\n[TEST] Health endpoint is UP."
