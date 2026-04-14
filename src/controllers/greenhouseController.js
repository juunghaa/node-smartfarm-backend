const { pool } = require("../db/pool");

async function getGreenhouse(req, res) {
  try {
    const { greenhouseId = "gh1" } = req.query;
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
    const {
      greenhouseId = "gh1",
      plantType = "sansevieria",
      locationType = "indoor",
      lat,
      lon,
    } = req.body;

    const { rows } = await pool.query(
      `INSERT INTO greenhouses (greenhouse_id, plant_type, location_type, lat, lon)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (greenhouse_id)
       DO UPDATE SET
         plant_type    = EXCLUDED.plant_type,
         location_type = EXCLUDED.location_type,
         lat           = EXCLUDED.lat,
         lon           = EXCLUDED.lon
       RETURNING *`,
      [greenhouseId, plantType, locationType, lat, lon]
    );
    res.json(rows[0]);
  } catch (e) {
    console.error("/api/greenhouse POST error:", e.message);
    res.status(500).json({ error: e.message });
  }
}

module.exports = { getGreenhouse, upsertGreenhouse };
