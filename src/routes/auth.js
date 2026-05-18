const express = require("express");
const { signup, login, me, kakaoStart, kakaoCallback } = require("../controllers/authController");
const { requireSupabaseAuth } = require("../middlewares/supabaseAuthMiddleware");

const router = express.Router();

router.post("/auth/signup", signup);
router.post("/auth/login", login);
router.get("/auth/me", requireSupabaseAuth, me);

router.get("/auth/kakao/start", kakaoStart);
router.get("/auth/kakao/callback", kakaoCallback);

module.exports = router;
