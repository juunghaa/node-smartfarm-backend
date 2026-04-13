// src/services/ruleEngine.js
const { pool } = require("../db/pool");

// 자동 물주기 상태값
let lastWatered = 0;
let wateringLocked = false;
const COOLDOWN_MS = 15000;
const ON_THRESHOLD = 30;
const OFF_THRESHOLD = 40;
const DURATION_MS = 8000;

async function runRules(data, publishFn) {
  const { greenhouseId = "gh1", soil } = data;
  const now = Date.now();

  if (Number.isNaN(soil)) return;

  // ── 룰 1: 자동 관수 (히스테리시스) ──────────────────────
  if (wateringLocked && soil >= OFF_THRESHOLD) {
    wateringLocked = false;
    console.log("🔓 Watering unlocked");
  }

  if (!wateringLocked && soil < ON_THRESHOLD && now - lastWatered > COOLDOWN_MS) {
    console.log(`💧 Auto watering triggered (soil=${soil})`);
    publishFn("pump", { action: "ON", duration: DURATION_MS });
    lastWatered = now;
    wateringLocked = true;

    try {
      await pool.query(
        `INSERT INTO actuator_logs (greenhouse_id, actuator, action, duration_ms)
         VALUES ($1, $2, $3, $4)`,
        [greenhouseId, "pump", "ON", DURATION_MS]
      );
    } catch (e) {
      console.error("actuator_logs insert error:", e.message);
    }
  }

  // ── 룰 2: 환기 알림 (humidity > 70) ────────────────────
  if (data.humidity > 70) {
    console.log(`🌬️ High humidity (${data.humidity}%) → window open recommended`);
    publishFn("window", { action: "OPEN" });
  }

  // ── 룰 3: 병해충 위험도 판단 ────────────────────────────
  if (data.temperature > 25 && data.humidity > 60) {
    console.log("🐛 Pest risk HIGH");
    // 나중에 DB 저장 or 알림 로직 추가
  }

  // ── 룰 4: 야간 LED OFF ──────────────────────────────────
  const hour = new Date().getHours();
  if (hour >= 20 || hour < 6) {
    publishFn("led", { action: "OFF" });
  }
}

module.exports = { runRules };
