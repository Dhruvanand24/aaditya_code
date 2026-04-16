#!/usr/bin/env sh

BASE_URL="${BASE_URL:-http://localhost:3000}"

echo "POST ${BASE_URL}/urls"
curl -sS -X POST "${BASE_URL}/urls" \
  -H "Content-Type: application/json" \
  -d '{
    "url":"https://example.com",
    "name":"Example Monitor",
    "checkInterval":15
  }'
echo
