#!/usr/bin/env sh

BASE_URL="${BASE_URL:-http://localhost:3000}"

echo "Running non-destructive API checks on ${BASE_URL}"
echo

sh tests/get_urls.sh
sh tests/get_dashboard.sh

if [ -n "${URL_ID}" ]; then
  sh tests/get_status.sh
else
  echo "Skipping status test: URL_ID not set"
fi
