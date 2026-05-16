const express = require("express");
const router = express.Router();
const {
  getReports,
  getTodayReport,
  generateNow,
  createDailyReport,
  fetchDailyReport,
  fetchLatestReport,
  chatReportAssistant,
} = require("../controllers/reportController");
const { requireSupabaseAuth } = require("../middlewares/supabaseAuthMiddleware");
const { requireGreenhouseAccess } = require("../middlewares/greenhouseAccessMiddleware");

router.get("/reports", requireSupabaseAuth, requireGreenhouseAccess, getReports);
router.get("/reports/today", requireSupabaseAuth, requireGreenhouseAccess, getTodayReport);
router.post("/reports/generate", requireSupabaseAuth, requireGreenhouseAccess, generateNow);
router.post("/report/daily", requireSupabaseAuth, requireGreenhouseAccess, createDailyReport);
router.get("/report/daily", requireSupabaseAuth, requireGreenhouseAccess, fetchDailyReport);
router.get("/report/latest", requireSupabaseAuth, requireGreenhouseAccess, fetchLatestReport);
router.post("/report/chat", requireSupabaseAuth, requireGreenhouseAccess, chatReportAssistant);

module.exports = router;
