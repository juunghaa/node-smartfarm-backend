// src/controllers/diseaseController.js
const fs = require("fs/promises");
const { predictDisease } = require("../services/diseaseService");

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

  try {
    if (!req.file) {
      return res.status(400).json({
        ok: false,
        error: "이미지 파일은 필수입니다.",
      });
    }

    const prediction = await predictDisease(filePath);

    return res.json({
      ok: true,
      prediction,
    });
  } catch (e) {
    return res.status(500).json({
      ok: false,
      error: e.message || "질병 분석 중 오류가 발생했습니다.",
    });
  } finally {
    await safeUnlink(filePath);
  }
}

module.exports = {
  predictDiseaseFromImage,
};
