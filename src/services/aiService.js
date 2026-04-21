// src/services/aiService.js
const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Gemini 호출 공통 함수 (재시도 및 에러 처리 포함)
 */
async function askGemini(prompt, isJson = false, retries = 2) {
  // 404 에러 방지: 최신 SDK에서는 모델 이름만 정확히 적으면 돼!
  const modelName = "gemini-1.5-flash"; 
  const model = genAI.getGenerativeModel({ 
    model: modelName,
    // JSON 응답이 필요할 때 설정 (SDK 지원 버전 확인 필수)
    ...(isJson && { generationConfig: { responseMimeType: "application/json" } })
  });

  for (let i = 0; i <= retries; i++) {
    try {
      const result = await model.generateContent(prompt);
      let text = result.response.text();
      
      if (isJson) {
        // 마크다운 형식(```json ... ```) 제거 후 파싱
        return JSON.parse(text.replace(/```json/g, "").replace(/```/g, "").trim());
      }
      return text;
    } catch (e) {
      if (e.message.includes("429") && i < retries) {
        console.log(`⏳ 할당량 초과... ${i + 1}번째 재시도 중 (30초 대기)`);
        await new Promise(r => setTimeout(r, 30000)); // 30초 대기
      } else {
        throw e;
      }
    }
  }
}

module.exports = { askGemini };
