function isValidHttpUrl(value) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch (_error) {
    return false;
  }
}

function normalizeCheckInterval(rawValue, fallback = 60) {
  if (rawValue === undefined || rawValue === null || rawValue === "") {
    return fallback;
  }

  const parsed = Number(rawValue);
  if (!Number.isInteger(parsed) || parsed < 10) {
    return null;
  }
  return parsed;
}

module.exports = {
  isValidHttpUrl,
  normalizeCheckInterval
};
