// src/routes/plant.js
const express = require("express");
const rateLimit = require("express-rate-limit");
const router = express.Router();
const { recommend, register, list } = require("../controllers/plantController");

const recommendLimiter = rateLimit({
  windowMs: 60 * 1000, // 1분
  max: 3,              // IP당 최대 5회
  message: {
    error: "추천 요청이 너무 많습니다. 잠시 후 다시 시도해주세요.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post("/plant/recommend", recommendLimiter, recommend);
router.post("/plant/register", register);
router.get("/plant/list", list);

module.exports = router;
