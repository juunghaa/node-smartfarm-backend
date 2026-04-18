// src/controllers/plantController.js
const { pool } = require("../db/pool");
const { recommendPlants } = require("../services/plantService");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// POST /api/plant/recommend
async function recommend(req, res) {
  try {
    const {
      locationType,   // "indoor" | "outdoor"
      lightLevel,     // "low" | "medium" | "high"
      waterFreq,      // "low" | "medium" | "high"
      bugSensitive,   // true | false
    } = req.body;

    if (!locationType) {
      return res.status(400).json({ error: "locationType은 필수입니다" });
    }

    // 1. 조건 매칭으로 식물 후보 추출
    const plants = await recommendPlants({ locationType, lightLevel, waterFreq, bugSensitive });

    if (plants.length === 0) {
      return res.json({ plants: [], message: "조건에 맞는 식물이 없습니다" });
    }

    // 2. Gemini로 추천 이유 생성
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const prompt = `
당신은 식물 전문가입니다. 사용자 환경에 맞는 식물 추천 이유를 친근하게 설명해주세요.

사용자 환경:
- 위치: ${locationType === "indoor" ? "실내" : "실외"}
- 채광: ${lightLevel === "low" ? "적음" : lightLevel === "medium" ? "보통" : "많음"}
- 물주기 가능 빈도: ${waterFreq === "low" ? "가끔 (바쁜 편)" : waterFreq === "medium" ? "보통" : "자주 가능"}
- 벌레 민감도: ${bugSensitive ? "매우 싫어함" : "보통"}

추천 식물: ${plants.map(p => p.name_ko).join(", ")}

각 식물별로 2문장 이내로 추천 이유를 설명해주세요.
응답 형식은 반드시 JSON으로만 해주세요:
{
  "sansevieria": "추천 이유",
  "monstera": "추천 이유"
}
    `.trim();

    const result = await model.generateContent(prompt);
    let reasons = {};

    try {
      const text = result.response.text()
        .replace(/```json/g, "").replace(/```/g, "").trim();
      reasons = JSON.parse(text);
    } catch {
      // Gemini 파싱 실패해도 추천 결과는 반환
      console.warn("Gemini 응답 파싱 실패, 기본 설명 사용");
    }

    // 3. 응답 조합
    const response = plants.map(plant => ({
      plantKey:     plant.plant_key,
      nameKo:       plant.name_ko,
      locationType: plant.location_type,
      difficulty:   plant.difficulty,
      bugResistant: plant.bug_resistant,
      lightLevel:   plant.light_level,
      waterFreq:    plant.water_freq,
      description:  plant.description,
      imageUrl:     plant.image_url,
      reason:       reasons[plant.plant_key] ?? plant.description,
    }));

    res.json({ plants: response });
  } catch (e) {
    console.error("/api/plant/recommend error:", e.message);
    res.status(500).json({ error: e.message });
  }
}

// POST /api/plant/register
async function register(req, res) {
  try {
    const { greenhouseId = "gh1", plantKey } = req.body;

    if (!plantKey) {
      return res.status(400).json({ error: "plantKey는 필수입니다" });
    }

    // 1. user_plants에 저장
    await pool.query(
      `INSERT INTO user_plants (greenhouse_id, plant_key)
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [greenhouseId, plantKey]
    );

    // 2. greenhouses 테이블 plant_type도 업데이트
    await pool.query(
      `UPDATE greenhouses SET plant_type = $1 WHERE greenhouse_id = $2`,
      [plantKey, greenhouseId]
    );

    res.json({ ok: true, greenhouseId, plantKey });
  } catch (e) {
    console.error("/api/plant/register error:", e.message);
    res.status(500).json({ error: e.message });
  }
}

// GET /api/plant/list
async function list(req, res) {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM plants ORDER BY difficulty, name_ko`
    );
    res.json(rows);
  } catch (e) {
    console.error("/api/plant/list error:", e.message);
    res.status(500).json({ error: e.message });
  }
}

module.exports = { recommend, register, list };
