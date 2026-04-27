const { pool } = require("../db/pool");
const { requireGreenhouseId } = require("../utils/requestUtils");

async function getGreenhouse(req, res) {
  try {
    const greenhouseId = requireGreenhouseId(req.query, res);
    if (!greenhouseId) return;

    const { rows } = await pool.query(
      `SELECT * FROM greenhouses WHERE greenhouse_id = $1`,
      [greenhouseId]
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

    const { rows } = await pool.query(
      `INSERT INTO greenhouses (greenhouse_id, plant_type, location_type, use_sensor, lat, lon)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (greenhouse_id)
       DO UPDATE SET
         plant_type    = EXCLUDED.plant_type,
         location_type = EXCLUDED.location_type,
         use_sensor    = EXCLUDED.use_sensor,
         lat           = EXCLUDED.lat,
         lon           = EXCLUDED.lon
       RETURNING *`,
      [greenhouseId, plantType, locationType, use_sensor, lat, lon]
    );
    res.json(rows[0]);
  } catch (e) {
    console.error("/api/greenhouse POST error:", e.message);
    res.status(500).json({ error: e.message });
  }
}

module.exports = { getGreenhouse, upsertGreenhouse };
