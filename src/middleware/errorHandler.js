const logger = require("../utils/logger");

function errorHandler(err, _req, res, _next) {
  if (err && err.code === 11000) {
    return res.status(409).json({
      success: false,
      message: "Duplicate value: URL already exists"
    });
  }

  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  if (statusCode >= 500) {
    logger.error(message, err.stack);
  } else {
    logger.warn(message);
  }

  res.status(statusCode).json({
    success: false,
    message
  });
}

module.exports = errorHandler;
