// src/services/reportService.js
const cron = require("node-cron");
const { pool } = require("../db/pool");
const { askGemini } = require("./aiService");

// ── 하루 데이터 집계 ─────────────────────────────────────
async function aggregateDailyData(greenhouseId) {
  // 오늘 날짜 기준 센서 평균 (PostgreSQL의 CURRENT_DATE 활용)
  const { rows: sensorRows } = await pool.query(
    `SELECT
       ROUND(AVG(temperature)::numeric, 1) AS avg_temp,
       ROUND(AVG(humidity)::numeric, 1)    AS avg_humidity,
       ROUND(AVG(soil_moisture)::numeric, 1) AS avg_soil
     FROM sensor_readings
     WHERE greenhouse_id = $1
       AND ts >= CURRENT_DATE
       AND ts < CURRENT_DATE + INTERVAL '1 day'`,
    [greenhouseId]
  );

  // 오늘 발생한 알림 목록
  const { rows: alertRows } = await pool.query(
    `SELECT alert_type, message, created_at
     FROM alert_logs
     WHERE greenhouse_id = $1
       AND created_at >= CURRENT_DATE
       AND created_at < CURRENT_DATE + INTERVAL '1 day'
     ORDER BY created_at ASC`,
    [greenhouseId]
  );

  // 오늘 관수 횟수
  const { rows: waterRows } = await pool.query(
    `SELECT COUNT(*) AS count
     FROM actuator_logs
     WHERE greenhouse_id = $1
       AND actuator = 'pump'
       AND action = 'ON'
       AND ts >= CURRENT_DATE`,
    [greenhouseId]
  );

  return {
    sensor: sensorRows[0] || {},
    alerts: alertRows,
    wateringCount: parseInt(waterRows[0]?.count ?? 0),
  };
}

// ── Gemini 리포트 생성 ───────────────────────────────────
async function generateReport(greenhouseId) {
  // 온실 식물 정보 조회 (JOIN을 써서 한 번에 가져오기)
  const { rows: ghRows } = await pool.query(
    `SELECT g.plant_type, p.name_ko
     FROM greenhouses g
     LEFT JOIN plants p ON g.plant_type = p.plant_key
     WHERE g.greenhouse_id = $1`,
    [greenhouseId]
  );
  const plantName = ghRows[0]?.name_ko ?? "식물";

  const { sensor, alerts, wateringCount } = await aggregateDailyData(greenhouseId);

  // 알림 요약 로직 (가독성 좋게 유지)
  const alertSummary = alerts.length === 0
    ? "오늘은 특이 알림 없음"
    : alerts.map(a => {
        const typeMap = {
          humidity_high: "습도 높음",
          humidity_low:  "습도 낮음",
          temp_high:     "고온 경보",
          temp_low:      "저온 경보",
          pest_risk_high:"병해충 위험",
        };
        return `- ${typeMap[a.alert_type] ?? a.alert_type}: ${a.message}`;
      }).join("\n");

  const prompt = `
당신은 친근한 식물 관리 AI 도우미입니다.
오늘 하루 식물 상태를 카카오톡 메시지 스타일로 리포트해주세요.

[오늘의 식물 정보]
- 식물: ${plantName}
- 평균 온도: ${sensor.avg_temp ?? "측정 없음"}°C
- 평균 습도: ${sensor.avg_humidity ?? "측정 없음"}%
- 평균 토양 수분: ${sensor.avg_soil ?? "측정 없음"}%
- 자동 관수 횟수: ${wateringCount}회
- 오늘 알림:
${alertSummary}

작성 규칙:
1. 이모지를 적절히 사용해주세요
2. 3~5문장 이내로 짧고 친근하게
3. 식물 상태 평가 → 오늘 특이사항 → 내일 관리 팁 순서로
4. 말투는 "~했어요", "~해요" 처럼 친근하게
5. 전문 용어 사용 금지
  `.trim();

  try {
    // 헬퍼 함수 호출 (JSON이 아닌 일반 텍스트 리포트이므로 false)
    return await askGemini(prompt, false);
  } catch (e) {
    console.error("Gemini 리포트 생성 실패:", e.message);
    // 폴백(Fallback) 메시지: AI가 실패해도 최소한의 정보는 전달
    return `오늘 ${plantName} 상태 요약: 평균 온도 ${sensor.avg_temp ?? "?"}°C, 습도 ${sensor.avg_humidity ?? "?"}%였고, 관수는 ${wateringCount}회 진행했어요. 내일도 힘내봐요! 🌱`;
  }
}

// ── 리포트 저장 (UPSERT 로직 유지) ────────────────────────
async function saveReport(greenhouseId) {
  const { sensor, alerts, wateringCount } = await aggregateDailyData(greenhouseId);
  const reportText = await generateReport(greenhouseId);

  await pool.query(
    `INSERT INTO daily_reports
       (greenhouse_id, report_date, avg_temp, avg_humidity, avg_soil, alert_count, report_text)
     VALUES ($1, CURRENT_DATE, $2, $3, $4, $5, $6)
     ON CONFLICT (greenhouse_id, report_date)
     DO UPDATE SET
       avg_temp    = EXCLUDED.avg_temp,
       avg_humidity = EXCLUDED.avg_humidity,
       avg_soil    = EXCLUDED.avg_soil,
       alert_count = EXCLUDED.alert_count,
       report_text = EXCLUDED.report_text`,
    [
      greenhouseId,
      sensor.avg_temp,
      sensor.avg_humidity,
      sensor.avg_soil,
      alerts.length,
      reportText,
    ]
  );

  console.log(`📋 [${greenhouseId}] 일일 리포트 저장 완료`);
  return reportText;
}

// ── 스케줄러 초기화 ──────────────────────────────────────
function initReportScheduler() {
  // 매일 20:00 실행 (프로젝트 마감 전 테스트할 때는 시간 조절해서 써!)
  cron.schedule("0 20 * * *", async () => {
    console.log("📋 일일 리포트 스케줄러 실행");
    try {
      const { rows } = await pool.query(`SELECT greenhouse_id FROM greenhouses`);
      for (const row of rows) {
        await saveReport(row.greenhouse_id);
      }
    } catch (e) {
      console.error("리포트 스케줄러 오류:", e.message);
    }
  });

  console.log("📋 Report scheduler initialized");
}

module.exports = { initReportScheduler, saveReport };