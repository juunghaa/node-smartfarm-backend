// src/services/weatherService.js

const cron = require("node-cron");
// cron은 Node.js에서 정해진 시간에 자동으로 작업을 실행하게 해주는 스케줄링 도구

const { pool } = require("../db/pool");
const {
  OPENWEATHER_API_KEY,
  OPENWEATHER_LAT,
  OPENWEATHER_LON,
} = require("../config");

async function fetchAndSaveWeather(greenhouseId = "gh1", locationType = "outdoor") {
  try {
    const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${OPENWEATHER_LAT}&lon=${OPENWEATHER_LON}&appid=${OPENWEATHER_API_KEY}&units=metric&cnt=2`;

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
      [greenhouseId, locationType, outdoor_temp, outdoor_humidity, rain_prob, weather_desc]
    );

    console.log(`🌤️ Weather saved: ${outdoor_temp}°C, 강수확률 ${rain_prob}%, ${weather_desc}`);
    return { outdoor_temp, outdoor_humidity, rain_prob, weather_desc };
  } catch (e) {
    console.error("fetchAndSaveWeather error:", e.message);
    return null;
  }
}

async function getLatestWeather(greenhouseId = "gh1") {
  const { rows } = await pool.query(
    `SELECT * FROM weather_logs
     WHERE greenhouse_id = $1
     ORDER BY fetched_at DESC LIMIT 1`,
    [greenhouseId]
  );
  return rows[0] ?? null;
}

function initWeatherScheduler() {
  // 10분마다 날씨 수집 */10 * * * *
  // 30분마다 날씨 수집 */30 * * * *
  // 매시간 0분마다 날씨 수집 0 * * * *
  // 매일 0시마다 날씨 수집 0 0 * * *
  cron.schedule("0 * * * *", () => {
    console.log("⏰ Weather scheduler triggered");
    fetchAndSaveWeather();
  });

  // 서버 시작할 때 한 번 즉시 실행
  fetchAndSaveWeather();
  console.log("🌤️ Weather scheduler initialized");
}

module.exports = { initWeatherScheduler, fetchAndSaveWeather, getLatestWeather };
