const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const { MQTT_URL } = require("../config");
const {
  getGreenhouseOwner,
  getDeviceByDeviceId,
  upsertDevice,
  insertCredential,
  revokeActiveCredentials,
  setDeviceStatus,
  listDevicesByOwner,
} = require("../repositories/deviceRepository");

const ALLOWED_DEVICE_TYPES = new Set(["sensor", "light", "pump", "window"]);
const ALLOWED_DEVICE_STATUSES = new Set(["registered", "provisioned", "active", "revoked"]);
const ONLINE_THRESHOLD_MS = 2 * 60 * 1000;
const PROVISION_EXPIRES_MINUTES = 10;

function normalizeDeviceId(deviceId) {
  if (typeof deviceId !== "string") return null;
  const trimmed = deviceId.trim();
  if (!trimmed || trimmed.length > 128) return null;
  return trimmed;
}

function normalizeDeviceType(deviceType) {
  if (typeof deviceType !== "string") return null;
  const value = deviceType.trim().toLowerCase();
  if (!ALLOWED_DEVICE_TYPES.has(value)) return null;
  return value;
}

function buildTopics(greenhouseId, deviceType) {
  if (deviceType === "sensor") {
    return {
      pub: [`farm/${greenhouseId}/sensor`, `farm/${greenhouseId}/device/${deviceType}/status`],
      sub: [],
    };
  }

  return {
    pub: [`farm/${greenhouseId}/device/${deviceType}/status`],
    sub: [`farm/${greenhouseId}/actuator/${deviceType}`],
  };
}

function buildMqttUsername(deviceId) {
  const safe = deviceId.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 32) || "device";
  return `dev_${safe}_${Date.now().toString(36)}`;
}

function buildMqttPassword() {
  return crypto.randomBytes(18).toString("base64url");
}

async function registerDevice({ userId, greenhouseId, deviceId, deviceType }) {
  const normalizedDeviceId = normalizeDeviceId(deviceId);
  const normalizedDeviceType = normalizeDeviceType(deviceType);
  if (!greenhouseId) return { status: 400, error: "greenhouseId is required" };
  if (!normalizedDeviceId) return { status: 400, error: "deviceId is invalid" };
  if (!normalizedDeviceType) return { status: 400, error: "deviceType is invalid" };

  const greenhouse = await getGreenhouseOwner(greenhouseId);
  if (!greenhouse) return { status: 404, error: "greenhouseId not found" };
  if (greenhouse.user_id !== userId) return { status: 403, error: "이 온실에 접근할 권한이 없습니다." };

  const existing = await getDeviceByDeviceId(normalizedDeviceId);
  if (existing && existing.owner_user_id !== userId) {
    return { status: 409, error: "이미 다른 사용자에게 등록된 deviceId 입니다." };
  }

  const device = await upsertDevice({
    deviceId: normalizedDeviceId,
    greenhouseId,
    ownerUserId: userId,
    deviceType: normalizedDeviceType,
  });

  return { status: 200, data: device };
}

async function provisionDevice({ userId, greenhouseId, deviceId }) {
  if (!greenhouseId) return { status: 400, error: "greenhouseId is required" };
  const normalizedDeviceId = normalizeDeviceId(deviceId);
  if (!normalizedDeviceId) return { status: 400, error: "deviceId is invalid" };

  const greenhouse = await getGreenhouseOwner(greenhouseId);
  if (!greenhouse) return { status: 404, error: "greenhouseId not found" };
  if (greenhouse.user_id !== userId) return { status: 403, error: "이 온실에 접근할 권한이 없습니다." };

  const device = await getDeviceByDeviceId(normalizedDeviceId);
  if (!device || device.owner_user_id !== userId) {
    return { status: 404, error: "device not found" };
  }
  if (device.greenhouse_id !== greenhouseId) {
    return { status: 400, error: "device greenhouse mismatch" };
  }
  if (device.status === "revoked") {
    return { status: 403, error: "revoked device cannot be provisioned" };
  }

  const username = buildMqttUsername(normalizedDeviceId);
  const password = buildMqttPassword();
  const passwordHash = await bcrypt.hash(password, 10);
  const expiresAt = new Date(Date.now() + PROVISION_EXPIRES_MINUTES * 60 * 1000);

  await revokeActiveCredentials(normalizedDeviceId);
  await insertCredential({
    deviceId: normalizedDeviceId,
    mqttUsername: username,
    mqttPasswordHash: passwordHash,
    expiresAt,
  });
  await setDeviceStatus(normalizedDeviceId, "provisioned");

  return {
    status: 200,
    data: {
      mqttUrl: MQTT_URL,
      username,
      password,
      expiresAt: expiresAt.toISOString(),
      topics: buildTopics(greenhouseId, device.device_type),
    },
  };
}

async function getDevices({ userId, greenhouseId }) {
  if (greenhouseId) {
    const greenhouse = await getGreenhouseOwner(greenhouseId);
    if (!greenhouse) return { status: 404, error: "greenhouseId not found" };
    if (greenhouse.user_id !== userId) return { status: 403, error: "이 온실에 접근할 권한이 없습니다." };
  }

  const devices = await listDevicesByOwner(userId, greenhouseId ?? null);
  return { status: 200, data: devices };
}

async function getDeviceStatus({ userId, deviceId }) {
  const normalizedDeviceId = normalizeDeviceId(deviceId);
  if (!normalizedDeviceId) return { status: 400, error: "deviceId is invalid" };

  const device = await getDeviceByDeviceId(normalizedDeviceId);
  if (!device || device.owner_user_id !== userId) {
    return { status: 404, error: "device not found" };
  }

  if (!ALLOWED_DEVICE_STATUSES.has(device.status)) {
    return { status: 500, error: "invalid device status" };
  }

  const lastSeenAt = device.last_seen_at ? new Date(device.last_seen_at) : null;
  const isOnline = Boolean(lastSeenAt && Date.now() - lastSeenAt.getTime() <= ONLINE_THRESHOLD_MS);
  return {
    status: 200,
    data: {
      status: isOnline ? "online" : "offline",
      deviceStatus: device.status,
      lastSeenAt: lastSeenAt ? lastSeenAt.toISOString() : null,
    },
  };
}

async function revokeDevice({ userId, deviceId }) {
  const normalizedDeviceId = normalizeDeviceId(deviceId);
  if (!normalizedDeviceId) return { status: 400, error: "deviceId is invalid" };

  const device = await getDeviceByDeviceId(normalizedDeviceId);
  if (!device || device.owner_user_id !== userId) {
    return { status: 404, error: "device not found" };
  }

  await revokeActiveCredentials(normalizedDeviceId);
  const updated = await setDeviceStatus(normalizedDeviceId, "revoked");
  return { status: 200, data: updated };
}

module.exports = {
  registerDevice,
  provisionDevice,
  getDevices,
  getDeviceStatus,
  revokeDevice,
};
