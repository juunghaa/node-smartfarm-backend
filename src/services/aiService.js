// src/services/aiService.js
const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

const LLM_PROVIDER = (process.env.LLM_PROVIDER || "gemini").toLowerCase();
const GATEWAY_BASE_URL =
  process.env.GATEWAY_BASE_URL || "https://factchat-cloud.mindlogic.ai/v1/gateway";
const GATEWAY_API_KEY = process.env.GATEWAY_API_KEY || "";
const GATEWAY_MODEL = process.env.GATEWAY_MODEL || "claude-sonnet-4-6";

function normalizeBaseUrl(url) {
  return String(url || "").replace(/\/+$/, "");
}

function parseJsonSafely(text) {
  const cleaned = String(text)
    .replace(/```json/g, "")
    .replace(/```/g, "")
    .trim();
  return JSON.parse(cleaned);
}

async function callGatewayChatCompletions(body) {
  const endpoint = `${normalizeBaseUrl(GATEWAY_BASE_URL)}/chat/completions/`;
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${GATEWAY_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const raw = await res.text();
  let parsed;
  try {
    parsed = raw ? JSON.parse(raw) : {};
  } catch {
    parsed = {};
  }

  if (!res.ok) {
    const msg = `Gateway API error: ${res.status} ${raw}`;
    const err = new Error(msg);
    err.status = res.status;
    err.raw = raw;
    if (res.status === 429) err.code = "QUOTA_EXCEEDED";
    if (res.status >= 500) err.code = "TEMPORARY_AI_ERROR";
    throw err;
  }

  const text = parsed?.choices?.[0]?.message?.content;
  if (!text || typeof text !== "string") {
    throw new Error("Invalid gateway response format");
  }
  return text;
}

async function askGateway(prompt, isJson) {
  if (!GATEWAY_API_KEY) {
    const err = new Error("GATEWAY_API_KEY is missing");
    err.code = "MISSING_GATEWAY_API_KEY";
    throw err;
  }

  const baseBody = {
    model: GATEWAY_MODEL,
    messages: [{ role: "user", content: prompt }],
    temperature: 0.2,
  };

  if (!isJson) {
    return callGatewayChatCompletions(baseBody);
  }

  // Ajou gateway validation error showed it expects `json_schema`.
  const jsonSchemaBody = {
    ...baseBody,
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "generic_json",
        schema: {
          type: "object",
          additionalProperties: true,
        },
      },
    },
  };

  try {
    const text = await callGatewayChatCompletions(jsonSchemaBody);
    return parseJsonSafely(text);
  } catch (e) {
    // If gateway/model rejects response_format, retry without response_format.
    const shouldRetryWithoutFormat =
      e?.status === 400 &&
      (String(e?.raw || "").includes("response_format") ||
        String(e?.message || "").includes("response_format"));

    if (!shouldRetryWithoutFormat) throw e;

    const retryText = await callGatewayChatCompletions(baseBody);
    return parseJsonSafely(retryText);
  }
}

async function askGeminiProvider(prompt, isJson) {
  if (!process.env.GEMINI_API_KEY) {
    const err = new Error("GEMINI_API_KEY is missing");
    err.code = "MISSING_GEMINI_API_KEY";
    throw err;
  }

  const modelName = "gemini-2.0-flash";
  const model = genAI.getGenerativeModel({
    model: modelName,
    ...(isJson && {
      generationConfig: { responseMimeType: "application/json" },
    }),
  });

  try {
    console.log("[askGemini] 호출 시작");

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    console.log("🤖 Gemini 원본 응답:", text);

    if (!isJson) return text;

    return parseJsonSafely(text);
  } catch (e) {
    console.error("🚨 Gemini API 에러:", e.message);

    if (e.message.includes("429")) {
      const err = new Error("QUOTA_EXCEEDED");
      err.code = "QUOTA_EXCEEDED";
      throw err;
    }

    if (e.message.includes("503") || e.message.includes("500")) {
      const err = new Error("TEMPORARY_AI_ERROR");
      err.code = "TEMPORARY_AI_ERROR";
      throw err;
    }

    throw e;
  }
}

async function askGemini(prompt, isJson = false) {
  if (LLM_PROVIDER === "gateway" || LLM_PROVIDER === "ajou") {
    return askGateway(prompt, isJson);
  }
  return askGeminiProvider(prompt, isJson);
}

module.exports = { askGemini };
