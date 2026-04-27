// src/controllers/weatherController.js
const { getLatestWeather } = require("../services/weatherService");

async function getWeather(req, res) {
  try {
    const greenhouseId = req.query.greenhouseId ?? req.query.greenhouseID;
    if (!greenhouseId || typeof greenhouseId !== "string") {
      return res.status(400).json({ error: "greenhouseId is required" });
    }
    const data = await getLatestWeather(greenhouseId);
    res.json(data);
  } catch (e) {
    console.error("/api/weather error:", e.message);
    res.status(500).json({ error: e.message });
  }
}

module.exports = { getWeather };
