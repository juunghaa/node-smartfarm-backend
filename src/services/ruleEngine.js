// src/services/ruleEngine.js
const { pool } = require("../db/pool");
const { getLatestWeather } = require("./weatherService");

// ── 식물별 임계값 정의 ───────────────────────────────────
const PLANT_CONFIG = {
  sansevieria: {
    label: "산세베리아",
    locationType: "indoor",
    soil:        { on: 20, off: 35 },
    humidity:    { min: 30, max: 60 },   // max 초과 시 환기
    temperature: { min: 10, max: 30 },   // min 미만 냉해, max 초과 고온
    lux:         { min: 500 },           // 미만이면 LED ON
    duration_ms: 8000,
    pestRisk:    { temp: 25, humidity: 60 },
  },
  monstera: {
    label: "몬스테라",
    locationType: "indoor",
    soil:        { on: 35, off: 55 },
    humidity:    { min: 50, max: 80 },
    temperature: { min: 15, max: 30 },
    lux:         { min: 1000 },
    duration_ms: 10000,
    pestRisk:    { temp: 25, humidity: 70 },
  },
  tomato: {
    label: "방울토마토",
    locationType: "outdoor",
    soil:        { on: 40, off: 65 },
    humidity:    { min: 60, max: 85 },
    temperature: { min: 10, max: 35 },
    lux:         null,                   // 자연광, LED 불필요
    duration_ms: 12000,
    pestRisk:    { temp: 25, humidity: 80 },
  },
  lettuce: {
    label: "상추",
    locationType: "outdoor",
    soil:        { on: 45, off: 65 },
    humidity:    { min: 60, max: 80 },
    temperature: { min: 5, max: 25 },
    lux:         null,
    duration_ms: 10000,
    pestRisk:    { temp: 20, humidity: 75 },
  },
  greenOnion: {
    label: "파",
    locationType: "outdoor",
    soil:        { on: 40, off: 60 },
    humidity:    { min: 60, max: 80 },
    temperature: { min: 0, max: 30 },
    lux:         null,
    duration_ms: 10000,
    pestRisk:    { temp: 20, humidity: 75 },
  },
};

// ── 온실별 상태값 (전역 하나 → 온실ID별 관리) ───────────
const wateringState = {};

function getState(greenhouseId) {
  if (!wateringState[greenhouseId]) {
    wateringState[greenhouseId] = {
      lastWatered: 0,
      locked: false,
    };
  }
  return wateringState[greenhouseId];
}

const COOLDOWN_MS = 15000;

// ── 메인 룰 실행 함수 ────────────────────────────────────
async function runRules(data, publishFn) {
  const {
    greenhouseId = "gh1",
    plantType = "sansevieria",
    soil,
    humidity,
    temperature,
    lux,
  } = data;

  const config = PLANT_CONFIG[plantType];
  if (!config) {
    console.warn(`⚠️ Unknown plantType: ${plantType}, skipping rules`);
    return;
  }

  const now = Date.now();
  const state = getState(greenhouseId);
  const isOutdoor = config.locationType === "outdoor";

  // ── 룰 1: 자동 관수 ──────────────────────────────────
  if (!Number.isNaN(soil)) {
    if (!state.locked && soil < config.soil.on && now - state.lastWatered > COOLDOWN_MS) {
        let shouldWater = true;
    
        if (isOutdoor) {
        const weather = await getLatestWeather(greenhouseId);
        if (weather && weather.rain_prob >= 50) {
            console.log(`🌧️ [${config.label}] 비 예보 ${weather.rain_prob}% → 관수 스킵`);
            shouldWater = false;
        }
        }
    
        if (shouldWater) {
        await triggerWatering(greenhouseId, config, state, publishFn);
        }
    }
  }

  // ── 룰 2: 환기 알림 ──────────────────────────────────
  if (!Number.isNaN(humidity) && humidity > config.humidity.max) {
    console.log(`🌬️ [${config.label}] 습도 ${humidity}% 초과 → 환기 권장`);
    publishFn("window", { action: "OPEN", reason: "high_humidity" });
    await saveAlert(greenhouseId, "humidity_high", `습도 ${humidity}% (기준 ${config.humidity.max}%)`);
  }

  if (!Number.isNaN(humidity) && humidity < config.humidity.min) {
    console.log(`💨 [${config.label}] 습도 ${humidity}% 부족`);
    await saveAlert(greenhouseId, "humidity_low", `습도 ${humidity}% (기준 ${config.humidity.min}%)`);
  }

  // ── 룰 3: 온도 경보 ──────────────────────────────────
  if (!Number.isNaN(temperature)) {
    if (temperature > config.temperature.max) {
      console.log(`🔥 [${config.label}] 고온 경보 ${temperature}°C`);
      publishFn("window", { action: "OPEN", reason: "high_temp" });
      await saveAlert(greenhouseId, "temp_high", `온도 ${temperature}°C (기준 ${config.temperature.max}°C)`);
    }
    if (temperature < config.temperature.min) {
      console.log(`🥶 [${config.label}] 저온 경보 ${temperature}°C`);
      await saveAlert(greenhouseId, "temp_low", `온도 ${temperature}°C (기준 ${config.temperature.min}°C)`);
    }
  }

  // ── 룰 4: 병해충 위험도 ──────────────────────────────
  if (!Number.isNaN(temperature) && !Number.isNaN(humidity)) {
    if (temperature > config.pestRisk.temp && humidity > config.pestRisk.humidity) {
      console.log(`🐛 [${config.label}] 병해충 위험 HIGH (${temperature}°C, ${humidity}%)`);
      await saveAlert(greenhouseId, "pest_risk_high",
        `온도 ${temperature}°C + 습도 ${humidity}% → 병해충 위험`);
    }
  }

  // ── 룰 5: LED 제어 (실내만) ──────────────────────────
  if (!isOutdoor && config.lux !== null) {
    const hour = new Date().getHours();
    const isDaytime = hour >= 6 && hour < 20;

    if (!isDaytime) {
      publishFn("led", { action: "OFF" });
    } else if (!Number.isNaN(lux) && lux < config.lux.min) {
      console.log(`💡 [${config.label}] 조도 부족 ${lux} lux → LED ON`);
      publishFn("led", { action: "ON" });
    }
  }
}

// ── 관수 실행 헬퍼 ───────────────────────────────────────
async function triggerWatering(greenhouseId, config, state, publishFn) {
  console.log(`💧 [${config.label}] 자동 관수 실행 (${config.duration_ms}ms)`);
  publishFn("pump", { action: "ON", duration: config.duration_ms });
  state.lastWatered = Date.now();
  state.locked = true;

  try {
    await pool.query(
      `INSERT INTO actuator_logs (greenhouse_id, actuator, action, duration_ms)
       VALUES ($1, $2, $3, $4)`,
      [greenhouseId, "pump", "ON", config.duration_ms]
    );
  } catch (e) {
    console.error("actuator_logs insert error:", e.message);
  }
}

// ── 알림 저장 헬퍼 ───────────────────────────────────────
async function saveAlert(greenhouseId, alertType, message) {
  try {
    await pool.query(
      `INSERT INTO alert_logs (greenhouse_id, alert_type, message)
       VALUES ($1, $2, $3)`,
      [greenhouseId, alertType, message]
    );
  } catch (e) {
    // 테이블 없으면 무시 (나중에 생성)
    if (!e.message.includes("does not exist")) {
      console.error("alert_logs insert error:", e.message);
    }
  }
}

module.exports = { runRules, PLANT_CONFIG };
