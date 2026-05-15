const express = require("express");
const rateLimit = require("express-rate-limit");
const router = express.Router();
const { recommend, register, unregister, list } = require("../controllers/plantController");
const { requireSupabaseAuth } = require("../middlewares/supabaseAuthMiddleware");
const { requireGreenhouseAccess } = require("../middlewares/greenhouseAccessMiddleware");

const recommendLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 3,
  message: {
    error: "추천 요청이 너무 많습니다. 잠시 후 다시 시도해주세요.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post("/plant/recommend", requireSupabaseAuth, recommendLimiter, recommend);
router.post("/plant/register", requireSupabaseAuth, requireGreenhouseAccess, register);
router.delete("/plant/register", requireSupabaseAuth, requireGreenhouseAccess, unregister);
router.get("/plant/list", requireSupabaseAuth, list);

module.exports = router;
