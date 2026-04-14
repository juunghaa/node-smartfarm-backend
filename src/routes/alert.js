const express = require("express");
const router = express.Router();
const { getAlerts } = require("../controllers/alertController");

router.get("/alerts", getAlerts);

module.exports = router;
