const express = require("express");
const router = express.Router();
const { requireSupabaseAuth } = require("../middlewares/supabaseAuthMiddleware");
const { requireGreenhouseAccess } = require("../middlewares/greenhouseAccessMiddleware");
const {
  getPushPublicKey,
  subscribePush,
  unsubscribePush,
  sendPushTest,
} = require("../controllers/pushController");

router.get("/push/public-key", getPushPublicKey);
router.post("/push/subscribe", requireSupabaseAuth, requireGreenhouseAccess, subscribePush);
router.delete("/push/subscribe", requireSupabaseAuth, requireGreenhouseAccess, unsubscribePush);
router.post("/push/test", requireSupabaseAuth, requireGreenhouseAccess, sendPushTest);

module.exports = router;
