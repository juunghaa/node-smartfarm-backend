// src/services/diseaseService.js
const fs = require("fs");
const axios = require("axios");
const FormData = require("form-data");
const { DISEASE_AI_URL } = require("../config");

class DiseaseServiceError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.name = "DiseaseServiceError";
    this.statusCode = statusCode;
  }
}

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
    throw new DiseaseServiceError(
      "질병 분석 서버 URL이 설정되지 않았습니다. DISEASE_AI_URL을 확인해주세요.",
      503
    );
  }

  try {
    const sendRequest = async (fieldName) => {
      const form = new FormData();
      form.append(fieldName, fs.createReadStream(imagePath));
      return axios.post(DISEASE_AI_URL, form, {
        headers: form.getHeaders(),
        timeout: 30000,
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
      });
    };

    let response;
    try {
      response = await sendRequest("file");
    } catch (firstErr) {
      // FastAPI schema compatibility: some servers expect `image` instead of `file`.
      if (firstErr.response?.status === 422) {
        response = await sendRequest("image");
      } else {
        throw firstErr;
      }
    }

    // TODO: prediction result를 disease_logs 테이블에 저장
    // TODO: result === "disease"이면 alert_logs에 병해 의심 알림 생성
    return normalizePrediction(response.data);
  } catch (e) {
    if (e.code === "ECONNABORTED") {
      throw new DiseaseServiceError("질병 분석 서버 응답 시간이 초과되었습니다.", 504);
    }
    if (e.code === "ECONNREFUSED" || e.code === "ENOTFOUND") {
      throw new DiseaseServiceError("질병 분석 서버에 연결할 수 없습니다.", 502);
    }

    const status = e.response?.status;
    const body = e.response?.data;
    console.error("[diseaseService] AI server call failed:", status, body ?? e.message);
    if (status && status >= 400 && status < 500) {
      throw new DiseaseServiceError("질병 분석 요청 형식이 올바르지 않습니다.", 502);
    }
    throw new DiseaseServiceError("AI 질병 분석 서버 호출에 실패했습니다.", 502);
  }
}

module.exports = {
  predictDisease,
  DiseaseServiceError,
};
