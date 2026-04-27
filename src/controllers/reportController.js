// src/controllers/reportController.js
const {
  saveReport,
  saveDailyReport,
  getDailyReport,
  getLatestReport,
  listRecentReports,
  isValidDateString,
} = require("../services/reportService");
const { requireGreenhouseId, clampInt } = require("../utils/requestUtils");

// GET /api/reports — 리포트 히스토리 조회(기존 호환)
async function getReports(req, res) {
  try {
    const greenhouseId = requireGreenhouseId(req.query, res);
    if (!greenhouseId) return;
    const safeLimit = clampInt(req.query.limit, 7, 1, 30);

    const reports = await listRecentReports(greenhouseId, safeLimit);
    res.json(reports);
  } catch (e) {
    console.error("/api/reports GET error:", e.message);
    res.status(500).json({ error: e.message });
  }
}

// GET /api/reports/today — 오늘 리포트만(기존 호환)
async function getTodayReport(req, res) {
  try {
    const greenhouseId = requireGreenhouseId(req.query, res);
    if (!greenhouseId) return;
    const today = new Date().toISOString().slice(0, 10);
    const report = await getDailyReport(greenhouseId, today);
    res.json(report);
  } catch (e) {
    console.error("/api/reports/today GET error:", e.message);
    res.status(500).json({ error: e.message });
  }
}

// POST /api/reports/generate — 수동 즉시 생성 (기존 호환)
async function generateNow(req, res) {
  try {
    const greenhouseId = requireGreenhouseId(req.body, res);
    if (!greenhouseId) return;
    const report = await saveReport(greenhouseId);
    res.json({ ok: true, report });
  } catch (e) {
    console.error("/api/reports/generate error:", e.message);
    res.status(500).json({ error: e.message });
  }
}

// POST /api/report/daily
async function createDailyReport(req, res) {
  try {
    const greenhouseId = requireGreenhouseId(req.body, res);
    if (!greenhouseId) return;

    const { date } = req.body;
    if (!isValidDateString(date)) {
      return res.status(400).json({ error: "date는 YYYY-MM-DD 형식이어야 합니다" });
    }

    const report = await saveDailyReport(greenhouseId, date);
    res.json(report);
  } catch (e) {
    console.error("/api/report/daily POST error:", e.message);
    res.status(500).json({ error: e.message });
  }
}

// GET /api/report/daily?greenhouseId=gh1&date=2026-04-27
async function fetchDailyReport(req, res) {
  try {
    const greenhouseId = requireGreenhouseId(req.query, res);
    if (!greenhouseId) return;

    const { date } = req.query;
    if (!isValidDateString(date)) {
      return res.status(400).json({ error: "date는 YYYY-MM-DD 형식이어야 합니다" });
    }

    const report = await getDailyReport(greenhouseId, date);
    res.json(report);
  } catch (e) {
    console.error("/api/report/daily GET error:", e.message);
    res.status(500).json({ error: e.message });
  }
}

// GET /api/report/latest?greenhouseId=gh1
async function fetchLatestReport(req, res) {
  try {
    const greenhouseId = requireGreenhouseId(req.query, res);
    if (!greenhouseId) return;

    const report = await getLatestReport(greenhouseId);
    res.json(report);
  } catch (e) {
    console.error("/api/report/latest GET error:", e.message);
    res.status(500).json({ error: e.message });
  }
}

module.exports = {
  getReports,
  getTodayReport,
  generateNow,
  createDailyReport,
  fetchDailyReport,
  fetchLatestReport,
};
