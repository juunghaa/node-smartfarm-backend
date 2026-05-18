// src/middlewares/supabaseAuthMiddleware.js
const { createClient } = require("@supabase/supabase-js");
const jwt = require("jsonwebtoken");
const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, JWT_SECRET } = require("../config");

let supabaseAdmin = null;

function getSupabaseAdminClient() {
  if (!SUPABASE_URL) {
    throw new Error("SUPABASE_URL is missing");
  }
  if (!SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is missing");
  }
  if (!supabaseAdmin) {
    supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });
  }
  return supabaseAdmin;
}

function parseBearerToken(req) {
  return req.headers.authorization?.replace(/^Bearer\s+/i, "").trim();
}

function verifyCustomAuthToken(token) {
  try {
    const payload = jwt.verify(token, JWT_SECRET, {
      issuer: "smartfarm-backend",
      audience: "smartfarm-clients",
    });

    if (payload?.tokenType !== "smartfarm_custom_auth") {
      return null;
    }

    return {
      userId: payload.sub,
      email: payload.email ?? null,
      name: payload.name ?? null,
      provider: payload.provider ?? "custom",
      raw: payload,
    };
  } catch {
    return null;
  }
}

async function verifySupabaseToken(token) {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data?.user) {
    return null;
  }

  return {
    userId: data.user.id,
    email: data.user.email ?? null,
    name: data.user.user_metadata?.name ?? data.user.user_metadata?.full_name ?? null,
    provider: "supabase",
    raw: data.user,
  };
}

async function requireSupabaseAuth(req, res, next) {
  const token = parseBearerToken(req);

  if (!token) {
    return res.status(401).json({ ok: false, error: "인증 토큰이 필요합니다." });
  }

  try {
    const supabaseAuth = await verifySupabaseToken(token).catch(() => null);
    if (supabaseAuth) {
      req.auth = supabaseAuth;
      return next();
    }

    const customAuth = verifyCustomAuthToken(token);
    if (customAuth) {
      req.auth = customAuth;
      return next();
    }

    return res.status(401).json({ ok: false, error: "유효하지 않은 인증 토큰입니다." });
  } catch {
    return res.status(401).json({ ok: false, error: "유효하지 않은 인증 토큰입니다." });
  }
}

module.exports = {
  requireSupabaseAuth,
};
