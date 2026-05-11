const { pool } = require("../db/pool");
const { requireGreenhouseId } = require("../utils/requestUtils");

async function getGreenhouse(req, res) {
  try {
    const greenhouseId = requireGreenhouseId(req.query, res);
    if (!greenhouseId) return;

    const userId = req.auth?.userId;
    const { rows } = await pool.query(
      `SELECT * FROM greenhouses
       WHERE greenhouse_id = $1 AND user_id = $2`,
      [greenhouseId, userId]
    );
    res.json(rows[0] ?? null);
  } catch (e) {
    console.error("/api/greenhouse GET error:", e.message);
    res.status(500).json({ error: e.message });
  }
}

async function upsertGreenhouse(req, res) {
  try {
    const greenhouseId = requireGreenhouseId(req.body, res);
    if (!greenhouseId) return;

    const {
      plantType = "sansevieria",
      locationType = "indoor",
      useSensor,
      use_sensor: useSensorSnake,
      lat,
      lon,
    } = req.body;
    const use_sensor = Boolean(useSensor ?? useSensorSnake ?? true);
    const userId = req.auth?.userId;

    const { rows } = await pool.query(
      `INSERT INTO greenhouses (greenhouse_id, user_id, plant_type, location_type, use_sensor, lat, lon)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (greenhouse_id)
       DO UPDATE SET
         plant_type    = EXCLUDED.plant_type,
         location_type = EXCLUDED.location_type,
         use_sensor    = EXCLUDED.use_sensor,
         lat           = EXCLUDED.lat,
         lon           = EXCLUDED.lon
       WHERE greenhouses.user_id = EXCLUDED.user_id
       RETURNING *`,
      [greenhouseId, userId, plantType, locationType, use_sensor, lat, lon]
    );

    if (rows.length === 0) {
      return res.status(403).json({ ok: false, error: "이 온실을 수정할 권한이 없습니다." });
    }

    res.json(rows[0]);
  } catch (e) {
    console.error("/api/greenhouse POST error:", e.message);
    res.status(500).json({ error: e.message });
  }
}

module.exports = { getGreenhouse, upsertGreenhouse };
