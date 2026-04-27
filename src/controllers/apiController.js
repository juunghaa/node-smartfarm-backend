// API 쿼리 처리 담당 

const { pool } = require("../db/pool");
const { requireGreenhouseId, clampInt } = require("../utils/requestUtils");

async function getLatest(req, res) {
  try {
    const greenhouseId = requireGreenhouseId(req.query, res);
    if (!greenhouseId) return;

    const { rows } = await pool.query(
      `select greenhouse_id, temperature, humidity, soil_moisture, ts
       from sensor_readings
       where greenhouse_id = $1
       order by ts desc
       limit 1`,
      [greenhouseId]
    );

    res.json(rows[0] ?? null);
  } catch (e) {
    console.error("/api/latest error:", e.message);
    res.status(500).json({ error: e.message });
  }
}

async function getHistory(req, res) {
  try {
    const greenhouseId = requireGreenhouseId(req.query, res);
    if (!greenhouseId) return;
    const safeMinutes = clampInt(req.query.minutes, 60, 1, 24 * 60);

    const { rows } = await pool.query(
      `select greenhouse_id, temperature, humidity, soil_moisture, ts
       from sensor_readings
       where greenhouse_id = $1
         and ts >= now() - ($2::text || ' minutes')::interval
       order by ts asc`,
      [greenhouseId, String(safeMinutes)]
    );

    res.json(rows);
  } catch (e) {
    console.error("/api/history error:", e.message);
    res.status(500).json({ error: e.message });
  }
}

async function getActuators(req, res) {
  try {
    const greenhouseId = requireGreenhouseId(req.query, res);
    if (!greenhouseId) return;

    const { rows } = await pool.query(
      `select greenhouse_id, actuator, action, duration_ms, ts
       from actuator_logs
       where greenhouse_id = $1
       order by ts desc
       limit 50`,
      [greenhouseId]
    );

    res.json(rows);
  } catch (e) {
    console.error("/api/actuators error:", e.message);
    res.status(500).json({ error: e.message });
  }
}

module.exports = {
  getLatest,
  getHistory,
  getActuators,
};
