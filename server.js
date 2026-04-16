require("dotenv").config();

const http = require("http");
const mongoose = require("mongoose");
const app = require("./src/app");
const connectDB = require("./src/config/db");
const healthCheckScheduler = require("./src/jobs/healthCheckScheduler");
const websocketService = require("./src/services/websocketService");
const logger = require("./src/utils/logger");

const PORT = Number(process.env.PORT) || 3000;

async function startServer() {
  await connectDB();

  const server = http.createServer(app);
  websocketService.initialize(server);

  await healthCheckScheduler.start();

  server.listen(PORT, () => {
    logger.info(`Server listening on port ${PORT}`);
  });

  const shutdown = async (signal) => {
    logger.warn(`${signal} received. Starting graceful shutdown...`);

    healthCheckScheduler.stop();

    server.close(async () => {
      await mongoose.connection.close();
      logger.info("HTTP server and MongoDB connection closed");
      process.exit(0);
    });

    setTimeout(() => {
      logger.error("Forced shutdown after timeout");
      process.exit(1);
    }, 10000);
  };

  process.on("SIGINT", () => {
    shutdown("SIGINT").catch((error) => {
      logger.error("Graceful shutdown failed", error.message);
      process.exit(1);
    });
  });

  process.on("SIGTERM", () => {
    shutdown("SIGTERM").catch((error) => {
      logger.error("Graceful shutdown failed", error.message);
      process.exit(1);
    });
  });
}

startServer().catch((error) => {
  logger.error("Failed to start server", error.message);
  process.exit(1);
});
