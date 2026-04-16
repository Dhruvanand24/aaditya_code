# API Curl Test Scripts

These shell scripts help you quickly test the uptime monitoring API endpoints.

## Prerequisites

- Server running on `http://localhost:3000` (or set `BASE_URL`)
- `curl` installed

## Environment variables

You can export these before running scripts:

- `BASE_URL` (default: `http://localhost:3000`)
- `URL_ID` (required for update/delete/status scripts)

Example:

```bash
export BASE_URL=http://localhost:3000
export URL_ID=YOUR_MONGO_OBJECT_ID
```

## Scripts

- `tests/create_url.sh`
- `tests/get_urls.sh`
- `tests/update_url.sh`
- `tests/delete_url.sh`
- `tests/get_status.sh`
- `tests/get_dashboard.sh`
- `tests/run_all.sh` (runs non-destructive checks)

## Run examples

```bash
sh tests/create_url.sh
sh tests/get_urls.sh
sh tests/get_dashboard.sh
sh tests/get_status.sh
sh tests/update_url.sh
sh tests/delete_url.sh
```
