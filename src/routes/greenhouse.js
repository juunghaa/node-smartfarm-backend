const express = require("express");
const router = express.Router();
const { getGreenhouse, upsertGreenhouse } = require("../controllers/greenhouseController");

router.get("/greenhouse", getGreenhouse);
router.post("/greenhouse", upsertGreenhouse);

module.exports = router;
