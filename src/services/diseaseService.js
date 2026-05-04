// src/services/diseaseService.js

/**
 * Mock disease prediction.
 * Later, replace this function body with real model inference.
 */
async function predictDisease(imagePath) {
  // Keep deterministic enough for quick local testing.
  const diseaseByPath = typeof imagePath === "string" && imagePath.toLowerCase().includes("disease");

  if (diseaseByPath || Math.random() < 0.5) {
    return {
      result: "disease",
      label: "disease",
      confidence: 0.91,
      message: "질병이 의심됩니다. 잎의 상태를 확인해주세요.",
    };
  }

  return {
    result: "healthy",
    label: "healthy",
    confidence: 0.88,
    message: "현재 이미지에서는 뚜렷한 질병 징후가 보이지 않습니다.",
  };
}

module.exports = {
  predictDisease,
};
