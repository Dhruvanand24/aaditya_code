const axios = require("axios");
const logger = require("../utils/logger");

async function sendDownAlert(webhookUrl, payload) {
  const maxAttempts = 2;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      console.log(
        `[WEBHOOK][REQUEST] attempt=${attempt} method=POST url=${webhookUrl} payload=${JSON.stringify(
          payload
        )}`
      );
      const response = await axios.post(webhookUrl, payload, { timeout: 5000 });
      console.log(
        `[WEBHOOK][RESPONSE] attempt=${attempt} statusCode=${response.status} statusText=${response.statusText}`
      );
      logger.info(`Webhook alert sent successfully (attempt ${attempt})`);
      return;
    } catch (error) {
      const responseStatus = error.response ? error.response.status : "N/A";
      const responseBody = error.response ? JSON.stringify(error.response.data) : "N/A";
      console.log(
        `[WEBHOOK][ERROR] attempt=${attempt} statusCode=${responseStatus} message=${error.message} responseBody=${responseBody}`
      );
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
