const express = require("express");
const router = express.Router();
const { manualControl } = require("../controllers/controlController");
const { requireSupabaseAuth } = require("../middlewares/supabaseAuthMiddleware");
const { requireGreenhouseAccess } = require("../middlewares/greenhouseAccessMiddleware");

router.post("/control", requireSupabaseAuth, requireGreenhouseAccess, manualControl);

module.exports = router;
