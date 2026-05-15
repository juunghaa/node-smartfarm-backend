// src/services/weatherService.js

const cron = require("node-cron");
// cron은 Node.js에서 정해진 시간에 자동으로 작업을 실행하게 해주는 스케줄링 도구

const { pool } = require("../db/pool");
const {
  OPENWEATHER_API_KEY,
  OPENWEATHER_LAT,
  OPENWEATHER_LON,
} = require("../config");

async function fetchAndSaveWeather(greenhouseId, locationType = "outdoor") {
  if (!greenhouseId) {
    throw new Error("greenhouseId is required");
  }
  try {
    // 온실 위치 먼저 조회
    const { rows } = await pool.query(
      `SELECT lat, lon, location_type, use_sensor
       FROM greenhouses
       WHERE greenhouse_id = $1`,
      [greenhouseId]
    );
    const greenhouse = rows[0] ?? {};
    const lat = greenhouse.lat ?? OPENWEATHER_LAT;
    const lon = greenhouse.lon ?? OPENWEATHER_LON;
    const effectiveLocationType = greenhouse.location_type ?? locationType;
    const useSensor = greenhouse.use_sensor === true;
    
    const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_API_KEY}&units=metric&cnt=2`;
    
    const res = await fetch(url);
    if (!res.ok) throw new Error(`OpenWeather API error: ${res.status}`);

    const json = await res.json();
    const current = json.list[0];

    const outdoor_temp     = current.main.temp;
    const outdoor_humidity = current.main.humidity;
    const rain_prob        = Math.round((current.pop ?? 0) * 100); // 0~100%
    const weather_desc     = current.weather[0]?.description ?? "";

    await pool.query(
      `INSERT INTO weather_logs
         (greenhouse_id, location_type, outdoor_temp, outdoor_humidity, rain_prob, weather_desc)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [greenhouseId, effectiveLocationType, outdoor_temp, outdoor_humidity, rain_prob, weather_desc]
    );

    // 실외 + 센서 미사용 온실은 날씨값을 센서 대체값으로 자동 적재
    if (effectiveLocationType === "outdoor" && !useSensor) {
      await pool.query(
        `INSERT INTO sensor_readings (greenhouse_id, temperature, humidity, soil_moisture, ts)
         VALUES ($1, $2, $3, $4, $5)`,
        [greenhouseId, outdoor_temp, outdoor_humidity, null, new Date()]
      );
      console.log(`🌤️ Weather fallback saved to sensor_readings: ${greenhouseId}`);
    }

    console.log(`🌤️ Weather saved: ${outdoor_temp}°C, 강수확률 ${rain_prob}%, ${weather_desc}`);
    return { outdoor_temp, outdoor_humidity, rain_prob, weather_desc };
  } catch (e) {
    console.error("fetchAndSaveWeather error:", e.message);
    return null;
  }
}

async function getLatestWeather(greenhouseId) {
  if (!greenhouseId) {
    throw new Error("greenhouseId is required");
  }
  const { rows } = await pool.query(
    `SELECT * FROM weather_logs
     WHERE greenhouse_id = $1
     ORDER BY fetched_at DESC LIMIT 1`,
    [greenhouseId]
  );
  return rows[0] ?? null;
}

async function fetchAndSaveWeatherForAllGreenhouses() {
  const { rows } = await pool.query(
    `SELECT greenhouse_id, location_type FROM greenhouses`
  );
  for (const row of rows) {
    await fetchAndSaveWeather(row.greenhouse_id, row.location_type ?? "outdoor");
  }
}

function initWeatherScheduler() {
  // 10분마다 날씨 수집 */10 * * * *
  // 30분마다 날씨 수집 */30 * * * *
  // 매시간 0분마다 날씨 수집 0 * * * *
  // 매일 0시마다 날씨 수집 0 0 * * *
  cron.schedule("0 * * * *", () => {
    console.log("⏰ Weather scheduler triggered");
    fetchAndSaveWeatherForAllGreenhouses().catch((e) => {
      console.error("weather scheduler error:", e.message);
    });
  });

  // 서버 시작할 때 한 번 즉시 실행
  fetchAndSaveWeatherForAllGreenhouses().catch((e) => {
    console.error("initial weather fetch error:", e.message);
  });
  console.log("🌤️ Weather scheduler initialized");
}

module.exports = { initWeatherScheduler, fetchAndSaveWeather, getLatestWeather };
