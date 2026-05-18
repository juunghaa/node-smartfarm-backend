const axios = require("axios");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const {
  JWT_SECRET,
  JWT_EXPIRES_IN,
  KAKAO_REST_API_KEY,
  KAKAO_CLIENT_SECRET,
  KAKAO_REDIRECT_URI,
  KAKAO_DEFAULT_REDIRECT_TO,
} = require("../config");
const { deterministicUuidFromExternalId } = require("../utils/identity");

function notSupported(req, res) {
  return res.status(410).json({
    ok: false,
    error: "이 엔드포인트는 더 이상 사용하지 않습니다. Supabase Auth를 사용해주세요.",
  });
}

function buildAppToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      provider: "kakao_custom",
      tokenType: "smartfarm_custom_auth",
      name: user.name ?? null,
      email: user.email ?? null,
      kakaoId: user.kakaoId,
    },
    JWT_SECRET,
    {
      expiresIn: JWT_EXPIRES_IN,
      issuer: "smartfarm-backend",
      audience: "smartfarm-clients",
    }
  );
}

function signOAuthState({ redirectTo }) {
  return jwt.sign(
    {
      typ: "kakao_oauth_state",
      redirectTo,
      nonce: crypto.randomBytes(12).toString("hex"),
    },
    JWT_SECRET,
    {
      expiresIn: "10m",
      issuer: "smartfarm-backend",
      audience: "kakao-oauth",
    }
  );
}

function verifyOAuthState(state) {
  return jwt.verify(state, JWT_SECRET, {
    issuer: "smartfarm-backend",
    audience: "kakao-oauth",
  });
}

function resolveRedirectTo(raw) {
  const fallback = KAKAO_DEFAULT_REDIRECT_TO || "http://localhost:5173/home";
  if (!raw) return fallback;

  try {
    const u = new URL(String(raw));
    if (!["http:", "https:"].includes(u.protocol)) return fallback;
    return u.toString();
  } catch {
    return fallback;
  }
}

function buildKakaoAuthorizeUrl({ state }) {
  const qs = new URLSearchParams({
    client_id: KAKAO_REST_API_KEY,
    redirect_uri: KAKAO_REDIRECT_URI,
    response_type: "code",
    state,
    scope: "profile_nickname profile_image",
  });
  return `https://kauth.kakao.com/oauth/authorize?${qs.toString()}`;
}

async function exchangeKakaoToken(code) {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: KAKAO_REST_API_KEY,
    redirect_uri: KAKAO_REDIRECT_URI,
    code,
  });

  if (KAKAO_CLIENT_SECRET) {
    body.set("client_secret", KAKAO_CLIENT_SECRET);
  }

  const { data } = await axios.post("https://kauth.kakao.com/oauth/token", body.toString(), {
    headers: { "Content-Type": "application/x-www-form-urlencoded;charset=utf-8" },
    timeout: 10000,
  });

  return data;
}

async function fetchKakaoProfile(accessToken) {
  const { data } = await axios.get("https://kapi.kakao.com/v2/user/me", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
    },
    timeout: 10000,
  });
  return data;
}

async function kakaoStart(req, res) {
  if (!KAKAO_REST_API_KEY || !KAKAO_REDIRECT_URI) {
    return res.status(500).json({ ok: false, error: "Kakao OAuth 환경변수가 설정되지 않았습니다." });
  }

  const redirectTo = resolveRedirectTo(req.query.redirectTo);
  const state = signOAuthState({ redirectTo });
  const authorizeUrl = buildKakaoAuthorizeUrl({ state });

  return res.json({ ok: true, authorizeUrl, state });
}

async function kakaoCallback(req, res) {
  const { code, state, error, error_description: errorDescription } = req.query;

  if (error) {
    return res.status(400).json({ ok: false, error: `${error}${errorDescription ? `: ${errorDescription}` : ""}` });
  }

  if (!code || !state) {
    return res.status(400).json({ ok: false, error: "code/state가 필요합니다." });
  }

  try {
    const statePayload = verifyOAuthState(String(state));
    if (statePayload?.typ !== "kakao_oauth_state") {
      throw new Error("invalid state type");
    }

    const tokenRes = await exchangeKakaoToken(String(code));
    const profile = await fetchKakaoProfile(tokenRes.access_token);

    const kakaoId = String(profile.id);
    const nickname = profile?.kakao_account?.profile?.nickname ?? null;
    const profileImage = profile?.kakao_account?.profile?.profile_image_url ?? null;
    const email = profile?.kakao_account?.email ?? null;

    const appUser = {
      id: deterministicUuidFromExternalId("kakao", kakaoId),
      kakaoId,
      name: nickname,
      email,
      profileImage,
    };

    const accessToken = buildAppToken(appUser);

    const redirectUrl = new URL(resolveRedirectTo(statePayload.redirectTo));
    redirectUrl.searchParams.set("token", accessToken);
    redirectUrl.searchParams.set("provider", "kakao");

    return res.redirect(302, redirectUrl.toString());
  } catch (e) {
    console.error("kakao callback error:", e?.response?.data ?? e.message);
    return res.status(401).json({ ok: false, error: "카카오 로그인 처리에 실패했습니다." });
  }
}

async function me(req, res) {
  try {
    return res.json({
      ok: true,
      user: {
        id: req.auth?.userId,
        email: req.auth?.email ?? null,
        provider: req.auth?.provider ?? null,
        name: req.auth?.name ?? null,
      },
    });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
}

module.exports = {
  signup: notSupported,
  login: notSupported,
  me,
  kakaoStart,
  kakaoCallback,
};
