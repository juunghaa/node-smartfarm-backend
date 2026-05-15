// src/controllers/diseaseController.js
const fs = require("fs/promises");
const crypto = require("crypto");
const { predictDisease, DiseaseServiceError } = require("../services/diseaseService");

async function safeUnlink(path) {
  if (!path) return;
  try {
    await fs.unlink(path);
  } catch {
    // ignore cleanup error
  }
}

async function predictDiseaseFromImage(req, res) {
  const filePath = req.file?.path;
  const requestId =
    req.headers["x-request-id"] ||
    req.headers["x-correlation-id"] ||
    crypto.randomUUID();

  try {
    if (!req.file) {
      return res.status(400).json({
        ok: false,
        error: "이미지 파일은 필수입니다.",
      });
    }

    const prediction = await predictDisease(filePath, requestId);

    return res.json({
      ok: true,
      prediction,
    });
  } catch (e) {
    console.error(`/api/disease/predict error requestId=${requestId}:`, e.message);
    const statusCode = e instanceof DiseaseServiceError ? e.statusCode : 500;
    return res.status(statusCode).json({
      ok: false,
      error: e.message || "AI 질병 분석 서버 호출에 실패했습니다.",
    });
  } finally {
    await safeUnlink(filePath);
  }
}

module.exports = {
  predictDiseaseFromImage,
};
