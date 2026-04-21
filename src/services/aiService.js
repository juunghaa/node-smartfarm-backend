// src/services/aiService.js
const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function askGemini(prompt, isJson = false) {
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

    const cleanedText = text
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    return JSON.parse(cleanedText);
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

module.exports = { askGemini };
