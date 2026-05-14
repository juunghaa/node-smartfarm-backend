// src/controllers/plantController.js
const { pool } = require("../db/pool");
const { recommendPlants } = require("../services/plantService");
const { askGemini } = require("../services/aiService");
const { requireGreenhouseId } = require("../utils/requestUtils");

const LOCATION_TYPES = ["indoor", "outdoor"];
const LEVEL_TYPES = ["low", "medium", "high"];
const PG_FOREIGN_KEY_VIOLATION = "23503";

function normalizePlantKey(value) {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  return normalized.length > 0 ? normalized : null;
}

function mapPlantResponse(plant, reasons = {}) {
  return {
    plantKey: plant.plant_key,
    nameKo: plant.name_ko,
    locationType: plant.location_type,
    difficulty: plant.difficulty,
    bugResistant: plant.bug_resistant,
    lightLevel: plant.light_level,
    waterFreq: plant.water_freq,
    description: plant.description,
    imageUrl: plant.image_url,
    reason: reasons[plant.plant_key] ?? plant.description,
  };
}

function lightLevelToText(lightLevel) {
  if (lightLevel === "low") return "적음";
  if (lightLevel === "medium") return "보통";
  if (lightLevel === "high") return "많음";
  return "미입력";
}

function waterFreqToText(waterFreq) {
  if (waterFreq === "low") return "가끔 (바쁜 편)";
  if (waterFreq === "medium") return "보통";
  if (waterFreq === "high") return "자주 가능";
  return "미입력";
}

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
    if (!LOCATION_TYPES.includes(locationType)) {
      return res.status(400).json({ error: "locationType은 indoor 또는 outdoor 여야 합니다" });
    }
    if (lightLevel !== undefined && !LEVEL_TYPES.includes(lightLevel)) {
      return res.status(400).json({ error: "lightLevel은 low|medium|high 중 하나여야 합니다" });
    }
    if (waterFreq !== undefined && !LEVEL_TYPES.includes(waterFreq)) {
      return res.status(400).json({ error: "waterFreq는 low|medium|high 중 하나여야 합니다" });
    }
    if (bugSensitive !== undefined && typeof bugSensitive !== "boolean") {
      return res.status(400).json({ error: "bugSensitive는 boolean 값이어야 합니다" });
    }

    // 1. 조건 매칭으로 식물 후보 추출
    const plants = await recommendPlants({
      locationType,
      lightLevel,
      waterFreq,
      bugSensitive,
    });

    if (plants.length === 0) {
      return res.json({ plants: [], message: "조건에 맞는 식물이 없습니다" });
    }
    // 2. Gemini로 추천 이유 생성
    const prompt = `
당신은 식물 전문가입니다. 사용자 환경에 맞는 식물 추천 이유를 친근하게 설명해주세요.

사용자 환경:
- 위치: ${locationType === "indoor" ? "실내" : "실외"}
- 채광: ${lightLevelToText(lightLevel)}
- 물주기 가능 빈도: ${waterFreqToText(waterFreq)}
- 벌레 민감도: ${bugSensitive ? "매우 싫어함" : "보통"}

추천 식물: ${plants.map(p => p.name_ko).join(", ")}

각 식물별로 2문장 이내로 추천 이유를 설명해주세요.
응답 형식은 반드시 JSON으로만 해주세요:
{
  "sansevieria": "추천 이유",
  "monstera": "추천 이유"
}
    `.trim();

    let reasons = {};

    try {
      reasons = await askGemini(prompt, true);
    } catch (err) {
      console.error("[recommend] askGemini 실패:", err.code || err.message);
      reasons = {};
    }

    const response = plants.map((plant) => mapPlantResponse(plant, reasons));

    res.json({ plants: response });
  } catch (e) {
    console.error("/api/plant/recommend error:", e.message);
    res.status(500).json({ error: "추천 서비스 일시적 오류가 발생했습니다." });
  }
}

// POST /api/plant/register
async function register(req, res) {
  let client;
  try {
    const greenhouseId = requireGreenhouseId(req.body, res);
    if (!greenhouseId) return;

    const normalizedPlantKey = normalizePlantKey(req.body?.plantKey);
    if (!normalizedPlantKey) {
      return res.status(400).json({ error: "plantKey는 필수입니다" });
    }

    client = await pool.connect();
    await client.query("BEGIN");

    const plantResult = await client.query(
      `SELECT plant_key FROM plants WHERE plant_key = $1`,
      [normalizedPlantKey]
    );
    if (plantResult.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        error: `존재하지 않는 plantKey입니다: ${normalizedPlantKey}`,
      });
    }

    await client.query(
      `INSERT INTO user_plants (greenhouse_id, plant_key)
       VALUES ($1, $2)
       ON CONFLICT (greenhouse_id, plant_key) DO NOTHING`,
      [greenhouseId, normalizedPlantKey]
    );

    const updateResult = await client.query(
      `UPDATE greenhouses SET plant_type = $1 WHERE greenhouse_id = $2`,
      [normalizedPlantKey, greenhouseId]
    );
    if (updateResult.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "greenhouseId not found" });
    }

    await client.query("COMMIT");

    res.json({ ok: true, greenhouseId, plantKey: normalizedPlantKey });
  } catch (e) {
    if (client) {
      try {
        await client.query("ROLLBACK");
      } catch {
        // ignore rollback error
      }
    }
    if (e.code === PG_FOREIGN_KEY_VIOLATION) {
      return res.status(400).json({
        error: "유효하지 않은 요청입니다. greenhouseId 또는 plantKey를 확인해주세요.",
      });
    }
    console.error("/api/plant/register error:", e.message);
    res.status(500).json({ error: "식물 등록 처리 중 오류가 발생했습니다." });
  } finally {
    if (client) client.release();
  }
}

// GET /api/plant/list
async function list(req, res) {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM plants ORDER BY difficulty, name_ko`
    );
    if (rows.length === 0) {
      return res.json([]);
    }
    res.json(rows);
  } catch (e) {
    console.error("/api/plant/list error:", e.message);
    res.status(500).json({ error: "식물 목록 조회 중 오류가 발생했습니다." });
  }
}

module.exports = { recommend, register, list };
