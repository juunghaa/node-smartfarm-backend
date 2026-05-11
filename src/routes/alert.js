const express = require("express");
const router = express.Router();
const { getAlerts } = require("../controllers/alertController");
const { requireSupabaseAuth } = require("../middlewares/supabaseAuthMiddleware");
const { requireGreenhouseAccess } = require("../middlewares/greenhouseAccessMiddleware");

router.get("/alerts", requireSupabaseAuth, requireGreenhouseAccess, getAlerts);

module.exports = router;
