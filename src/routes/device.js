const express = require("express");
const rateLimit = require("express-rate-limit");
const { requireSupabaseAuth } = require("../middlewares/supabaseAuthMiddleware");
const {
  register,
  provision,
  list,
  status,
  revoke,
} = require("../controllers/deviceController");

const router = express.Router();

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." },
});

const provisionLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." },
});

router.post("/devices/register", requireSupabaseAuth, registerLimiter, register);
router.post("/devices/:deviceId/provision", requireSupabaseAuth, provisionLimiter, provision);
router.get("/devices", requireSupabaseAuth, list);
router.get("/devices/:deviceId/status", requireSupabaseAuth, status);
router.post("/devices/:deviceId/revoke", requireSupabaseAuth, revoke);

module.exports = router;
