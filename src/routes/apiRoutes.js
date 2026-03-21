// 라우터만 담당

const express = require("express");
const {
  getLatest,
  getHistory,
  getActuators,
} = require("../controllers/apiController");

const router = express.Router();

router.get("/latest", getLatest);
router.get("/history", getHistory);
router.get("/actuators", getActuators);

module.exports = router;
