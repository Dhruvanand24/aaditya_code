# User Manual: Frontend Testing Guide

This guide explains how to verify the URL monitoring system using the frontend UI.

## 1) Prerequisites

Make sure the following are installed/running:

- Node.js (18+ recommended)
- npm
- MongoDB (local instance)

## 2) Start MongoDB

Start MongoDB locally.

Example connection URI expected by the app:

`mongodb://127.0.0.1:27017/uptime_monitor`

## 3) Initialize project (first time only)

From project root:

```bash
sh dev-init.sh
```

This installs dependencies and creates `.env` if missing.

## 4) Start backend server

```bash
npm start
```

Wait until you see logs indicating:

- MongoDB connected
- Server listening on port (default `3000`)

## 5) Open frontend

Open in browser:

[http://localhost:3000](http://localhost:3000)

You should see:

- **Add Monitor** form
- **Summary** cards (Total / UP / DOWN)
- **Monitors** table
- **Selected Monitor Status** panel
- **Live Events** section

## 6) Test monitor creation

In **Add Monitor**:

1. URL: `https://example.com`
2. Name: `Example`
3. Check Interval: `15`
4. Click **Create Monitor**

Expected:

- New row appears in **Monitors**
- **Total** increases
- Live event shows monitor creation
- Status eventually updates after checks run

## 7) Test with UP and DOWN URLs

Create two monitors:

### A) UP monitor

- URL: `https://example.com`
- Interval: `15`

Expected:

- Status should become **UP** after checks

### B) DOWN monitor

- URL: `http://localhost:9999/nonexistent`
- Interval: `15`

Expected:

- Status should become **DOWN**
- DOWN count should increase

## 8) Test dashboard summary

Click **Refresh Dashboard**.

Expected:

- **Total** = total monitors created
- **UP** = active reachable URLs
- **DOWN** = unreachable/error URLs

## 9) Test status details for one monitor

In a monitor row, click **View Status**.

Expected in **Selected Monitor Status**:

- `uptimePercentage`
- `averageResponseTime`
- `last10Checks` array
- `metricWindow` (last24h or fallback)

## 10) Test interval update from frontend

In monitor row, click **Set Interval** and enter `30`.

Expected:

- Row interval updates to `30s`
- Future checks happen less frequently
- Live event feed logs interval update action

## 11) Test delete monitor

In monitor row, click **Delete** and confirm.

Expected:

- Row removed from table
- Dashboard counters update
- Monitor no longer checked in background

## 12) Test real-time updates (WebSocket)

Keep frontend open and change URL behavior:

- Keep one good URL and one bad URL as above
- Wait for checks to run

Expected:

- **Live Events** updates automatically when status changes
- Table status refreshes without page reload

## 13) Optional webhook verification

If you want to verify webhook alert behavior:

1. Run a local webhook receiver on another port (for example, `4000`)
2. Create monitor with `webhookUrl` like:
   - `http://localhost:4000/webhook`
3. Make monitored URL go DOWN

Expected:

- Server sends POST webhook on DOWN transition
- Retries once if webhook call fails

## 14) Basic validation checks from UI

Try invalid inputs:

- Invalid URL text (e.g., `abc`)
- Interval below 10

Expected:

- API rejects invalid requests
- UI shows error alert message

## 15) Troubleshooting

### Frontend page not loading

- Confirm server is running on port `3000`
- Open [http://localhost:3000/health](http://localhost:3000/health), should return `{ "status": "ok" }`

### No status updates

- Confirm MongoDB is running
- Confirm monitor exists in table
- Wait at least one check interval
- Use shorter interval (e.g., 15 sec) for testing

### WebSocket events not appearing

- Keep browser tab open
- Check server logs for websocket client connect/disconnect
- Refresh page once to reconnect socket

## 16) Quick test checklist

- [ ] App opens at `http://localhost:3000`
- [ ] Can create monitor
- [ ] Can view monitor in table
- [ ] Dashboard counts update correctly
- [ ] View Status shows uptime/avg/last10 checks
- [ ] Can update interval
- [ ] Can delete monitor
- [ ] Live Events shows status transitions

