# Uptime Monitor API

A minimal, production-ready, local-first backend for real-time URL health monitoring (Uptime Robot-like).

## Tech Stack

- Node.js + Express.js
- MongoDB + Mongoose
- WebSocket with `ws`
- HTTP checks and webhook delivery using `axios`
- In-process scheduler using `setTimeout`

## Features

- URL monitor CRUD:
  - `POST /urls`
  - `GET /urls`
  - `PUT /urls/:id`
  - `DELETE /urls/:id`
- Continuous URL health checks per configured interval
- Persists checks (status, response time, timestamp)
- Status analytics endpoint:
  - `GET /status/:urlId`
- Dashboard endpoint:
  - `GET /dashboard`
- Real-time status-change broadcast over WebSocket
- Down alerts to optional webhook URL (retry once on failure)
- Centralized error handling and basic structured logging

## Project Structure

```text
/project-root
  package.json
  .env.example
  README.md
  dev-init.sh
  server.js
  /public
    index.html
    app.js
    styles.css
  /src
    app.js
    /config
      db.js
    /models
      Url.js
      Check.js
    /routes
      urlRoutes.js
      statusRoutes.js
    /controllers
      urlController.js
      statusController.js
    /services
      httpCheckerService.js
      webhookService.js
      websocketService.js
    /jobs
      healthCheckScheduler.js
    /middleware
      errorHandler.js
      notFound.js
    /utils
      AppError.js
      asyncHandler.js
      logger.js
      validators.js
  /tests
    README.md
    create_url.sh
    get_urls.sh
    update_url.sh
    delete_url.sh
    get_status.sh
    get_dashboard.sh
    run_all.sh
```

## Prerequisites

- Node.js 18+ (Node.js 20 recommended)
- MongoDB running locally (default port `27017`)

## Quick Start

### Option A: One command init

```bash
sh dev-init.sh
```

Then start:

```bash
npm start
```

### Option B: Manual setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Create env file:
   ```bash
   cp .env.example .env
   ```
3. Start server:
   ```bash
   npm start
   ```
4. Open frontend:
   - [http://localhost:3000](http://localhost:3000)

## Environment Variables

From `.env.example`:

```env
PORT=3000
MONGODB_URI=mongodb://127.0.0.1:27017/uptime_monitor
NODE_ENV=development
```

## API Reference

### Health

- `GET /health`

### URLs

- `POST /urls`
  - Body:
    - `url` (required, valid http/https)
    - `name` (optional)
    - `checkInterval` (optional, default 60, min 10 seconds)
    - `webhookUrl` (optional, valid http/https)

- `GET /urls`

- `PUT /urls/:id`
  - Body can include any updatable fields from create payload.

- `DELETE /urls/:id`

## Frontend Dashboard

The same Express server now serves a basic frontend from `public/`.

- URL: [http://localhost:3000](http://localhost:3000)
- Includes:
  - Create monitor form
  - Monitor table with actions (view status, set interval, delete)
  - Dashboard counters (total/up/down)
  - Live status change event feed via WebSocket

### Status & Dashboard

- `GET /status/:urlId`
  - Returns:
    - uptime percentage (last 24h, fallback to last 100 checks)
    - average response time
    - last 10 checks

- `GET /dashboard`
  - Returns:
    - total URLs
    - number of UP URLs
    - number of DOWN URLs
    - URL list with latest status and last checked time

## Real-time WebSocket

Connect to:

```text
ws://localhost:3000
```

Emits `status-change` events when status transitions:

```json
{
  "event": "status-change",
  "data": {
    "urlId": "64f...",
    "url": "https://example.com",
    "newStatus": "down",
    "timestamp": "2026-04-16T10:00:00.000Z"
  }
}
```

## Webhook Alerts

When a monitor goes DOWN and has `webhookUrl`, a POST is sent with payload:

```json
{
  "url": "https://example.com",
  "status": "down",
  "timestamp": "2026-04-16T10:00:00.000Z"
}
```

Behavior:

- Retries once if first webhook request fails.
- 5-second timeout on webhook delivery.

## Test Scripts

Use the shell scripts in `tests/`:

```bash
sh tests/create_url.sh
sh tests/get_urls.sh
sh tests/get_dashboard.sh

export URL_ID=<your_url_id>
sh tests/get_status.sh
sh tests/update_url.sh
sh tests/delete_url.sh
```

Run non-destructive batch checks:

```bash
sh tests/run_all.sh
```

See `tests/README.md` for script details.

## Notes

- All checks use a 5-second timeout.
- HTTP 200-399 is considered UP; anything else is DOWN.
- Scheduler runs in-process and reconfigures when monitors are created/updated/deleted.
