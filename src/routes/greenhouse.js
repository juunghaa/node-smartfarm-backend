const express = require("express");
const router = express.Router();
const { getGreenhouse, upsertGreenhouse } = require("../controllers/greenhouseController");
const { requireSupabaseAuth } = require("../middlewares/supabaseAuthMiddleware");
const { requireGreenhouseAccess } = require("../middlewares/greenhouseAccessMiddleware");

router.get("/greenhouse", requireSupabaseAuth, requireGreenhouseAccess, getGreenhouse);
router.post("/greenhouse", requireSupabaseAuth, requireGreenhouseAccess, upsertGreenhouse);

module.exports = router;
