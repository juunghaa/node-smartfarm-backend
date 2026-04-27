// src/controllers/reportController.js
const { pool } = require("../db/pool");
const { saveReport } = require("../services/reportService");
const { requireGreenhouseId, clampInt } = require("../utils/requestUtils");

// GET /api/reports — 리포트 히스토리 조회
async function getReports(req, res) {
  try {
    const greenhouseId = requireGreenhouseId(req.query, res);
    if (!greenhouseId) return;
    const safeLimit = clampInt(req.query.limit, 7, 1, 30);

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
    const greenhouseId = requireGreenhouseId(req.query, res);
    if (!greenhouseId) return;
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
    const greenhouseId = requireGreenhouseId(req.body, res);
    if (!greenhouseId) return;
    const reportText = await saveReport(greenhouseId);
    res.json({ ok: true, reportText });
  } catch (e) {
    console.error("/api/reports/generate error:", e.message);
    res.status(500).json({ error: e.message });
  }
}

module.exports = { getReports, getTodayReport, generateNow };
