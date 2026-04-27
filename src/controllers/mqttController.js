const { requireGreenhouseId } = require("../utils/requestUtils");
const {
  onSensorAttached,
  onSensorDetached,
  getMqttStatus,
} = require("../services/mqttService");

function attachSensor(req, res) {
  const greenhouseId = requireGreenhouseId(req.body, res);
  if (!greenhouseId) return;

  const result = onSensorAttached(greenhouseId);
  if (!result.ok) {
    return res.status(400).json({ error: result.reason });
  }
  return res.json({ ok: true, greenhouseId, status: getMqttStatus() });
}

function detachSensor(req, res) {
  const greenhouseId = requireGreenhouseId(req.body, res);
  if (!greenhouseId) return;

  const result = onSensorDetached(greenhouseId);
  if (!result.ok) {
    return res.status(400).json({ error: result.reason });
  }
  return res.json({ ok: true, greenhouseId, status: getMqttStatus() });
}

function mqttStatus(req, res) {
  return res.json(getMqttStatus());
}

module.exports = {
  attachSensor,
  detachSensor,
  mqttStatus,
};
