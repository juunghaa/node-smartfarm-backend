const { pool } = require("../db/pool");
const { getGreenhouseId } = require("../utils/requestUtils");

async function requireGreenhouseAccess(req, res, next) {
  try {
    const greenhouseId = getGreenhouseId(req.query) ?? getGreenhouseId(req.body);
    if (!greenhouseId) {
      return res.status(400).json({ error: "greenhouseId is required" });
    }

    const userId = req.auth?.userId;
    if (!userId) {
      return res.status(401).json({ ok: false, error: "인증 정보가 없습니다." });
    }

    const { rows } = await pool.query(
      `SELECT greenhouse_id, user_id
       FROM greenhouses
       WHERE greenhouse_id = $1`,
      [greenhouseId]
    );

    if (rows.length === 0) {
      req.greenhouseAccess = { greenhouseId, exists: false };
      return next();
    }

    if (rows[0].user_id !== userId) {
      return res.status(403).json({ ok: false, error: "이 온실에 접근할 권한이 없습니다." });
    }

    req.greenhouseAccess = { greenhouseId, exists: true };
    return next();
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
}

module.exports = { requireGreenhouseAccess };
