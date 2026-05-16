// src/services/diseaseService.js
const fs = require("fs");
const axios = require("axios");
const FormData = require("form-data");
const crypto = require("crypto");
const {
  DISEASE_AI_URL,
  DISEASE_AI_TIMEOUT_MS,
  AI_MAX_RETRIES,
  AI_RETRY_BASE_DELAY_MS,
  AI_WARMUP_ENABLED,
  AI_WARMUP_INTERVAL_MS,
} = require("../config");

function resolveAiUrls(rawUrl) {
  const normalized = (rawUrl || "").trim().replace(/\/+$/, "");
  const baseUrl = normalized.endsWith("/predict")
    ? normalized.slice(0, -"/predict".length)
    : normalized;
  const predictUrl = `${baseUrl}/predict`;
  const healthUrl = `${baseUrl}/health`;
  return { normalized, baseUrl, predictUrl, healthUrl };
}

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

async function predictDisease(imagePath, externalRequestId) {
  if (!DISEASE_AI_URL) {
    throw new DiseaseServiceError(
      "질병 분석 서버 URL이 설정되지 않았습니다. DISEASE_AI_URL을 확인해주세요.",
      503
    );
  }

  const requestId = externalRequestId || crypto.randomUUID();
  const startedAt = Date.now();
  const { baseUrl, predictUrl } = resolveAiUrls(DISEASE_AI_URL);
  console.log(`[diseaseService] requestId=${requestId} AI baseURL=${baseUrl} endpoint=${predictUrl}`);

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const totalAttempts = Math.max(1, AI_MAX_RETRIES + 1);

  const sendRequest = async (fieldName) => {
    const form = new FormData();
    // Retry-safe: recreate stream/form payload for every attempt.
    form.append(fieldName, fs.createReadStream(imagePath));
    return axios.post(predictUrl, form, {
      headers: form.getHeaders(),
      timeout: DISEASE_AI_TIMEOUT_MS,
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
      validateStatus: () => true,
    });
  };

  const isRetriableError = (err) => {
    const status = err?.response?.status;
    const code = err?.code;
    if (status === 502 || status === 503 || status === 504) return true;
    if (code === "ECONNABORTED") return true;
    if (code === "ECONNRESET" || code === "ECONNREFUSED" || code === "ENOTFOUND" || code === "EAI_AGAIN") {
      return true;
    }
    return false;
  };

  const executeAttempt = async (attempt) => {
    let response = await sendRequest("file");
    if (response.status === 422) {
      // FastAPI schema compatibility: some servers expect `image` instead of `file`.
      response = await sendRequest("image");
    }

    if (response.status >= 400) {
      const err = new Error(`AI server returned HTTP ${response.status}`);
      err.response = response;
      throw err;
    }
    return response;
  };

  let lastError = null;

  for (let attempt = 1; attempt <= totalAttempts; attempt += 1) {
    const attemptStartedAt = Date.now();
    try {
      const response = await executeAttempt(attempt);
      const elapsedMs = Date.now() - startedAt;
      console.log(
        `[diseaseService] requestId=${requestId} attempt=${attempt}/${totalAttempts} success elapsedMs=${elapsedMs}`
      );

      // TODO: prediction result를 disease_logs 테이블에 저장
      // TODO: result === "disease"이면 alert_logs에 병해 의심 알림 생성
      return normalizePrediction(response.data);
    } catch (e) {
      lastError = e;
      const status = e.response?.status;
      const code = e.code ?? "UNKNOWN";
      const attemptElapsedMs = Date.now() - attemptStartedAt;
      const retriable = isRetriableError(e);

      console.warn(
        `[diseaseService] requestId=${requestId} attempt=${attempt}/${totalAttempts} failed status=${status ?? "-"} code=${code} retriable=${retriable} attemptElapsedMs=${attemptElapsedMs}`
      );

      if (!retriable || attempt >= totalAttempts) break;

      const backoffMs = AI_RETRY_BASE_DELAY_MS * (2 ** (attempt - 1));
      console.warn(`[diseaseService] requestId=${requestId} backoffMs=${backoffMs} before next retry`);
      await sleep(backoffMs);
    }
  }

  const finalElapsedMs = Date.now() - startedAt;
  const finalStatus = lastError?.response?.status;
  const finalCode = lastError?.code ?? "UNKNOWN";
  console.error(
    `[diseaseService] requestId=${requestId} final_failure attempts=${totalAttempts} elapsedMs=${finalElapsedMs} lastStatus=${finalStatus ?? "-"} lastCode=${finalCode}`
  );

  if (finalStatus && finalStatus >= 400 && finalStatus < 500) {
    throw new DiseaseServiceError("질병 분석 요청 형식이 올바르지 않습니다.", 502);
  }
  throw new DiseaseServiceError("AI 질병 분석 서버 호출에 실패했습니다.", 502);
}

async function warmupAiServer() {
  if (!DISEASE_AI_URL) return;
  const { baseUrl, predictUrl, healthUrl } = resolveAiUrls(DISEASE_AI_URL);
  try {
    console.log(`[diseaseService] warmup baseURL=${baseUrl} endpoint=${predictUrl} health=${healthUrl}`);
    const response = await axios.get(healthUrl, {
      timeout: Math.min(DISEASE_AI_TIMEOUT_MS, 5000),
      validateStatus: () => true,
    });
    console.log(`[diseaseService] warmup /health status=${response.status}`);
  } catch (e) {
    console.warn(`[diseaseService] warmup /health failed: ${e.code ?? e.message}`);
  }
}

function initDiseaseAiWarmup() {
  if (!AI_WARMUP_ENABLED) {
    console.log("[diseaseService] AI warmup disabled");
    return;
  }

  warmupAiServer().catch(() => {});
  setInterval(() => {
    warmupAiServer().catch(() => {});
  }, Math.max(60000, AI_WARMUP_INTERVAL_MS));
  console.log(`[diseaseService] AI warmup enabled intervalMs=${Math.max(60000, AI_WARMUP_INTERVAL_MS)}`);
}

module.exports = {
  predictDisease,
  DiseaseServiceError,
  initDiseaseAiWarmup,
};
