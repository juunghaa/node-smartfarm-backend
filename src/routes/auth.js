const express = require("express");
const { signup, login, me } = require("../controllers/authController");
const { requireSupabaseAuth } = require("../middlewares/supabaseAuthMiddleware");

const router = express.Router();

router.post("/auth/signup", signup);
router.post("/auth/login", login);
router.get("/auth/me", requireSupabaseAuth, me);

module.exports = router;
