const express = require("express");
const router = express.Router();
const {
  listMyGreenhouses,
  getGreenhouse,
  upsertGreenhouse,
  deleteGreenhouse,
} = require("../controllers/greenhouseController");
const { requireSupabaseAuth } = require("../middlewares/supabaseAuthMiddleware");
const { requireGreenhouseAccess } = require("../middlewares/greenhouseAccessMiddleware");

router.get("/greenhouses", requireSupabaseAuth, listMyGreenhouses);
router.get("/greenhouse", requireSupabaseAuth, requireGreenhouseAccess, getGreenhouse);
router.post("/greenhouse", requireSupabaseAuth, requireGreenhouseAccess, upsertGreenhouse);
router.delete("/greenhouse", requireSupabaseAuth, requireGreenhouseAccess, deleteGreenhouse);

module.exports = router;
