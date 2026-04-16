const axios = require("axios");
const Check = require("../models/Check");
const webhookService = require("./webhookService");
const websocketService = require("./websocketService");
const logger = require("../utils/logger");

function normalizeStatus(value) {
  if (typeof value !== "string") {
    return "down";
  }

  return value.toLowerCase() === "up" ? "up" : "down";
}

async function performCheck(urlDoc) {
  const previousCheck = await Check.findOne({ urlId: urlDoc._id })
    .sort({ timestamp: -1 })
    .lean();

  const startedAt = Date.now();
  let status = "down";
  let responseTime = null;
  let errorMessage = null;

  try {
    const response = await axios.get(urlDoc.url, {
      timeout: 5000,
      validateStatus: () => true,
      maxRedirects: 5
    });

    responseTime = Date.now() - startedAt;
    status = response.status >= 200 && response.status <= 399 ? "up" : "down";
  } catch (error) {
    responseTime = Date.now() - startedAt;
    status = "down";
    errorMessage = error.code || error.message;
  }

  const timestamp = new Date();

  await Check.create({
    urlId: urlDoc._id,
    status,
    responseTime,
    timestamp
  });

  logger.info(
    `Checked ${urlDoc.url} -> ${status.toUpperCase()} (${responseTime}ms)`
  );

  const previousStatus = normalizeStatus(
    previousCheck && (Array.isArray(previousCheck.status) ? previousCheck.status[0] : previousCheck.status)
  );
  const statusChanged = Boolean(previousCheck) && previousStatus !== status;

  websocketService.broadcastCheckCompleted({
    urlId: urlDoc._id.toString(),
    url: urlDoc.url,
    status,
    responseTime,
    timestamp,
    statusChanged
  });

  if (statusChanged) {
    websocketService.broadcastStatusChange({
      urlId: urlDoc._id.toString(),
      url: urlDoc.url,
      newStatus: status,
      timestamp
    });
  }

  const shouldSendWebhook =
    status === "down" &&
    Boolean(urlDoc.webhookUrl) &&
    (!previousCheck || previousCheck.status !== "down");

  if (shouldSendWebhook) {
    await webhookService.sendDownAlert(urlDoc.webhookUrl, {
      url: urlDoc.url,
      status: "down",
      timestamp
    });
  }

  if (errorMessage) {
    logger.warn(`Check failure for ${urlDoc.url}: ${errorMessage}`);
  }
}

module.exports = {
  performCheck
};
