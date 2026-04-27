// src/routes/report.js
const express = require("express");
const router = express.Router();
const {
  getReports,
  getTodayReport,
  generateNow,
  createDailyReport,
  fetchDailyReport,
  fetchLatestReport,
} = require("../controllers/reportController");

router.get("/reports",          getReports);
router.get("/reports/today",    getTodayReport);
router.post("/reports/generate", generateNow);
router.post("/report/daily", createDailyReport);
router.get("/report/daily", fetchDailyReport);
router.get("/report/latest", fetchLatestReport);

module.exports = router;
