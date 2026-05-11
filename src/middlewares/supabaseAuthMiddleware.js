// src/middlewares/supabaseAuthMiddleware.js
const { createRemoteJWKSet, jwtVerify } = require("jose");
const { SUPABASE_URL, SUPABASE_JWT_AUDIENCE } = require("../config");

let jwks = null;
let issuer = null;

function getVerifierConfig() {
  if (!SUPABASE_URL) {
    throw new Error("SUPABASE_URL is missing");
  }
  if (!jwks) {
    const base = SUPABASE_URL.replace(/\/+$/, "");
    jwks = createRemoteJWKSet(new URL(`${base}/auth/v1/.well-known/jwks.json`));
    issuer = `${base}/auth/v1`;
  }
  return { jwks, issuer };
}

async function requireSupabaseAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ ok: false, error: "인증 토큰이 필요합니다." });
  }

  try {
    const { jwks: keyset, issuer: iss } = getVerifierConfig();
    const { payload } = await jwtVerify(token, keyset, {
      issuer: iss,
      audience: SUPABASE_JWT_AUDIENCE,
    });

    req.auth = {
      userId: payload.sub,
      email: payload.email,
      raw: payload,
    };

    return next();
  } catch (e) {
    return res.status(401).json({ ok: false, error: "유효하지 않은 Supabase 토큰입니다." });
  }
}

module.exports = {
  requireSupabaseAuth,
};
