const express = require("express");
const router = express.Router();
const {
  attachSensor,
  detachSensor,
  mqttStatus,
} = require("../controllers/mqttController");

router.get("/mqtt/status", mqttStatus);
router.post("/mqtt/attach", attachSensor);
router.post("/mqtt/detach", detachSensor);

module.exports = router;
