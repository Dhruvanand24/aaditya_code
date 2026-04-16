const state = {
  monitors: [],
  dashboard: null
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
    downUrls: 0
  };

  elements.totalUrls.textContent = String(dashboard.totalUrls);
  elements.upUrls.textContent = String(dashboard.upUrls);
  elements.downUrls.textContent = String(dashboard.downUrls);
}

function renderMonitorsTable() {
  elements.monitorsBody.innerHTML = "";

  if (!state.monitors.length) {
    const row = document.createElement("tr");
    row.innerHTML = '<td colspan="6">No monitors yet. Create one above.</td>';
    elements.monitorsBody.appendChild(row);
    return;
  }

  const dashboardUrls = (state.dashboard && state.dashboard.urls) || [];

  state.monitors.forEach((monitor) => {
    const row = elements.template.content.firstElementChild.cloneNode(true);
    const dashboardMatch = dashboardUrls.find(
      (item) => item.urlId === monitor._id
    );

    row.querySelector(".name").textContent = monitor.name || "-";
    row.querySelector(".url").textContent = monitor.url;
    row.querySelector(".interval").textContent = `${monitor.checkInterval}s`;

    const currentStatus = (dashboardMatch && dashboardMatch.currentStatus) || "down";
    const statusCell = row.querySelector(".status");
    statusCell.textContent = currentStatus.toUpperCase();
    statusCell.className = `status ${statusClass(currentStatus)}`;

    row.querySelector(".last-checked").textContent = formatDate(
      dashboardMatch && dashboardMatch.lastCheckedTime
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
  renderMonitorsTable();
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
        addEventLine(`${data.url} changed to ${data.newStatus.toUpperCase()}`);
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
