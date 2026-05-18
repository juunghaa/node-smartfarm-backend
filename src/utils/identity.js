const crypto = require("crypto");

function bytesToUuidV5(bytes) {
  const b = Buffer.from(bytes);
  b[6] = (b[6] & 0x0f) | 0x50; // version 5
  b[8] = (b[8] & 0x3f) | 0x80; // RFC 4122 variant
  const hex = b.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

function deterministicUuidFromExternalId(provider, externalId) {
  const seed = `${String(provider)}:${String(externalId)}`;
  const digest = crypto.createHash("sha1").update(seed).digest().subarray(0, 16);
  return bytesToUuidV5(digest);
}

module.exports = {
  deterministicUuidFromExternalId,
};
