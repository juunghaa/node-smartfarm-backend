// src/services/mqttService.js
const mqtt = require("mqtt");
const { pool } = require("../db/pool");
const { ENABLE_MQTT, MQTT_URL, SENSOR_TOPIC, PUMP_TOPIC } = require("../config");
const { runRules } = require("./ruleEngine");

let client = null; // publishCommand에서 쓰려면 밖으로 빼야 함

// 수동 제어용 publish 함수 — controlController에서 호출
function publishCommand(actuator, payload) {
  if (!client) {
    console.warn("MQTT not connected, cannot publish");
    return;
  }
  const topic = `smartfarm/${actuator}/command`;
  client.publish(topic, JSON.stringify(payload));
  console.log(`📤 Published to ${topic}:`, payload);
}

function initMqttService() {
  if (!ENABLE_MQTT) {
    console.log("MQTT disabled");
    return;
  }

  client = mqtt.connect(MQTT_URL);

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
    const humidity    = Number(data.humidity);
    const soil        = Number(data.soilMoisture);
    const ts          = data.ts ? new Date(data.ts) : new Date();

    // 센서 데이터 DB 저장
    try {
      await pool.query(
        `INSERT INTO sensor_readings (greenhouse_id, temperature, humidity, soil_moisture, ts)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          greenhouseId,
          Number.isNaN(temperature) ? null : temperature,
          Number.isNaN(humidity)    ? null : humidity,
          Number.isNaN(soil)        ? null : soil,
          ts,
        ]
      );
    } catch (e) {
      console.error("sensor_readings insert error:", e.message);
    }

    // 룰 엔진 실행 (물주기·환기·병해충·LED)
    await runRules(
      { greenhouseId, temperature, humidity, soil },
      publishCommand  // publish 함수를 주입
    );
  });

  client.on("error", (err) => console.error("MQTT error:", err));
}

module.exports = { initMqttService, publishCommand };
