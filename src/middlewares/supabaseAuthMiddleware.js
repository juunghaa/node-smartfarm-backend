// src/middlewares/supabaseAuthMiddleware.js
const { createClient } = require("@supabase/supabase-js");
const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = require("../config");

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

async function requireSupabaseAuth(req, res, next) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, "").trim();

  if (!token) {
    return res.status(401).json({ ok: false, error: "인증 토큰이 필요합니다." });
  }

  try {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data?.user) {
      return res.status(401).json({ ok: false, error: "유효하지 않은 Supabase 토큰입니다." });
    }

    req.auth = {
      userId: data.user.id,
      email: data.user.email ?? null,
      raw: data.user,
    };

    return next();
  } catch (e) {
    return res.status(401).json({ ok: false, error: "유효하지 않은 Supabase 토큰입니다." });
  }
}

module.exports = {
  requireSupabaseAuth,
};
