// src/routes/report.js
const express = require("express");
const router = express.Router();
const { getReports, getTodayReport, generateNow } = require("../controllers/reportController");

router.get("/reports",          getReports);
router.get("/reports/today",    getTodayReport);
router.post("/reports/generate", generateNow);

module.exports = router;
