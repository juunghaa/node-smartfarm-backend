// src/services/diseaseService.js
const fs = require("fs");
const axios = require("axios");
const FormData = require("form-data");
const { DISEASE_AI_URL } = require("../config");

function normalizePrediction(raw = {}) {
  return {
    result: raw.result ?? null,
    label: raw.label ?? null,
    classIndex: raw.class_index ?? null,
    confidence: raw.confidence ?? null,
    probabilities: raw.probabilities ?? null,
    message: raw.message ?? null,
  };
}

async function predictDisease(imagePath) {
  if (!DISEASE_AI_URL) {
    throw new Error("DISEASE_AI_URL is missing");
  }

  const form = new FormData();
  form.append("file", fs.createReadStream(imagePath));

  try {
    const response = await axios.post(DISEASE_AI_URL, form, {
      headers: form.getHeaders(),
      timeout: 30000,
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
    });

    // TODO: prediction result를 disease_logs 테이블에 저장
    // TODO: result === "disease"이면 alert_logs에 병해 의심 알림 생성
    return normalizePrediction(response.data);
  } catch (e) {
    const status = e.response?.status;
    const body = e.response?.data;
    console.error("[diseaseService] AI server call failed:", status, body ?? e.message);
    throw new Error("AI 질병 분석 서버 호출에 실패했습니다.");
  }
}

module.exports = {
  predictDisease,
};
