// src/routes/plant.js
const express = require("express");
const router = express.Router();
const { recommend, register, list } = require("../controllers/plantController");

router.post("/plant/recommend", recommend);
router.post("/plant/register",  register);
router.get("/plant/list",       list);

module.exports = router;
