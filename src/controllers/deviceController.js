const { getGreenhouseId } = require("../utils/requestUtils");
const {
  registerDevice,
  provisionDevice,
  getDevices,
  getDeviceStatus,
  revokeDevice,
} = require("../services/deviceService");

async function register(req, res) {
  try {
    const greenhouseId = getGreenhouseId(req.body);
    const { deviceId, deviceType } = req.body ?? {};
    const result = await registerDevice({
      userId: req.auth?.userId,
      greenhouseId,
      deviceId,
      deviceType,
    });

    if (result.error) return res.status(result.status).json({ ok: false, error: result.error });
    return res.json({ ok: true, device: result.data });
  } catch (e) {
    console.error("/api/devices/register POST error:", e.message);
    return res.status(500).json({ ok: false, error: "internal server error" });
  }
}

async function provision(req, res) {
  try {
    const greenhouseId = getGreenhouseId(req.body);
    const { deviceId } = req.params;
    const result = await provisionDevice({
      userId: req.auth?.userId,
      greenhouseId,
      deviceId,
    });

    if (result.error) return res.status(result.status).json({ ok: false, error: result.error });
    return res.json({ ok: true, provisioning: result.data });
  } catch (e) {
    console.error("/api/devices/:deviceId/provision POST error:", e.message);
    return res.status(500).json({ ok: false, error: "internal server error" });
  }
}

async function list(req, res) {
  try {
    const greenhouseId = getGreenhouseId(req.query);
    const result = await getDevices({
      userId: req.auth?.userId,
      greenhouseId,
    });
    if (result.error) return res.status(result.status).json({ ok: false, error: result.error });
    return res.json({ ok: true, devices: result.data });
  } catch (e) {
    console.error("/api/devices GET error:", e.message);
    return res.status(500).json({ ok: false, error: "internal server error" });
  }
}

async function status(req, res) {
  try {
    const { deviceId } = req.params;
    const result = await getDeviceStatus({
      userId: req.auth?.userId,
      deviceId,
    });
    if (result.error) return res.status(result.status).json({ ok: false, error: result.error });
    return res.json({ ok: true, ...result.data });
  } catch (e) {
    console.error("/api/devices/:deviceId/status GET error:", e.message);
    return res.status(500).json({ ok: false, error: "internal server error" });
  }
}

async function revoke(req, res) {
  try {
    const { deviceId } = req.params;
    const result = await revokeDevice({
      userId: req.auth?.userId,
      deviceId,
    });
    if (result.error) return res.status(result.status).json({ ok: false, error: result.error });
    return res.json({ ok: true, device: result.data });
  } catch (e) {
    console.error("/api/devices/:deviceId/revoke POST error:", e.message);
    return res.status(500).json({ ok: false, error: "internal server error" });
  }
}

module.exports = {
  register,
  provision,
  list,
  status,
  revoke,
};
