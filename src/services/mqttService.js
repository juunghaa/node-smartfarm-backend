// mqtt 연결, ,센서 저장, 자동 물주기 로직 담당

const mqtt = require("mqtt");
const { pool } = require("../db/pool");
const {
  ENABLE_MQTT,
  MQTT_URL,
  SENSOR_TOPIC,
  PUMP_TOPIC,
} = require("../config");

// 자동 물주기 룰 (히스테리시스)
let lastWatered = 0;
let wateringLocked = false;
const COOLDOWN_MS = 15000;
const ON_THRESHOLD = 30;
const OFF_THRESHOLD = 40;
const DURATION_MS = 8000;

function initMqttService() {
  if (!ENABLE_MQTT) {
    console.log("MQTT disabled");
    return;
  }

  const client = mqtt.connect(MQTT_URL);

  client.on("connect", () => {
    console.log("MQTT connected:", MQTT_URL);

    client.subscribe(SENSOR_TOPIC, (err) => {
      if (err) console.error("MQTT subscribe error:", err);
      else console.log("Subscribed:", SENSOR_TOPIC);
    });
  });

  client.on("message", async (topic, message) => {
    if (topic !== SENSOR_TOPIC) return;

    let data;
    try {
      data = JSON.parse(message.toString());
    } catch {
      return;
    }

    const greenhouseId = data.greenhouseId ?? "gh1";
    const temperature = Number(data.temperature);
    const humidity = Number(data.humidity);
    const soil = Number(data.soilMoisture);
    const ts = data.ts ? new Date(data.ts) : new Date();

    try {
      await pool.query(
        `insert into sensor_readings (greenhouse_id, temperature, humidity, soil_moisture, ts)
         values ($1, $2, $3, $4, $5)`,
        [
          greenhouseId,
          Number.isNaN(temperature) ? null : temperature,
          Number.isNaN(humidity) ? null : humidity,
          Number.isNaN(soil) ? null : soil,
          ts,
        ]
      );
    } catch (e) {
      console.error("DB insert sensor_readings error:", e.message);
    }

    const now = Date.now();
    if (Number.isNaN(soil)) return;

    if (wateringLocked && soil >= OFF_THRESHOLD) {
      wateringLocked = false;
      console.log("🔓 Watering unlocked (soil high enough).");
    }

    if (!wateringLocked && soil < ON_THRESHOLD && now - lastWatered > COOLDOWN_MS) {
      console.log(`💧 Auto Watering Triggered! (soil=${soil})`);

      client.publish(
        PUMP_TOPIC,
        JSON.stringify({ action: "ON", duration: DURATION_MS })
      );

      lastWatered = now;
      wateringLocked = true;

      try {
        await pool.query(
          `insert into actuator_logs (greenhouse_id, actuator, action, duration_ms)
           values ($1, $2, $3, $4)`,
          [greenhouseId, "pump", "ON", DURATION_MS]
        );
      } catch (e) {
        console.error("DB insert actuator_logs error:", e.message);
      }
    }
  });

  client.on("error", (err) => {
    console.error("MQTT error:", err);
  });
}

module.exports = {
  initMqttService,
};
