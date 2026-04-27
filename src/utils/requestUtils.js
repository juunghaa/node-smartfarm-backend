function getGreenhouseId(source) {
  const greenhouseId = source?.greenhouseId ?? source?.greenhouseID;
  if (typeof greenhouseId !== "string") return null;

  const trimmed = greenhouseId.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function requireGreenhouseId(source, res) {
  const greenhouseId = getGreenhouseId(source);
  if (!greenhouseId) {
    res.status(400).json({ error: "greenhouseId is required" });
    return null;
  }
  return greenhouseId;
}

function clampInt(value, fallback, min, max) {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) return fallback;
  return Math.min(Math.max(parsed, min), max);
}

module.exports = {
  getGreenhouseId,
  requireGreenhouseId,
  clampInt,
};
