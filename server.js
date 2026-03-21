require("dotenv").config();

const express = require("express");
const cors = require("cors");
const mqtt = require("mqtt");
const { Pool } = require("pg");

const app = express();
app.use(cors());
app.use(express.json());

// env
const PORT = Number(process.env.PORT ?? 3000);
const MQTT_URL = process.env.MQTT_URL ?? "mqtt://localhost:1883";
const SENSOR_TOPIC = process.env.SENSOR_TOPIC ?? "farm/gh1/sensor";
const PUMP_TOPIC = process.env.PUMP_TOPIC ?? "farm/gh1/actuator/pump";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// // 자동 물주기 룰
// let lastWatered = 0;
// const COOLDOWN_MS = 15000;
// const THRESHOLD = 30;
// const DURATION_MS = 8000;
// 자동 물주기 룰 (히스테리시스)
let lastWatered = 0;
let wateringLocked = false;     // 한 번 물 주면 잠금
const COOLDOWN_MS = 15000;      // 최소 쿨다운(안전장치)
const ON_THRESHOLD = 30;        // 이 값 아래면 물 주기 시작
const OFF_THRESHOLD = 40;       // 이 값 이상이면 잠금 해제
const DURATION_MS = 8000;


// MQTT client (Render에서는 끌 수 있게)
if (ENABLE_MQTT) {
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
    const humidity = Number(data.humidity);
    const soil = Number(data.soilMoisture);
    const ts = data.ts ? new Date(data.ts) : new Date();

    // 1) 센서 DB 저장
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

    // 2) 자동 물주기 (히스테리시스)
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

  client.on("error", (err) => console.error("MQTT error:", err));
} else {
  console.log("MQTT disabled");
}

// ===== REST API =====

// 최신값 1개
app.get("/api/latest", async (req, res) => {
  const greenhouseId = req.query.greenhouseId ?? "gh1";
  const { rows } = await pool.query(
    `select greenhouse_id, temperature, humidity, soil_moisture, ts
     from sensor_readings
     where greenhouse_id = $1
     order by ts desc
     limit 1`,
    [greenhouseId]
  );
  res.json(rows[0] ?? null);
});

// 최근 N분 히스토리
app.get("/api/history", async (req, res) => {
  const greenhouseId = req.query.greenhouseId ?? "gh1";
  const minutes = Number(req.query.minutes ?? 60);
  const safeMinutes = Number.isNaN(minutes) ? 60 : Math.min(Math.max(minutes, 1), 24 * 60);

  const { rows } = await pool.query(
    `select greenhouse_id, temperature, humidity, soil_moisture, ts
     from sensor_readings
     where greenhouse_id = $1
       and ts >= now() - ($2::text || ' minutes')::interval
     order by ts asc`,
    [greenhouseId, String(safeMinutes)]
  );

  res.json(rows);
});

// 펌프 로그(옵션)
app.get("/api/actuators", async (req, res) => {
  const greenhouseId = req.query.greenhouseId ?? "gh1";
  const { rows } = await pool.query(
    `select greenhouse_id, actuator, action, duration_ms, ts
     from actuator_logs
     where greenhouse_id = $1
     order by ts desc
     limit 50`,
    [greenhouseId]
  );
  res.json(rows);
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`API server running on port ${PORT}`);
});
