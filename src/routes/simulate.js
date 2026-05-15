const express = require('express');
const router = express.Router();
const { requireSupabaseAuth } = require('../middlewares/supabaseAuthMiddleware');
const { requireGreenhouseAccess } = require('../middlewares/greenhouseAccessMiddleware');
const {
  publishOnce,
  startSimulation,
  stopSimulation,
} = require('../controllers/simulateController');

router.post('/simulate/publish', requireSupabaseAuth, requireGreenhouseAccess, publishOnce);
router.post('/simulate/start', requireSupabaseAuth, requireGreenhouseAccess, startSimulation);
router.post('/simulate/stop', requireSupabaseAuth, requireGreenhouseAccess, stopSimulation);

module.exports = router;
