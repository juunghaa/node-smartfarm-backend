function notSupported(req, res) {
  return res.status(410).json({
    ok: false,
    error: "이 엔드포인트는 더 이상 사용하지 않습니다. Supabase Auth를 사용해주세요.",
  });
}

async function me(req, res) {
  try {
    return res.json({
      ok: true,
      user: {
        id: req.auth?.userId,
        email: req.auth?.email ?? null,
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
};
