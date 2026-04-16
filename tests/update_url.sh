#!/usr/bin/env sh

BASE_URL="${BASE_URL:-http://localhost:3000}"

if [ -z "${URL_ID}" ]; then
  echo "URL_ID is required. Example:"
  echo "export URL_ID=YOUR_MONGO_OBJECT_ID"
  exit 1
fi

echo "PUT ${BASE_URL}/urls/${URL_ID}"
curl -sS -X PUT "${BASE_URL}/urls/${URL_ID}" \
  -H "Content-Type: application/json" \
  -d '{
    "name":"Example Monitor Updated",
    "checkInterval":30
  }'
echo
