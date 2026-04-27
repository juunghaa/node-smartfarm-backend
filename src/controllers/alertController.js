const { pool } = require("../db/pool");
const { requireGreenhouseId, clampInt } = require("../utils/requestUtils");

async function getAlerts(req, res) {
  try {
    const greenhouseId = requireGreenhouseId(req.query, res);
    if (!greenhouseId) return;
    const safeLimit = clampInt(req.query.limit, 20, 1, 100);

    const { rows } = await pool.query(
      `SELECT * FROM alert_logs
       WHERE greenhouse_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [greenhouseId, safeLimit]
    );
    res.json(rows);
  } catch (e) {
    console.error("/api/alerts GET error:", e.message);
    res.status(500).json({ error: e.message });
  }
}

module.exports = { getAlerts };
