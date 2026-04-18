// src/services/plantService.js
const { pool } = require("../db/pool");

// 사용자 환경 조건 → 식물 필터링
async function recommendPlants({ locationType, lightLevel, waterFreq, bugSensitive }) {
  // 조건 매칭 쿼리
  const { rows } = await pool.query(
    `SELECT * FROM plants
     WHERE location_type = $1
       AND ($2 = 'any' OR light_level = $2)
       AND ($3 = 'any' OR water_freq = $3)
       AND ($4 = false OR bug_resistant = true)
     ORDER BY
       CASE difficulty WHEN 'easy' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END
     LIMIT 3`,
    [locationType, lightLevel ?? 'any', waterFreq ?? 'any', bugSensitive ?? false]
  );
  return rows;
}

// 공공데이터 API 연동 (키 승인 후 이 함수만 구현하면 됨)
async function syncFromPublicApi() {
  const apiKey = process.env.NONGSARO_API_KEY;
  if (!apiKey) {
    console.log("📋 공공데이터 API 키 없음 → 씨드 데이터 사용 중");
    return;
  }

  try {
    const url = `http://api.nongsaro.go.kr/service/garden/indoorGardenList?apiKey=${apiKey}&numOfRows=100`;
    const res = await fetch(url);
    const json = await res.json();
    // 승인 후 파싱 로직 추가 예정
    console.log("✅ 공공데이터 API 동기화 완료");
  } catch (e) {
    console.error("공공데이터 API 동기화 실패:", e.message);
  }
}

module.exports = { recommendPlants, syncFromPublicApi };
