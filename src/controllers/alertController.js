const { pool } = require("../db/pool");

async function getAlerts(req, res) {
  try {
    const { greenhouseId = "gh1", limit = 20 } = req.query;
    const safeLimit = Math.min(parseInt(limit) || 20, 100);
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
