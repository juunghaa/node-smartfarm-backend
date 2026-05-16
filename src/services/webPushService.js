const webpush = require("web-push");
const {
  WEB_PUSH_VAPID_PUBLIC_KEY,
  WEB_PUSH_VAPID_PRIVATE_KEY,
  WEB_PUSH_SUBJECT,
} = require("../config");

let configured = false;

function ensureWebPushConfigured() {
  if (configured) return true;

  if (!WEB_PUSH_VAPID_PUBLIC_KEY || !WEB_PUSH_VAPID_PRIVATE_KEY || !WEB_PUSH_SUBJECT) {
    return false;
  }

  webpush.setVapidDetails(
    WEB_PUSH_SUBJECT,
    WEB_PUSH_VAPID_PUBLIC_KEY,
    WEB_PUSH_VAPID_PRIVATE_KEY
  );
  configured = true;
  return true;
}

function getPublicKey() {
  return WEB_PUSH_VAPID_PUBLIC_KEY || null;
}

async function sendWebPush(subscription, payload) {
  if (!ensureWebPushConfigured()) {
    const err = new Error("웹 푸시 VAPID 환경변수가 설정되지 않았습니다.");
    err.code = "WEB_PUSH_NOT_CONFIGURED";
    throw err;
  }

  const raw = await webpush.sendNotification(subscription, JSON.stringify(payload), {
    TTL: 60,
    urgency: "high",
  });

  return raw;
}

module.exports = {
  getPublicKey,
  sendWebPush,
};
