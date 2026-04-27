// src/services/ruleEngine.js
const { pool } = require("../db/pool");
const { getLatestWeather } = require("./weatherService");
const SunCalc = require("suncalc");

// ── 식물별 임계값 정의 ───────────────────────────────────
const PLANT_CONFIG = {
  sansevieria: {
    label: "산세베리아",
    locationType: "indoor",
    soil:        { on: 20, off: 35 },
    humidity:    { min: 30, max: 60 },
    temperature: { min: 10, max: 30 },
    lux:         { minAltitudeDeg: 10 }, // 태양 고도 10도 미만이면 LED ON
    duration_ms: 8000,
    pestRisk:    { temp: 25, humidity: 60 },
  },
  monstera: {
    label: "몬스테라",
    locationType: "indoor",
    soil:        { on: 35, off: 55 },
    humidity:    { min: 50, max: 80 },
    temperature: { min: 15, max: 30 },
    lux:         { minAltitudeDeg: 15 }, // 몬스테라는 광량 더 필요
    duration_ms: 10000,
    pestRisk:    { temp: 25, humidity: 70 },
  },
  tomato: {
    label: "방울토마토",
    locationType: "outdoor",
    soil:        { on: 40, off: 65 },
    humidity:    { min: 60, max: 85 },
    temperature: { min: 10, max: 35 },
    lux:         null,
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

// ── 온실별 상태값 ────────────────────────────────────────
const greenhouseState = {};

function getState(greenhouseId) {
  if (!greenhouseState[greenhouseId]) {
    greenhouseState[greenhouseId] = {
      lastWatered:  0,
      waterLocked:  false,
      windowOpen:   false, // 창문 현재 상태 추적
    };
  }
  return greenhouseState[greenhouseId];
}

const COOLDOWN_MS = 15000;

// ── SunCalc 태양 고도 계산 ───────────────────────────────
function getSunAltitudeDeg(lat, lon) {
  const sunPos = SunCalc.getPosition(new Date(), lat, lon);
  return sunPos.altitude * (180 / Math.PI); // 라디안 → 도
}

// ── 창문 제어 헬퍼 ───────────────────────────────────────
async function openWindow(greenhouseId, state, publishFn, reason) {
  if (state.windowOpen) return; // 이미 열려있으면 스킵
  console.log(`🪟 [창문 OPEN] 이유: ${reason}`);
  publishFn("window", { action: "OPEN", reason });
  state.windowOpen = true;
  try {
    await pool.query(
      `INSERT INTO actuator_logs (greenhouse_id, actuator, action, duration_ms)
       VALUES ($1, $2, $3, $4)`,
      [greenhouseId, "window", "OPEN", null]
    );
  } catch (e) {
    console.error("actuator_logs window open error:", e.message);
  }
}

async function closeWindow(greenhouseId, state, publishFn, reason) {
  if (!state.windowOpen) return; // 이미 닫혀있으면 스킵
  console.log(`🪟 [창문 CLOSE] 이유: ${reason}`);
  publishFn("window", { action: "CLOSE", reason });
  state.windowOpen = false;
  try {
    await pool.query(
      `INSERT INTO actuator_logs (greenhouse_id, actuator, action, duration_ms)
       VALUES ($1, $2, $3, $4)`,
      [greenhouseId, "window", "CLOSE", null]
    );
  } catch (e) {
    console.error("actuator_logs window close error:", e.message);
  }
}

// ── 메인 룰 실행 함수 ────────────────────────────────────
async function runRules(data, publishFn) {
  const { greenhouseId, soil, humidity, temperature } = data;
  if (!greenhouseId) {
    console.warn("⚠️ runRules called without greenhouseId");
    return;
  }

  // greenhouses DB에서 설정 조회
  const { rows } = await pool.query(
    `SELECT plant_type, location_type, lat, lon
     FROM greenhouses WHERE greenhouse_id = $1`,
    [greenhouseId]
  );
  if (!rows[0]) {
    console.warn(`⚠️ greenhouse ${greenhouseId} 설정 없음`);
    return;
  }
  const { plant_type: plantType, lat, lon } = rows[0];
  const config = PLANT_CONFIG[plantType];
  if (!config) {
    console.warn(`⚠️ Unknown plantType: ${plantType}`);
    return;
  }

  const now = Date.now();
  const state = getState(greenhouseId);
  const isOutdoor = config.locationType === "outdoor";

  // ── 룰 1: 자동 관수 ──────────────────────────────────
  if (!Number.isNaN(soil)) {
    // 히스테리시스 잠금 해제
    if (state.waterLocked && soil >= config.soil.off) {
      state.waterLocked = false;
      console.log(`🔓 [${config.label}] 관수 잠금 해제 (soil=${soil}%)`);
    }

    if (!state.waterLocked && soil < config.soil.on && now - state.lastWatered > COOLDOWN_MS) {
      let shouldWater = true;

      if (isOutdoor) {
        const weather = await getLatestWeather(greenhouseId);
        if (weather && weather.rain_prob >= 50) {
          console.log(`🌧️ [${config.label}] 비 예보 ${weather.rain_prob}% → 관수 스킵`);
          shouldWater = false;
        }
      }

      if (shouldWater) await triggerWatering(greenhouseId, config, state, publishFn);
    }
  }

  // ── 룰 2: 창문 환기 ──────────────────────────────────
  if (!Number.isNaN(humidity) && !Number.isNaN(temperature)) {
    const humidityTooHigh = humidity > config.humidity.max;
    const tempTooHigh     = temperature > config.temperature.max;
    const needsVentilation = humidityTooHigh || tempTooHigh;

    const humidityOk = humidity <= config.humidity.max - 5; // 5% 여유 두고 닫기
    const tempOk     = temperature <= config.temperature.max - 2;
    const canClose   = humidityOk && tempOk;

    if (needsVentilation) {
      const reason = humidityTooHigh && tempTooHigh ? "high_humidity_and_temp"
                   : humidityTooHigh ? "high_humidity"
                   : "high_temp";
      await openWindow(greenhouseId, state, publishFn, reason);

      if (humidityTooHigh) {
        await saveAlert(greenhouseId, "humidity_high",
          `습도 ${humidity}% 초과 (기준 ${config.humidity.max}%) → 환기 중`);
      }
      if (tempTooHigh) {
        await saveAlert(greenhouseId, "temp_high",
          `온도 ${temperature}°C 초과 (기준 ${config.temperature.max}°C) → 환기 중`);
      }
    } else if (canClose) {
      await closeWindow(greenhouseId, state, publishFn, "conditions_normalized");
    }
  }

  // ── 룰 3: 저온 경보 (창문 닫기 포함) ─────────────────
  if (!Number.isNaN(temperature) && temperature < config.temperature.min) {
    console.log(`🥶 [${config.label}] 저온 경보 ${temperature}°C`);
    // 저온이면 창문 닫아야 함
    await closeWindow(greenhouseId, state, publishFn, "low_temp_protection");
    await saveAlert(greenhouseId, "temp_low",
      `온도 ${temperature}°C 미만 (기준 ${config.temperature.min}°C) → 창문 닫음`);
  }

  // ── 룰 4: 병해충 위험도 ──────────────────────────────
  if (!Number.isNaN(temperature) && !Number.isNaN(humidity)) {
    if (temperature > config.pestRisk.temp && humidity > config.pestRisk.humidity) {
      console.log(`🐛 [${config.label}] 병해충 위험 (${temperature}°C, ${humidity}%)`);
      await saveAlert(greenhouseId, "pest_risk_high",
        `온도 ${temperature}°C + 습도 ${humidity}% → 병해충 위험`);
    }
  }

  // ── 룰 5: SunCalc 기반 LED 제어 (실내만) ─────────────
  if (!isOutdoor && config.lux !== null) {
    const hour = new Date().getHours();
    const isDaytime = hour >= 6 && hour < 20;

    if (!isDaytime) {
      // 야간은 무조건 LED OFF
      publishFn("led", { action: "OFF", reason: "nighttime" });
    } else if (lat && lon) {
      // 위치 기반 태양 고도 계산
      const altitudeDeg = getSunAltitudeDeg(Number(lat), Number(lon));
      if (altitudeDeg < config.lux.minAltitudeDeg) {
        console.log(`💡 [${config.label}] 태양 고도 ${altitudeDeg.toFixed(1)}° → LED ON`);
        publishFn("led", { action: "ON", reason: "low_sun_altitude", altitudeDeg });
      } else {
        publishFn("led", { action: "OFF", reason: "sufficient_sunlight" });
      }
    }
  }
}

// ── 관수 실행 헬퍼 ───────────────────────────────────────
async function triggerWatering(greenhouseId, config, state, publishFn) {
  console.log(`💧 [${config.label}] 자동 관수 실행 (${config.duration_ms}ms)`);
  publishFn("pump", { action: "ON", duration: config.duration_ms });
  state.lastWatered = Date.now();
  state.waterLocked = true;
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
    if (!e.message.includes("does not exist")) {
      console.error("alert_logs insert error:", e.message);
    }
  }
}

module.exports = { runRules, PLANT_CONFIG };
