const { pool } = require("../db/pool");

async function getGreenhouseOwner(greenhouseId) {
  const { rows } = await pool.query(
    `SELECT greenhouse_id, user_id
     FROM greenhouses
     WHERE greenhouse_id = $1`,
    [greenhouseId]
  );
  return rows[0] ?? null;
}

async function getDeviceByDeviceId(deviceId) {
  const { rows } = await pool.query(
    `SELECT id, device_id, greenhouse_id, owner_user_id, device_type, status, last_seen_at, created_at, updated_at
     FROM iot_devices
     WHERE device_id = $1`,
    [deviceId]
  );
  return rows[0] ?? null;
}

async function upsertDevice({ deviceId, greenhouseId, ownerUserId, deviceType }) {
  const { rows } = await pool.query(
    `INSERT INTO iot_devices (device_id, greenhouse_id, owner_user_id, device_type, status)
     VALUES ($1, $2, $3, $4, 'registered')
     ON CONFLICT (device_id)
     DO UPDATE SET
       greenhouse_id = EXCLUDED.greenhouse_id,
       owner_user_id = EXCLUDED.owner_user_id,
       device_type = EXCLUDED.device_type,
       status = 'registered',
       updated_at = NOW()
     RETURNING id, device_id, greenhouse_id, owner_user_id, device_type, status, last_seen_at, created_at, updated_at`,
    [deviceId, greenhouseId, ownerUserId, deviceType]
  );
  return rows[0];
}

async function insertCredential({ deviceId, mqttUsername, mqttPasswordHash, expiresAt }) {
  const { rows } = await pool.query(
    `INSERT INTO device_credentials (device_id, mqtt_username, mqtt_password_hash, expires_at)
     VALUES ($1, $2, $3, $4)
     RETURNING id, device_id, mqtt_username, expires_at, revoked_at, created_at`,
    [deviceId, mqttUsername, mqttPasswordHash, expiresAt]
  );
  return rows[0];
}

async function revokeActiveCredentials(deviceId) {
  await pool.query(
    `UPDATE device_credentials
     SET revoked_at = NOW()
     WHERE device_id = $1
       AND revoked_at IS NULL`,
    [deviceId]
  );
}

async function setDeviceStatus(deviceId, status) {
  const { rows } = await pool.query(
    `UPDATE iot_devices
     SET status = $2, updated_at = NOW()
     WHERE device_id = $1
     RETURNING id, device_id, greenhouse_id, owner_user_id, device_type, status, last_seen_at, created_at, updated_at`,
    [deviceId, status]
  );
  return rows[0] ?? null;
}

async function listDevicesByOwner(ownerUserId, greenhouseId) {
  const params = [ownerUserId];
  let where = "WHERE owner_user_id = $1";
  if (greenhouseId) {
    params.push(greenhouseId);
    where += ` AND greenhouse_id = $${params.length}`;
  }

  const { rows } = await pool.query(
    `SELECT id, device_id, greenhouse_id, owner_user_id, device_type, status, last_seen_at, created_at, updated_at
     FROM iot_devices
     ${where}
     ORDER BY created_at DESC`,
    params
  );
  return rows;
}

async function updateDeviceLastSeen(deviceId, ts = new Date()) {
  await pool.query(
    `UPDATE iot_devices
     SET last_seen_at = $2, updated_at = NOW()
     WHERE device_id = $1`,
    [deviceId, ts]
  );
}

async function getSensorDeviceForGreenhouse(deviceId, greenhouseId) {
  const { rows } = await pool.query(
    `SELECT device_id, greenhouse_id, owner_user_id, device_type, status
     FROM iot_devices
     WHERE device_id = $1 AND greenhouse_id = $2`,
    [deviceId, greenhouseId]
  );
  return rows[0] ?? null;
}

module.exports = {
  getGreenhouseOwner,
  getDeviceByDeviceId,
  upsertDevice,
  insertCredential,
  revokeActiveCredentials,
  setDeviceStatus,
  listDevicesByOwner,
  updateDeviceLastSeen,
  getSensorDeviceForGreenhouse,
};
