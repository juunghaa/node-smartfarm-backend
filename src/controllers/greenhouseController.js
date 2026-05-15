const { pool } = require("../db/pool");
const { requireGreenhouseId, getGreenhouseId } = require("../utils/requestUtils");

async function listMyGreenhouses(req, res) {
  try {
    const userId = req.auth?.userId;
    const { rows } = await pool.query(
      `SELECT *
       FROM greenhouses
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );
    res.json(rows);
  } catch (e) {
    console.error("/api/greenhouses GET error:", e.message);
    res.status(500).json({ error: e.message });
  }
}

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

async function deleteGreenhouse(req, res) {
  let client;
  try {
    const greenhouseId = getGreenhouseId(req.body) ?? getGreenhouseId(req.query);
    if (!greenhouseId) {
      return res.status(400).json({ error: "greenhouseId is required" });
    }

    client = await pool.connect();
    await client.query("BEGIN");

    await client.query(`DELETE FROM sensor_readings WHERE greenhouse_id = $1`, [greenhouseId]);
    await client.query(`DELETE FROM weather_logs WHERE greenhouse_id = $1`, [greenhouseId]);
    await client.query(`DELETE FROM alert_logs WHERE greenhouse_id = $1`, [greenhouseId]);
    await client.query(`DELETE FROM actuator_logs WHERE greenhouse_id = $1`, [greenhouseId]);
    await client.query(`DELETE FROM daily_reports WHERE greenhouse_id = $1`, [greenhouseId]);
    await client.query(`DELETE FROM user_plants WHERE greenhouse_id = $1`, [greenhouseId]);

    const { rowCount } = await client.query(
      `DELETE FROM greenhouses WHERE greenhouse_id = $1 AND user_id = $2`,
      [greenhouseId, req.auth?.userId]
    );

    if (rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ ok: false, error: "greenhouseId not found" });
    }

    await client.query("COMMIT");
    return res.json({ ok: true, greenhouseId });
  } catch (e) {
    if (client) {
      try {
        await client.query("ROLLBACK");
      } catch {
        // ignore rollback error
      }
    }
    console.error("/api/greenhouse DELETE error:", e.message);
    return res.status(500).json({ error: e.message });
  } finally {
    if (client) client.release();
  }
}

module.exports = { listMyGreenhouses, getGreenhouse, upsertGreenhouse, deleteGreenhouse };
