function formatMessage(level, message) {
  return `[${new Date().toISOString()}] [${level}] ${message}`;
}

const logger = {
  info(message) {
    console.log(formatMessage("INFO", message));
  },
  warn(message) {
    console.warn(formatMessage("WARN", message));
  },
  error(message, errorDetails) {
    if (errorDetails) {
      console.error(formatMessage("ERROR", `${message} - ${errorDetails}`));
      return;
    }
    console.error(formatMessage("ERROR", message));
  }
};

module.exports = logger;
