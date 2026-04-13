// src/controllers/weatherController.js
const { getLatestWeather } = require("../services/weatherService");

async function getWeather(req, res) {
  try {
    const { greenhouseId = "gh1" } = req.query;
    const data = await getLatestWeather(greenhouseId);
    res.json(data);
  } catch (e) {
    console.error("/api/weather error:", e.message);
    res.status(500).json({ error: e.message });
  }
}

module.exports = { getWeather };
