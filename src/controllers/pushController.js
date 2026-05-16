const { pool } = require("../db/pool");
const { getGreenhouseId } = require("../utils/requestUtils");
const { getPublicKey, sendWebPush } = require("../services/webPushService");

function validateSubscription(subscription) {
  if (!subscription || typeof subscription !== "object") return "subscription is required";
  if (!subscription.endpoint || typeof subscription.endpoint !== "string") {
    return "subscription.endpoint is required";
  }
  if (!subscription.keys || typeof subscription.keys !== "object") {
    return "subscription.keys is required";
  }
  if (!subscription.keys.p256dh || !subscription.keys.auth) {
    return "subscription.keys.p256dh/auth is required";
  }
  return null;
}

async function getPushPublicKey(req, res) {
  const publicKey = getPublicKey();
  if (!publicKey) {
    return res.status(503).json({ ok: false, error: "WEB_PUSH_VAPID_PUBLIC_KEY is not configured." });
  }
  return res.json({ ok: true, publicKey });
}

async function subscribePush(req, res) {
  try {
    const greenhouseId = getGreenhouseId(req.body);
    if (!greenhouseId) {
      return res.status(400).json({ error: "greenhouseId is required" });
    }

    const { subscription } = req.body;
    const invalidReason = validateSubscription(subscription);
    if (invalidReason) {
      return res.status(400).json({ error: invalidReason });
    }

    const userId = req.auth?.userId;
    const { endpoint, expirationTime = null, keys } = subscription;
    const userAgent = req.get("user-agent") ?? null;

    await pool.query(
      `INSERT INTO web_push_subscriptions
        (user_id, greenhouse_id, endpoint, p256dh_key, auth_key, expiration_time, user_agent, last_seen_at)
       VALUES
        ($1, $2, $3, $4, $5, $6, $7, now())
       ON CONFLICT (endpoint)
       DO UPDATE SET
         user_id = EXCLUDED.user_id,
         greenhouse_id = EXCLUDED.greenhouse_id,
         p256dh_key = EXCLUDED.p256dh_key,
         auth_key = EXCLUDED.auth_key,
         expiration_time = EXCLUDED.expiration_time,
         user_agent = EXCLUDED.user_agent,
         last_seen_at = now(),
         updated_at = now()`,
      [userId, greenhouseId, endpoint, keys.p256dh, keys.auth, expirationTime, userAgent]
    );

    return res.status(201).json({ ok: true });
  } catch (e) {
    console.error("/api/push/subscribe POST error:", e.message);
    return res.status(500).json({ error: e.message });
  }
}

async function unsubscribePush(req, res) {
  try {
    const greenhouseId = getGreenhouseId(req.body);
    const { endpoint } = req.body ?? {};
    if (!greenhouseId) return res.status(400).json({ error: "greenhouseId is required" });
    if (!endpoint) return res.status(400).json({ error: "endpoint is required" });

    const { rowCount } = await pool.query(
      `DELETE FROM web_push_subscriptions
       WHERE user_id = $1 AND greenhouse_id = $2 AND endpoint = $3`,
      [req.auth?.userId, greenhouseId, endpoint]
    );

    return res.json({ ok: true, removed: rowCount > 0 });
  } catch (e) {
    console.error("/api/push/subscribe DELETE error:", e.message);
    return res.status(500).json({ error: e.message });
  }
}

async function sendPushTest(req, res) {
  try {
    const greenhouseId = getGreenhouseId(req.body);
    if (!greenhouseId) {
      return res.status(400).json({ error: "greenhouseId is required" });
    }

    const title = String(req.body?.title ?? "테스트 알림");
    const body = String(req.body?.body ?? "웹 푸시 연결 테스트입니다.");
    const url = String(req.body?.url ?? "/");

    const { rows } = await pool.query(
      `SELECT endpoint, p256dh_key, auth_key
       FROM web_push_subscriptions
       WHERE user_id = $1 AND greenhouse_id = $2`,
      [req.auth?.userId, greenhouseId]
    );

    if (!rows.length) {
      return res.status(404).json({ ok: false, error: "등록된 웹 푸시 구독이 없습니다." });
    }

    let successCount = 0;
    let failCount = 0;

    await Promise.all(
      rows.map(async (row) => {
        const subscription = {
          endpoint: row.endpoint,
          keys: {
            p256dh: row.p256dh_key,
            auth: row.auth_key,
          },
        };

        const payload = {
          title,
          body,
          url,
          greenhouseId,
          ts: new Date().toISOString(),
        };

        try {
          await sendWebPush(subscription, payload);
          successCount += 1;
        } catch (error) {
          failCount += 1;
          const statusCode = error?.statusCode;
          if (statusCode === 404 || statusCode === 410) {
            await pool.query(`DELETE FROM web_push_subscriptions WHERE endpoint = $1`, [row.endpoint]);
          }
        }
      })
    );

    return res.json({
      ok: true,
      sent: successCount,
      failed: failCount,
    });
  } catch (e) {
    if (e.code === "WEB_PUSH_NOT_CONFIGURED") {
      return res.status(503).json({ ok: false, error: e.message });
    }
    console.error("/api/push/test POST error:", e.message);
    return res.status(500).json({ error: e.message });
  }
}

module.exports = {
  getPushPublicKey,
  subscribePush,
  unsubscribePush,
  sendPushTest,
};
