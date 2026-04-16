const state = {
  monitors: [],
  dashboard: null,
  selectedStatus: null
};

const elements = {
  form: document.getElementById("monitor-form"),
  monitorsBody: document.getElementById("monitors-body"),
  statusOutput: document.getElementById("status-output"),
  eventsList: document.getElementById("events-list"),
  refreshMonitors: document.getElementById("refresh-monitors"),
  refreshDashboard: document.getElementById("refresh-dashboard"),
  totalUrls: document.getElementById("totalUrls"),
  upUrls: document.getElementById("upUrls"),
  downUrls: document.getElementById("downUrls"),
  checks24h: document.getElementById("checks24h"),
  uptime24h: document.getElementById("uptime24h"),
  avgResponse24h: document.getElementById("avgResponse24h"),
  selectedWindow: document.getElementById("selected-window"),
  selectedUptime: document.getElementById("selected-uptime"),
  selectedResponse: document.getElementById("selected-response"),
  uptimeChart: document.getElementById("uptime-chart"),
  latencyChart: document.getElementById("latency-chart"),
  selectedChart: document.getElementById("selected-chart"),
  template: document.getElementById("monitor-row-template")
};

function formatDate(value) {
  if (!value) {
    return "-";
  }
  return new Date(value).toLocaleString();
}

function statusClass(status) {
  return status === "up" ? "status-up" : "status-down";
}

function formatResponseTime(value) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "-";
  }
  return `${Math.round(value)}ms`;
}

function animateNumber(element, nextValue, decimals = 0, suffix = "") {
  const target = Number(nextValue);
  if (!Number.isFinite(target)) {
    element.textContent = "-";
    element.dataset.animatedValue = "0";
    return;
  }

  const previous = Number(element.dataset.animatedValue || 0);
  const duration = 320;
  const startedAt = performance.now();

  function frame(now) {
    const progress = Math.min((now - startedAt) / duration, 1);
    const eased = 1 - (1 - progress) ** 3;
    const current = previous + (target - previous) * eased;
    element.textContent = `${current.toFixed(decimals)}${suffix}`;

    if (progress < 1) {
      window.requestAnimationFrame(frame);
      return;
    }
    element.dataset.animatedValue = String(target);
  }

  window.requestAnimationFrame(frame);
}

function normalizeStatus(rawStatus) {
  if (typeof rawStatus === "string") {
    const normalized = rawStatus.toLowerCase();
    return normalized === "up" || normalized === "down" ? normalized : "down";
  }

  if (Array.isArray(rawStatus) && rawStatus.length > 0) {
    return normalizeStatus(rawStatus[0]);
  }

  if (rawStatus && typeof rawStatus === "object") {
    if (typeof rawStatus.status === "string") {
      return normalizeStatus(rawStatus.status);
    }
    if (typeof rawStatus.currentStatus === "string") {
      return normalizeStatus(rawStatus.currentStatus);
    }
  }

  return "down";
}

async function request(path, options = {}) {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...options
  });
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.message || "Request failed");
  }
  return payload;
}

async function loadMonitors() {
  const response = await request("/urls");
  state.monitors = response.data || [];
}

async function loadDashboard() {
  const response = await request("/dashboard");
  state.dashboard = response.data;
}

function renderSummary() {
  const dashboard = state.dashboard || {
    totalUrls: 0,
    upUrls: 0,
    downUrls: 0,
    checksLast24h: {
      totalChecks: 0,
      uptimePercentage: 0,
      averageResponseTime: null
    }
  };

  animateNumber(elements.totalUrls, dashboard.totalUrls, 0);
  animateNumber(elements.upUrls, dashboard.upUrls, 0);
  animateNumber(elements.downUrls, dashboard.downUrls, 0);

  const checks24h = dashboard.checksLast24h || {
    totalChecks: 0,
    uptimePercentage: 0,
    averageResponseTime: null
  };

  animateNumber(elements.checks24h, checks24h.totalChecks, 0);
  animateNumber(elements.uptime24h, checks24h.uptimePercentage, 1, "%");
  elements.avgResponse24h.textContent = formatResponseTime(checks24h.averageResponseTime);
}

function drawLineChart(canvas, points, options) {
  if (!canvas) {
    return;
  }

  const ctx = canvas.getContext("2d");
  const width = canvas.clientWidth || canvas.width;
  const height = canvas.clientHeight || canvas.height;
  canvas.width = width;
  canvas.height = height;

  ctx.clearRect(0, 0, width, height);

  const pad = { top: 20, right: 18, bottom: 28, left: 44 };
  const chartWidth = width - pad.left - pad.right;
  const chartHeight = height - pad.top - pad.bottom;
  const values = points.map((point) => point.value);
  const maxValue = Math.max(options.minMax.floor, ...values);
  const minValue = Math.min(options.minMax.floor, ...values);
  const range = Math.max(maxValue - minValue, options.minMax.step);
  const stepX = points.length > 1 ? chartWidth / (points.length - 1) : chartWidth;

  ctx.strokeStyle = "rgba(148, 170, 229, 0.24)";
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i += 1) {
    const y = pad.top + (chartHeight / 4) * i;
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(pad.left + chartWidth, y);
    ctx.stroke();
  }

  ctx.fillStyle = "#8ea3db";
  ctx.font = "12px Inter, sans-serif";
  ctx.textAlign = "right";
  ctx.fillText(options.maxLabel(maxValue), pad.left - 8, pad.top + 6);
  ctx.fillText(options.minLabel(minValue), pad.left - 8, pad.top + chartHeight);

  const chartPoints = points.map((point, index) => {
    const x = pad.left + stepX * index;
    const normalized = (point.value - minValue) / range;
    const y = pad.top + chartHeight - normalized * chartHeight;
    return { x, y, label: point.label };
  });

  const startedAt = performance.now();
  const duration = 480;

  function drawFrame(now) {
    const progress = Math.min((now - startedAt) / duration, 1);

    ctx.save();
    ctx.beginPath();
    ctx.rect(pad.left, pad.top, chartWidth * progress, chartHeight);
    ctx.clip();

    ctx.lineWidth = 2.5;
    ctx.strokeStyle = options.lineColor;
    ctx.beginPath();
    chartPoints.forEach((point, index) => {
      if (index === 0) {
        ctx.moveTo(point.x, point.y);
      } else {
        ctx.lineTo(point.x, point.y);
      }
    });
    ctx.stroke();
    ctx.restore();

    if (progress < 1) {
      window.requestAnimationFrame(drawFrame);
      return;
    }

    chartPoints.forEach((point, index) => {
      if (index % options.labelStep === 0 || index === chartPoints.length - 1) {
        ctx.fillStyle = "#9db0e6";
        ctx.textAlign = "center";
        ctx.fillText(point.label, point.x, height - 10);
      }
    });
  }

  window.requestAnimationFrame(drawFrame);
}

function renderTrendCharts() {
  const trend = (state.dashboard && state.dashboard.trend) || [];
  if (!trend.length) {
    drawLineChart(
      elements.uptimeChart,
      [{ value: 0, label: "Now" }],
      {
        lineColor: "#4fe09f",
        minMax: { floor: 0, step: 1 },
        maxLabel: (value) => `${Math.round(value)}%`,
        minLabel: (value) => `${Math.round(value)}%`,
        labelStep: 1
      }
    );
    drawLineChart(
      elements.latencyChart,
      [{ value: 0, label: "Now" }],
      {
        lineColor: "#6ea4ff",
        minMax: { floor: 0, step: 10 },
        maxLabel: (value) => `${Math.round(value)}ms`,
        minLabel: (value) => `${Math.round(value)}ms`,
        labelStep: 1
      }
    );
    return;
  }

  const uptimePoints = trend.map((bucket) => {
    const date = new Date(bucket.timestamp);
    return {
      value: Number(bucket.uptimePercentage || 0),
      label: date.toLocaleTimeString([], { hour: "2-digit" })
    };
  });
  const latencyPoints = trend.map((bucket) => {
    const date = new Date(bucket.timestamp);
    return {
      value: Number(bucket.averageResponseTime || 0),
      label: date.toLocaleTimeString([], { hour: "2-digit" })
    };
  });

  drawLineChart(elements.uptimeChart, uptimePoints, {
    lineColor: "#4fe09f",
    minMax: { floor: 0, step: 1 },
    maxLabel: (value) => `${Math.round(value)}%`,
    minLabel: (value) => `${Math.round(value)}%`,
    labelStep: 4
  });

  drawLineChart(elements.latencyChart, latencyPoints, {
    lineColor: "#6ea4ff",
    minMax: { floor: 0, step: 10 },
    maxLabel: (value) => `${Math.round(value)}ms`,
    minLabel: (value) => `${Math.round(value)}ms`,
    labelStep: 4
  });
}

function renderSelectedStatus() {
  if (!state.selectedStatus) {
    elements.selectedWindow.textContent = "-";
    elements.selectedUptime.textContent = "-";
    elements.selectedResponse.textContent = "-";
    drawLineChart(
      elements.selectedChart,
      [{ value: 0, label: "N/A" }],
      {
        lineColor: "#ff9e5f",
        minMax: { floor: 0, step: 10 },
        maxLabel: (value) => `${Math.round(value)}ms`,
        minLabel: (value) => `${Math.round(value)}ms`,
        labelStep: 1
      }
    );
    return;
  }

  const data = state.selectedStatus;
  elements.selectedWindow.textContent = data.metricWindow;
  elements.selectedUptime.textContent = `${Number(data.uptimePercentage || 0).toFixed(2)}%`;
  elements.selectedResponse.textContent = formatResponseTime(data.averageResponseTime);

  const checks = Array.isArray(data.last10Checks) ? [...data.last10Checks].reverse() : [];
  const points = checks.map((check) => ({
    value: Number(check.responseTime || 0),
    label: new Date(check.timestamp).toLocaleTimeString([], { minute: "2-digit", second: "2-digit" })
  }));

  drawLineChart(elements.selectedChart, points.length ? points : [{ value: 0, label: "N/A" }], {
    lineColor: "#ff9e5f",
    minMax: { floor: 0, step: 10 },
    maxLabel: (value) => `${Math.round(value)}ms`,
    minLabel: (value) => `${Math.round(value)}ms`,
    labelStep: 2
  });
}

function renderMonitorsTable() {
  elements.monitorsBody.innerHTML = "";

  if (!state.monitors.length) {
    const row = document.createElement("tr");
    row.innerHTML = '<td colspan="7">No monitors yet. Create one above.</td>';
    elements.monitorsBody.appendChild(row);
    return;
  }

  const dashboardUrls = (state.dashboard && state.dashboard.urls) || [];
  const dashboardById = new Map(
    dashboardUrls.map((item) => [String(item.urlId), item])
  );

  state.monitors.forEach((monitor, index) => {
    const row = elements.template.content.firstElementChild.cloneNode(true);
    row.style.animation = `fadeIn 280ms ease ${Math.min(index * 28, 280)}ms both`;
    const dashboardMatch = dashboardById.get(String(monitor._id));

    row.querySelector(".name").textContent = monitor.name || "-";
    row.querySelector(".url").textContent = monitor.url;
    row.querySelector(".interval").textContent = `${monitor.checkInterval}s`;

    const currentStatus = normalizeStatus(
      dashboardMatch && dashboardMatch.currentStatus
    );
    const statusCell = row.querySelector(".status");
    statusCell.textContent = currentStatus.toUpperCase();
    statusCell.className = `status ${statusClass(currentStatus)}`;

    row.querySelector(".last-checked").textContent = formatDate(
      dashboardMatch && dashboardMatch.lastCheckedTime
    );
    row.querySelector(".last-response").textContent = formatResponseTime(
      dashboardMatch && dashboardMatch.latestResponseTime
    );

    const actionButtons = row.querySelectorAll("button");
    actionButtons.forEach((button) => {
      button.dataset.id = monitor._id;
      button.dataset.url = monitor.url;
    });

    elements.monitorsBody.appendChild(row);
  });
}

function addEventLine(message) {
  const item = document.createElement("li");
  item.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
  elements.eventsList.prepend(item);

  while (elements.eventsList.children.length > 20) {
    elements.eventsList.removeChild(elements.eventsList.lastChild);
  }
}

async function refreshAll() {
  await Promise.all([loadMonitors(), loadDashboard()]);
  renderSummary();
  renderTrendCharts();
  renderMonitorsTable();
  renderSelectedStatus();
}

async function createMonitor(event) {
  event.preventDefault();
  const formData = new FormData(elements.form);
  const payload = {
    url: String(formData.get("url") || "").trim(),
    name: String(formData.get("name") || "").trim(),
    checkInterval: Number(formData.get("checkInterval") || 60),
    webhookUrl: String(formData.get("webhookUrl") || "").trim()
  };

  if (!payload.webhookUrl) {
    delete payload.webhookUrl;
  }
  if (!payload.name) {
    delete payload.name;
  }

  try {
    await request("/urls", {
      method: "POST",
      body: JSON.stringify(payload)
    });

    elements.form.reset();
    elements.form.checkInterval.value = "60";
    addEventLine(`Monitor created for ${payload.url}`);
    await refreshAll();
  } catch (error) {
    alert(error.message);
  }
}

async function viewStatus(urlId) {
  try {
    const response = await request(`/status/${urlId}`);
    state.selectedStatus = response.data;
    renderSelectedStatus();
    elements.statusOutput.textContent = JSON.stringify(response.data, null, 2);
  } catch (error) {
    alert(error.message);
  }
}

async function updateInterval(urlId) {
  const input = window.prompt("Enter new interval in seconds (minimum 10):");
  if (input === null) {
    return;
  }

  const checkInterval = Number(input);
  if (!Number.isInteger(checkInterval) || checkInterval < 10) {
    alert("Interval must be an integer >= 10");
    return;
  }

  try {
    await request(`/urls/${urlId}`, {
      method: "PUT",
      body: JSON.stringify({ checkInterval })
    });
    addEventLine(`Updated interval to ${checkInterval}s`);
    await refreshAll();
  } catch (error) {
    alert(error.message);
  }
}

async function deleteMonitor(urlId, url) {
  const confirmed = window.confirm(`Delete monitor for ${url}?`);
  if (!confirmed) {
    return;
  }

  try {
    await request(`/urls/${urlId}`, { method: "DELETE" });
    addEventLine(`Deleted monitor for ${url}`);
    await refreshAll();
  } catch (error) {
    alert(error.message);
  }
}

async function onActionClick(event) {
  const button = event.target.closest("button");
  if (!button) {
    return;
  }

  const action = button.dataset.action;
  const urlId = button.dataset.id;
  const url = button.dataset.url;

  if (!action || !urlId) {
    return;
  }

  if (action === "status") {
    await viewStatus(urlId);
    return;
  }

  if (action === "interval") {
    await updateInterval(urlId);
    return;
  }

  if (action === "delete") {
    await deleteMonitor(urlId, url);
  }
}

function connectWebSocket() {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const socketUrl = `${protocol}//${window.location.host}`;
  const ws = new WebSocket(socketUrl);

  ws.onopen = () => {
    addEventLine("WebSocket connected");
  };

  ws.onmessage = async (event) => {
    try {
      const payload = JSON.parse(event.data);
      if (payload.event === "status-change") {
        const data = payload.data;
        const status = normalizeStatus(data.newStatus);
        addEventLine(`${data.url} changed to ${status.toUpperCase()}`);
        await refreshAll();
      }
    } catch (_error) {
      addEventLine("Received non-JSON WebSocket message");
    }
  };

  ws.onclose = () => {
    addEventLine("WebSocket disconnected. Reconnecting in 3s...");
    setTimeout(connectWebSocket, 3000);
  };
}

function attachListeners() {
  elements.form.addEventListener("submit", createMonitor);
  elements.monitorsBody.addEventListener("click", onActionClick);
  elements.refreshMonitors.addEventListener("click", async () => {
    try {
      await loadMonitors();
      renderMonitorsTable();
    } catch (error) {
      alert(error.message);
    }
  });
  elements.refreshDashboard.addEventListener("click", async () => {
    try {
      await loadDashboard();
      renderSummary();
      renderTrendCharts();
      renderMonitorsTable();
    } catch (error) {
      alert(error.message);
    }
  });
}

async function bootstrap() {
  attachListeners();
  connectWebSocket();

  try {
    await refreshAll();
  } catch (error) {
    addEventLine(`Initial load failed: ${error.message}`);
  }
}

bootstrap();
