#!/usr/bin/env sh

BASE_URL="${BASE_URL:-http://localhost:3000}"

if [ -z "${URL_ID}" ]; then
  echo "URL_ID is required. Example:"
  echo "export URL_ID=YOUR_MONGO_OBJECT_ID"
  exit 1
fi

echo "DELETE ${BASE_URL}/urls/${URL_ID}"
curl -sS -X DELETE "${BASE_URL}/urls/${URL_ID}"
echo
