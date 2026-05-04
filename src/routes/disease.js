// src/routes/disease.js
const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { predictDiseaseFromImage } = require("../controllers/diseaseController");

const router = express.Router();

const uploadDir = path.join(process.cwd(), "tmp", "uploads");
fs.mkdirSync(uploadDir, { recursive: true });

const ALLOWED_EXT = new Set([".jpg", ".jpeg", ".png", ".webp"]);
const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const base = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, "");
    cb(null, `${Date.now()}-${base || "image"}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const mimeOk = ALLOWED_MIME.has(file.mimetype);
    const extOk = ALLOWED_EXT.has(ext);

    if (!mimeOk || !extOk) {
      const err = new Error("지원하지 않는 파일 형식입니다. jpg/jpeg/png/webp만 업로드 가능합니다.");
      err.name = "INVALID_IMAGE_TYPE";
      return cb(err);
    }

    cb(null, true);
  },
});

router.post("/disease/predict", (req, res) => {
  upload.single("image")(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({ ok: false, error: "이미지 파일은 최대 5MB까지 업로드할 수 있습니다." });
      }
      if (err.name === "INVALID_IMAGE_TYPE") {
        return res.status(400).json({ ok: false, error: err.message });
      }
      return res.status(400).json({ ok: false, error: "업로드 처리 중 오류가 발생했습니다." });
    }

    return predictDiseaseFromImage(req, res);
  });
});

module.exports = router;
