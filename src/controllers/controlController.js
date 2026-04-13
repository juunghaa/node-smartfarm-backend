// src/controllers/controlController.js
const { publishCommand } = require("../services/mqttService");
const { pool } = require("../db/pool");

async function manualControl(req, res) {
  try {
    const { greenhouseId = "gh1", actuator, action } = req.body;

    const allowed = ["pump", "led", "window"];
    if (!allowed.includes(actuator)) {
      return res.status(400).json({ error: "Invalid actuator" });
    }
    if (!["ON", "OFF", "OPEN", "CLOSE"].includes(action)) {
      return res.status(400).json({ error: "Invalid action" });
    }

    publishCommand(actuator, { action });

    await pool.query(
      `INSERT INTO actuator_logs (greenhouse_id, actuator, action, duration_ms)
       VALUES ($1, $2, $3, $4)`,
      [greenhouseId, actuator, action, null]
    );

    res.json({ ok: true, actuator, action });
  } catch (e) {
    console.error("/api/control error:", e.message);
    res.status(500).json({ error: e.message });
  }
}

module.exports = { manualControl };
