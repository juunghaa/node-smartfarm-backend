// src/services/mqttService.js
const mqtt = require("mqtt");
const { pool } = require("../db/pool");
const { ENABLE_MQTT, MQTT_URL, MQTT_USERNAME, MQTT_PASSWORD, SENSOR_TOPIC } = require("../config");
const { runRules } = require("./ruleEngine");

let client = null;
let isConnected = false;

function extractGreenhouseIdFromTopic(topic) {
  const parts = String(topic).split("/");
  if (parts.length !== 3) return null;
  if (parts[0] !== "farm" || parts[2] !== "sensor") return null;
  if (!parts[1]) return null;
  return parts[1];
}

async function isSensorEnabled(greenhouseId) {
  const { rows } = await pool.query(
    `SELECT use_sensor FROM greenhouses WHERE greenhouse_id = $1`,
    [greenhouseId]
  );

  // greenhouses에 등록되지 않은 온실이면 무시
  if (!rows[0]) return false;
  return rows[0].use_sensor === true;
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
    try {
      const greenhouseIdFromTopic = extractGreenhouseIdFromTopic(topic);
      if (!greenhouseIdFromTopic) return;

      const sensorEnabled = await isSensorEnabled(greenhouseIdFromTopic);
      if (!sensorEnabled) return;

      let data;
      try {
        data = JSON.parse(message.toString());
      } catch {
        return;
      }

      const greenhouseId = data.greenhouseId ?? greenhouseIdFromTopic;
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
    } catch (e) {
      console.error("MQTT message handler error:", e.message);
      return;
    }
  });

  client.on("error", (err) => {
    console.error("MQTT error:", err.message);
  });

  client.on("close", () => {
    isConnected = false;
    console.log("MQTT connection closed");
  });
}

function initMqttService() {
  if (!ENABLE_MQTT) {
    console.log("MQTT disabled");
    return;
  }

  if (client) return;

  client = mqtt.connect(MQTT_URL, {
    username: MQTT_USERNAME,
    password: MQTT_PASSWORD,
    reconnectPeriod: 5000,
    connectTimeout: 30 * 1000,
    rejectUnauthorized: true,
  });
  setupClientHandlers();
}

module.exports = {
  initMqttService,
  publishCommand,
};
