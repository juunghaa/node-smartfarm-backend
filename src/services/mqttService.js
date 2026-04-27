// src/services/mqttService.js
const mqtt = require("mqtt");
const { pool } = require("../db/pool");
const { ENABLE_MQTT, MQTT_URL, MQTT_USERNAME, MQTT_PASSWORD, SENSOR_TOPIC } = require("../config");
const { runRules } = require("./ruleEngine");

let client = null;
let isConnected = false;
const attachedGreenhouses = new Set();

function extractGreenhouseIdFromTopic(topic) {
  const parts = String(topic).split("/");
  if (parts.length !== 3) return null;
  if (parts[0] !== "farm" || parts[2] !== "sensor") return null;
  if (!parts[1]) return null;
  return parts[1];
}

// 수동 제어용 publish 함수 — controlController에서 호출
function publishCommand(greenhouseId, actuator, payload) {
  if (!client || !isConnected) {
    console.warn("MQTT not connected, cannot publish");
    return;
  }
  if (!greenhouseId) {
    console.warn("No greenhouseId provided, cannot publish");
    return;
  }

  const topic = `farm/${greenhouseId}/actuator/${actuator}`;
  client.publish(topic, JSON.stringify(payload));
  console.log(`📤 Published to ${topic}:`, payload);
}

function setupClientHandlers() {
  if (!client) return;

  client.on("connect", () => {
    isConnected = true;
    console.log("MQTT connected:", MQTT_URL);
    client.subscribe(SENSOR_TOPIC, (err) => {
      if (err) console.error("MQTT subscribe error:", err.message);
      else console.log("Subscribed:", SENSOR_TOPIC);
    });
  });

  client.on("message", async (topic, message) => {
    const greenhouseIdFromTopic = extractGreenhouseIdFromTopic(topic);
    if (!greenhouseIdFromTopic) return;

    let data;
    try {
      data = JSON.parse(message.toString());
    } catch {
      return;
    }

    const greenhouseId = data.greenhouseId ?? greenhouseIdFromTopic ?? "gh1";
    const temperature = Number(data.temperature);
    const humidity = Number(data.humidity);
    const soil = Number(data.soilMoisture);
    const ts = data.ts ? new Date(data.ts) : new Date();

    try {
      await pool.query(
        `INSERT INTO sensor_readings (greenhouse_id, temperature, humidity, soil_moisture, ts)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          greenhouseId,
          Number.isNaN(temperature) ? null : temperature,
          Number.isNaN(humidity) ? null : humidity,
          Number.isNaN(soil) ? null : soil,
          ts,
        ]
      );
    } catch (e) {
      console.error("sensor_readings insert error:", e.message);
    }

    await runRules(
      {
        greenhouseId,
        plantType: data.plantType ?? "sansevieria",
        temperature,
        humidity,
        soil,
        lux: Number(data.lux) || NaN,
      },
      (actuator, payload) => publishCommand(greenhouseId, actuator, payload)
    );
  });

  client.on("error", (err) => {
    console.error("MQTT error:", err.message);
  });

  client.on("close", () => {
    isConnected = false;
    console.log("MQTT connection closed");
  });
}

function connectMqtt() {
  if (!ENABLE_MQTT) return { ok: false, reason: "disabled_by_env" };
  if (client) return { ok: true, reason: "already_initialized" };

  client = mqtt.connect(MQTT_URL, {
    username: MQTT_USERNAME,
    password: MQTT_PASSWORD,
    reconnectPeriod: 5000,
    connectTimeout: 30 * 1000,
    rejectUnauthorized: true,
  });
  setupClientHandlers();
  return { ok: true, reason: "connecting" };
}

function disconnectMqtt() {
  if (!client) return;
  client.end(true);
  client.removeAllListeners();
  client = null;
  isConnected = false;
}

function onSensorAttached(greenhouseId) {
  if (!greenhouseId) return { ok: false, reason: "invalid_greenhouse_id" };
  attachedGreenhouses.add(greenhouseId);
  return connectMqtt();
}

function onSensorDetached(greenhouseId) {
  if (!greenhouseId) return { ok: false, reason: "invalid_greenhouse_id" };
  attachedGreenhouses.delete(greenhouseId);
  if (attachedGreenhouses.size === 0) {
    disconnectMqtt();
  }
  return { ok: true, reason: "detached" };
}

function getMqttStatus() {
  return {
    enabled: ENABLE_MQTT,
    connected: isConnected,
    attachedGreenhouses: Array.from(attachedGreenhouses),
  };
}

function initMqttService() {
  if (!ENABLE_MQTT) {
    console.log("MQTT disabled");
    return;
  }
  console.log("MQTT standby: waiting for sensor attach signal");
}

module.exports = {
  initMqttService,
  publishCommand,
  onSensorAttached,
  onSensorDetached,
  getMqttStatus,
};
