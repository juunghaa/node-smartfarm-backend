// src/services/plantService.js
const { pool } = require("../db/pool");
const xml2js = require("xml2js");

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

// 농사로 식물 번호 매핑 (실내 식물만 가능)
const NONGSARO_ID_MAP = {
    sansevieria: "19448",
    monstera:    "16449",
  };
  
// 공공데이터 API 연동
async function syncFromPublicApi() {
    const apiKey = process.env.NONGSARO_API_KEY;
    if (!apiKey) {
      console.log("공공데이터 API 키 없음 → 씨드 데이터 사용 중");
      return;
    }
  
    console.log("농사로 API 이미지 동기화 시작...");
  
    for (const [plantKey, cntntsNo] of Object.entries(NONGSARO_ID_MAP)) {
      try {
        const url = `http://api.nongsaro.go.kr/service/garden/gardenDtl?apiKey=${apiKey}&cntntsNo=${cntntsNo}`;
        const res = await fetch(url);
        const xmlText = await res.text();
  
        // XML 파싱
        const parsed = await xml2js.parseStringPromise(xmlText, { explicitArray: false });
        const item = parsed?.response?.body?.item;
  
        if (!item) {
          console.warn(`⚠️ [${plantKey}] 식물 데이터 없음`);
          continue;
        }
  
        // 대표 이미지 URL 추출 (rtnFileUrl에서 첫 번째)
        const imageUrls = item.rtnFileUrl?._ ?? item.rtnFileUrl ?? "";
        const firstImageUrl = imageUrls.split("|")[0] ?? null;
  
        // DB 업데이트
        await pool.query(
          `UPDATE plants SET image_url = $1 WHERE plant_key = $2`,
          [firstImageUrl, plantKey]
        );
  
        console.log(`[${plantKey}] 이미지 업데이트 완료: ${firstImageUrl}`);
      } catch (e) {
        console.error(`[${plantKey}] 동기화 실패:`, e.message);
      }
    }
  
    console.log("농사로 API 동기화 완료");
  }

module.exports = { recommendPlants, syncFromPublicApi };
