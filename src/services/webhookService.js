const axios = require("axios");
const logger = require("../utils/logger");

async function sendDownAlert(webhookUrl, payload) {
  const maxAttempts = 2;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await axios.post(webhookUrl, payload, { timeout: 5000 });
      logger.info(`Webhook alert sent successfully (attempt ${attempt})`);
      return;
    } catch (error) {
      logger.warn(
        `Webhook alert failed (attempt ${attempt}): ${error.message}`
      );

      if (attempt === maxAttempts) {
        logger.error("Webhook alert permanently failed", error.message);
      }
    }
  }
}

module.exports = {
  sendDownAlert
};
