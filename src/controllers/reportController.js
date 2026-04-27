// src/controllers/reportController.js
const { pool } = require("../db/pool");
const { saveReport } = require("../services/reportService");

// GET /api/reports — 리포트 히스토리 조회
async function getReports(req, res) {
  try {
    const greenhouseId = req.query.greenhouseId ?? req.query.greenhouseID;
    const { limit = 7 } = req.query;
    if (!greenhouseId || typeof greenhouseId !== "string") {
      return res.status(400).json({ error: "greenhouseId is required" });
    }
    const safeLimit = Math.min(parseInt(limit) || 7, 30);

    const { rows } = await pool.query(
      `SELECT * FROM daily_reports
       WHERE greenhouse_id = $1
       ORDER BY report_date DESC
       LIMIT $2`,
      [greenhouseId, safeLimit]
    );
    res.json(rows);
  } catch (e) {
    console.error("/api/reports GET error:", e.message);
    res.status(500).json({ error: e.message });
  }
}

// GET /api/reports/today — 오늘 리포트만
async function getTodayReport(req, res) {
  try {
    const greenhouseId = req.query.greenhouseId ?? req.query.greenhouseID;
    if (!greenhouseId || typeof greenhouseId !== "string") {
      return res.status(400).json({ error: "greenhouseId is required" });
    }
    const { rows } = await pool.query(
      `SELECT * FROM daily_reports
       WHERE greenhouse_id = $1
         AND report_date = CURRENT_DATE`,
      [greenhouseId]
    );
    res.json(rows[0] ?? null);
  } catch (e) {
    console.error("/api/reports/today GET error:", e.message);
    res.status(500).json({ error: e.message });
  }
}

// POST /api/reports/generate — 수동 즉시 생성 (테스트용)
async function generateNow(req, res) {
  try {
    const greenhouseId = req.body.greenhouseId ?? req.body.greenhouseID;
    if (!greenhouseId || typeof greenhouseId !== "string") {
      return res.status(400).json({ error: "greenhouseId is required" });
    }
    const reportText = await saveReport(greenhouseId);
    res.json({ ok: true, reportText });
  } catch (e) {
    console.error("/api/reports/generate error:", e.message);
    res.status(500).json({ error: e.message });
  }
}

module.exports = { getReports, getTodayReport, generateNow };
