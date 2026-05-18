// authMiddleware.js
const { createClient } = require("@supabase/supabase-js");
const jwt = require("jsonwebtoken");
const { JWT_SECRET, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = require("../config");

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ ok: false, error: "인증 토큰이 필요합니다." });
  }

  try {
    // 서명 검증 없이 payload 먼저 확인 (발급자 식별용)
    const decoded = jwt.decode(token);
    if (!decoded) {
      return res.status(401).json({ ok: false, error: "토큰 형식 오류" });
    }

    // ✅ 카카오 자체 발급 토큰
    // iss: "smartfarm-backend" + provider: "kakao_custom"
    if (decoded.iss === "smartfarm-backend" && decoded.provider === "kakao_custom") {
      const verified = jwt.verify(token, JWT_SECRET, {
        issuer: "smartfarm-backend",
        audience: "smartfarm-clients",
      });
      req.auth = {
        userId: verified.sub,       // deterministicUUID (UUID 타입)
        email: verified.email ?? null,
        provider: "kakao_custom",
        name: verified.name ?? null,
        kakaoId: verified.kakaoId,
      };
      return next();
    }

    // ✅ Supabase 발급 토큰 (이메일 로그인, Google OAuth)
    // iss: "https://xxxx.supabase.co/auth/v1"
    if (decoded.iss && decoded.iss.includes("supabase")) {
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (error || !user) {
        return res.status(401).json({ ok: false, error: "유효하지 않은 Supabase 토큰" });
      }
      req.auth = {
        userId: user.id,            // Supabase UUID
        email: user.email ?? null,
        provider: user.app_metadata?.provider || "email",
        name: user.user_metadata?.full_name ?? null,
        kakaoId: null,
      };
      return next();
    }

    return res.status(401).json({ ok: false, error: "알 수 없는 토큰 발급자" });

  } catch (err) {
    return res.status(401).json({ ok: false, error: "토큰 검증 실패: " + err.message });
  }
}

module.exports = { requireAuth };


// // src/middlewares/authMiddleware.js
// const jwt = require("jsonwebtoken");
// const { JWT_SECRET } = require("../config");

// function requireAuth(req, res, next) {
//   const header = req.headers.authorization || "";
//   const [scheme, token] = header.split(" ");

//   if (scheme !== "Bearer" || !token) {
//     return res.status(401).json({ ok: false, error: "인증 토큰이 필요합니다." });
//   }

//   try {
//     const payload = jwt.verify(token, JWT_SECRET);
//     req.auth = payload;
//     return next();
//   } catch {
//     return res.status(401).json({ ok: false, error: "유효하지 않은 토큰입니다." });
//   }
// }

// module.exports = { requireAuth };
