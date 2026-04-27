// src/controllers/controlController.js
const { publishCommand } = require("../services/mqttService");
const { pool } = require("../db/pool");
const { requireGreenhouseId } = require("../utils/requestUtils");

const ALLOWED_ACTUATORS = ["pump", "led", "window"];
const ALLOWED_ACTIONS = ["ON", "OFF", "OPEN", "CLOSE"];

async function manualControl(req, res) {
  try {
    const greenhouseId = requireGreenhouseId(req.body, res);
    if (!greenhouseId) return;

    const { actuator, action } = req.body;

    if (!ALLOWED_ACTUATORS.includes(actuator)) {
      return res.status(400).json({ error: "Invalid actuator" });
    }
    if (!ALLOWED_ACTIONS.includes(action)) {
      return res.status(400).json({ error: "Invalid action" });
    }

    publishCommand(greenhouseId, actuator, { action });

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
