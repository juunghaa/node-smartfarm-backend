const express = require("express");
const router = express.Router();
const { getWeather } = require("../controllers/weatherController");
const { requireSupabaseAuth } = require("../middlewares/supabaseAuthMiddleware");
const { requireGreenhouseAccess } = require("../middlewares/greenhouseAccessMiddleware");

router.get("/weather", requireSupabaseAuth, requireGreenhouseAccess, getWeather);

module.exports = router;
