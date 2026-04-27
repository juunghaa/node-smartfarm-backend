// src/controllers/weatherController.js
const { getLatestWeather } = require("../services/weatherService");
const { requireGreenhouseId } = require("../utils/requestUtils");

async function getWeather(req, res) {
  try {
    const greenhouseId = requireGreenhouseId(req.query, res);
    if (!greenhouseId) return;

    const data = await getLatestWeather(greenhouseId);
    res.json(data);
  } catch (e) {
    console.error("/api/weather error:", e.message);
    res.status(500).json({ error: e.message });
  }
}

module.exports = { getWeather };
