// src/routes/control.js
const express = require("express");
const router = express.Router();
const { manualControl } = require("../controllers/controlController");

router.post("/control", manualControl);

module.exports = router;
