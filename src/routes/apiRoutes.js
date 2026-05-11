const express = require("express");
const {
  getLatest,
  getHistory,
  getActuators,
} = require("../controllers/apiController");
const { requireSupabaseAuth } = require("../middlewares/supabaseAuthMiddleware");
const { requireGreenhouseAccess } = require("../middlewares/greenhouseAccessMiddleware");

const router = express.Router();

router.get("/latest", requireSupabaseAuth, requireGreenhouseAccess, getLatest);
router.get("/history", requireSupabaseAuth, requireGreenhouseAccess, getHistory);
router.get("/actuators", requireSupabaseAuth, requireGreenhouseAccess, getActuators);

module.exports = router;
