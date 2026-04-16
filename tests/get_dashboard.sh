#!/usr/bin/env sh

BASE_URL="${BASE_URL:-http://localhost:3000}"

echo "GET ${BASE_URL}/dashboard"
curl -sS "${BASE_URL}/dashboard"
echo
