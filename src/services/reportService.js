// src/services/reportService.js
const cron = require("node-cron");
const { pool } = require("../db/pool");
const { askGemini } = require("./aiService");

function toNumberOrNull(value) {
  if (value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isNaN(n) ? null : n;
}

function getTodayDateString() {
  return new Date().toISOString().slice(0, 10);
}

function isValidDateString(date) {
  if (typeof date !== "string") return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const d = new Date(`${date}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) return false;
  return d.toISOString().slice(0, 10) === date;
}

function calculateRiskLevel({ avgTemp, avgHumidity, avgSoil, alertCount }) {
  const tempHigh = avgTemp !== null && avgTemp >= 35;
  const humidityVeryHigh = avgHumidity !== null && avgHumidity >= 90;
  const humidityHigh = avgHumidity !== null && avgHumidity >= 80;
  const soilLow = avgSoil !== null && avgSoil < 20;
  const alertsHigh = alertCount >= 5;
  const alertsMedium = alertCount >= 2;

  if (tempHigh || humidityVeryHigh || alertsHigh) return "high";
  if (humidityHigh || soilLow || alertsMedium) return "medium";
  return "low";
}

function buildDefaultNarrative({ avgTemp, avgHumidity, avgSoil, avgLux, alertCount, riskLevel }) {
  let summary;
  if (riskLevel === "high") {
    summary = "오늘 온실 환경은 위험 수준이 높아 빠른 점검이 필요합니다.";
  } else if (riskLevel === "medium") {
    summary = "오늘 온실은 전반적으로 관리 가능하지만 일부 환경 지표 점검이 필요합니다.";
  } else {
    summary = "오늘 온실 환경은 전반적으로 안정적입니다.";
  }

  const recommendations = [];

  if (avgSoil !== null && avgSoil < 20) {
    recommendations.push("토양 수분이 낮아 관수 장치와 급수 일정을 확인하세요.");
  }
  if (avgHumidity !== null && avgHumidity >= 80) {
    recommendations.push("습도가 높은 편이므로 환기 또는 제습을 고려하세요.");
  }
  if (avgTemp !== null && avgTemp >= 35) {
    recommendations.push("온도가 높아 차광 및 환기 상태를 우선 점검하세요.");
  }
  if (avgLux !== null && avgLux < 150) {
    recommendations.push("조도가 낮아 보조 조명 상태를 확인하세요.");
  }
  if (alertCount >= 2) {
    recommendations.push("알림 발생 빈도가 높아 센서와 제어 로그를 함께 점검하세요.");
  }

  if (recommendations.length === 0) {
    recommendations.push("현재 상태를 유지하면서 정기 점검을 지속하세요.");
  }

  return {
    summary,
    recommendations,
  };
}

async function buildNarrativeWithGeminiIfAvailable(context, fallback) {
  if (!process.env.GEMINI_API_KEY) return fallback;

  const prompt = `
당신은 스마트팜 분석 어시스턴트입니다.
아래 데이터를 바탕으로 일일 리포트를 JSON으로 작성해주세요.

데이터:
- 온실 ID: ${context.greenhouseId}
- 날짜: ${context.date}
- 평균 온도: ${context.avgTemp ?? "측정 없음"}
- 평균 습도: ${context.avgHumidity ?? "측정 없음"}
- 평균 토양수분: ${context.avgSoil ?? "측정 없음"}
- 평균 조도: ${context.avgLux ?? "측정 없음"}
- 알림 개수: ${context.alertCount}
- 위험도: ${context.riskLevel}

응답 형식(JSON only):
{
  "summary": "한 문단 요약",
  "recommendations": ["행동 권고1", "행동 권고2"]
}
`.trim();

  try {
    const result = await askGemini(prompt, true);
    const summary = typeof result?.summary === "string" ? result.summary.trim() : "";
    const recommendations = Array.isArray(result?.recommendations)
      ? result.recommendations.filter((v) => typeof v === "string" && v.trim().length > 0)
      : [];

    if (!summary) return fallback;
    if (recommendations.length === 0) return fallback;

    return {
      summary,
      recommendations,
    };
  } catch (e) {
    console.error("Gemini report fallback:", e.code || e.message);
    return fallback;
  }
}

async function aggregateDailyData(greenhouseId, date) {
  const { rows: sensorRows } = await pool.query(
    `SELECT
       ROUND(AVG(temperature)::numeric, 1) AS avg_temp,
       ROUND(AVG(humidity)::numeric, 1) AS avg_humidity,
       ROUND(AVG(soil_moisture)::numeric, 1) AS avg_soil,
       ROUND(AVG(lux)::numeric, 1) AS avg_lux,
       COUNT(*)::int AS data_count
     FROM sensor_readings
     WHERE greenhouse_id = $1
       AND ts >= $2::date
       AND ts < ($2::date + INTERVAL '1 day')`,
    [greenhouseId, date]
  );

  const { rows: alertRows } = await pool.query(
    `SELECT alert_type, COUNT(*)::int AS cnt
     FROM alert_logs
     WHERE greenhouse_id = $1
       AND created_at >= $2::date
       AND created_at < ($2::date + INTERVAL '1 day')
     GROUP BY alert_type`,
    [greenhouseId, date]
  );

  const sensor = sensorRows[0] ?? {};
  const alertTypeCounts = {};
  let alertCount = 0;
  for (const row of alertRows) {
    const count = Number(row.cnt) || 0;
    alertTypeCounts[row.alert_type] = count;
    alertCount += count;
  }

  return {
    avgTemp: toNumberOrNull(sensor.avg_temp),
    avgHumidity: toNumberOrNull(sensor.avg_humidity),
    avgSoil: toNumberOrNull(sensor.avg_soil),
    avgLux: toNumberOrNull(sensor.avg_lux),
    dataCount: Number(sensor.data_count) || 0,
    alertCount,
    alertTypeCounts,
  };
}

function mapReportRow(row) {
  if (!row) return null;
  return {
    greenhouseId: row.greenhouse_id,
    date: row.report_date,
    avgTemp: toNumberOrNull(row.avg_temp),
    avgHumidity: toNumberOrNull(row.avg_humidity),
    avgSoil: toNumberOrNull(row.avg_soil),
    avgLux: toNumberOrNull(row.avg_lux),
    dataCount: Number(row.data_count) || 0,
    alertCount: Number(row.alert_count) || 0,
    alertTypeCounts: row.alert_types ?? {},
    riskLevel: row.risk_level ?? "low",
    summary: row.report_text ?? "",
    recommendations: Array.isArray(row.recommendations) ? row.recommendations : [],
    createdAt: row.created_at,
  };
}

async function saveDailyReport(greenhouseId, date) {
  if (!isValidDateString(date)) {
    throw new Error("Invalid date format. Use YYYY-MM-DD");
  }

  const aggregated = await aggregateDailyData(greenhouseId, date);
  const riskLevel = calculateRiskLevel(aggregated);

  const fallbackNarrative = buildDefaultNarrative({
    ...aggregated,
    riskLevel,
  });

  const narrative = await buildNarrativeWithGeminiIfAvailable(
    {
      greenhouseId,
      date,
      ...aggregated,
      riskLevel,
    },
    fallbackNarrative
  );

  const { rows } = await pool.query(
    `INSERT INTO daily_reports
       (greenhouse_id, report_date, avg_temp, avg_humidity, avg_soil, avg_lux, data_count, alert_count, alert_types, risk_level, report_text, recommendations)
     VALUES ($1, $2::date, $3, $4, $5, $6, $7, $8, $9::jsonb, $10, $11, $12::jsonb)
     ON CONFLICT (greenhouse_id, report_date)
     DO UPDATE SET
       avg_temp = EXCLUDED.avg_temp,
       avg_humidity = EXCLUDED.avg_humidity,
       avg_soil = EXCLUDED.avg_soil,
       avg_lux = EXCLUDED.avg_lux,
       data_count = EXCLUDED.data_count,
       alert_count = EXCLUDED.alert_count,
       alert_types = EXCLUDED.alert_types,
       risk_level = EXCLUDED.risk_level,
       report_text = EXCLUDED.report_text,
       recommendations = EXCLUDED.recommendations
     RETURNING *`,
    [
      greenhouseId,
      date,
      aggregated.avgTemp,
      aggregated.avgHumidity,
      aggregated.avgSoil,
      aggregated.avgLux,
      aggregated.dataCount,
      aggregated.alertCount,
      JSON.stringify(aggregated.alertTypeCounts),
      riskLevel,
      narrative.summary,
      JSON.stringify(narrative.recommendations),
    ]
  );

  return mapReportRow(rows[0]);
}

async function getDailyReport(greenhouseId, date) {
  if (!isValidDateString(date)) {
    throw new Error("Invalid date format. Use YYYY-MM-DD");
  }

  const { rows } = await pool.query(
    `SELECT * FROM daily_reports
     WHERE greenhouse_id = $1
       AND report_date = $2::date`,
    [greenhouseId, date]
  );
  return mapReportRow(rows[0]);
}

async function getLatestReport(greenhouseId) {
  const { rows } = await pool.query(
    `SELECT * FROM daily_reports
     WHERE greenhouse_id = $1
     ORDER BY report_date DESC
     LIMIT 1`,
    [greenhouseId]
  );
  return mapReportRow(rows[0]);
}

async function listRecentReports(greenhouseId, limit = 7) {
  const safeLimit = Math.min(Math.max(Number(limit) || 7, 1), 30);
  const { rows } = await pool.query(
    `SELECT * FROM daily_reports
     WHERE greenhouse_id = $1
     ORDER BY report_date DESC
     LIMIT $2`,
    [greenhouseId, safeLimit]
  );
  return rows.map(mapReportRow);
}

// 기존 코드 호환용
async function saveReport(greenhouseId) {
  return saveDailyReport(greenhouseId, getTodayDateString());
}

function initReportScheduler() {
  // 매일 20:00 실행
  cron.schedule("0 20 * * *", async () => {
    console.log("📋 일일 리포트 스케줄러 실행");
    try {
      const { rows } = await pool.query(`SELECT greenhouse_id FROM greenhouses`);
      const today = getTodayDateString();
      for (const row of rows) {
        await saveDailyReport(row.greenhouse_id, today);
      }
    } catch (e) {
      console.error("리포트 스케줄러 오류:", e.message);
    }
  });

  console.log("📋 Report scheduler initialized");
}

module.exports = {
  initReportScheduler,
  saveReport,
  saveDailyReport,
  getDailyReport,
  getLatestReport,
  listRecentReports,
  isValidDateString,
};
