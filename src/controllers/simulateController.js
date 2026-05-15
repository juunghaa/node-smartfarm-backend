const { requireGreenhouseId, clampInt } = require('../utils/requestUtils');
const { publishSensorData } = require('../services/mqttService');

const sessions = new Map();

function clampNumber(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function toOptionalNumber(value) {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(value);
  if (Number.isNaN(parsed)) return null;
  return parsed;
}

function buildPayload(greenhouseId, body) {
  const temperature = toOptionalNumber(body.temperature);
  const humidity = toOptionalNumber(body.humidity);
  const soilMoisture = toOptionalNumber(body.soilMoisture);
  const lux = toOptionalNumber(body.lux);

  const payload = {
    greenhouseId,
    plantType: typeof body.plantType === 'string' && body.plantType.trim() ? body.plantType.trim() : 'sansevieria',
    temperature: temperature === null ? undefined : clampNumber(temperature, -30, 60),
    humidity: humidity === null ? undefined : clampNumber(humidity, 0, 100),
    soilMoisture: soilMoisture === null ? undefined : clampNumber(soilMoisture, 0, 100),
    lux: lux === null ? undefined : clampNumber(lux, 0, 200000),
    ts: body.ts ? new Date(body.ts).toISOString() : new Date().toISOString(),
  };

  if (payload.temperature === undefined || payload.humidity === undefined || payload.soilMoisture === undefined) {
    return { error: 'temperature, humidity, soilMoisture are required' };
  }

  return { payload };
}

function tickState(state, ranges) {
  const next = { ...state };
  next.temperature = Number((next.temperature + (Math.random() - 0.5) * ranges.temperatureDelta).toFixed(1));
  next.humidity = Number((next.humidity + (Math.random() - 0.5) * ranges.humidityDelta).toFixed(1));
  next.soilMoisture = Number((next.soilMoisture + (Math.random() - 0.5) * ranges.soilDelta).toFixed(1));
  next.lux = Math.round(next.lux + (Math.random() - 0.5) * ranges.luxDelta);

  next.temperature = clampNumber(next.temperature, -30, 60);
  next.humidity = clampNumber(next.humidity, 0, 100);
  next.soilMoisture = clampNumber(next.soilMoisture, 0, 100);
  next.lux = clampNumber(next.lux, 0, 200000);
  return next;
}

function stopSession(greenhouseId) {
  const session = sessions.get(greenhouseId);
  if (!session) return false;
  clearInterval(session.timer);
  sessions.delete(greenhouseId);
  return true;
}

async function publishOnce(req, res) {
  try {
    const greenhouseId = requireGreenhouseId(req.body, res);
    if (!greenhouseId) return;

    const { payload, error } = buildPayload(greenhouseId, req.body);
    if (error) return res.status(400).json({ error });

    const ok = publishSensorData(greenhouseId, payload);
    if (!ok) {
      return res.status(503).json({ ok: false, error: 'MQTT is not connected' });
    }

    return res.json({ ok: true, mode: 'once', payload });
  } catch (e) {
    console.error('/api/simulate/publish error:', e.message);
    return res.status(500).json({ error: e.message });
  }
}

async function startSimulation(req, res) {
  try {
    const greenhouseId = requireGreenhouseId(req.body, res);
    if (!greenhouseId) return;

    const { payload, error } = buildPayload(greenhouseId, req.body);
    if (error) return res.status(400).json({ error });

    const intervalMs = clampInt(req.body.intervalMs, 2000, 500, 60000);
    const ranges = {
      temperatureDelta: clampNumber(Number(req.body.temperatureDelta ?? 0.4), 0, 10),
      humidityDelta: clampNumber(Number(req.body.humidityDelta ?? 1.0), 0, 20),
      soilDelta: clampNumber(Number(req.body.soilDelta ?? 0.6), 0, 20),
      luxDelta: clampNumber(Number(req.body.luxDelta ?? 300), 0, 50000),
    };

    stopSession(greenhouseId);

    let state = {
      temperature: payload.temperature,
      humidity: payload.humidity,
      soilMoisture: payload.soilMoisture,
      lux: payload.lux ?? 1000,
      plantType: payload.plantType,
    };

    const timer = setInterval(() => {
      state = tickState(state, ranges);
      const tickPayload = {
        greenhouseId,
        plantType: state.plantType,
        temperature: state.temperature,
        humidity: state.humidity,
        soilMoisture: state.soilMoisture,
        lux: state.lux,
        ts: new Date().toISOString(),
      };

      const ok = publishSensorData(greenhouseId, tickPayload);
      if (!ok) {
        console.warn(`[simulate] MQTT disconnected, skip publish: ${greenhouseId}`);
      }
    }, intervalMs);

    sessions.set(greenhouseId, { timer, intervalMs, ranges, state });

    const firstOk = publishSensorData(greenhouseId, payload);
    if (!firstOk) {
      stopSession(greenhouseId);
      return res.status(503).json({ ok: false, error: 'MQTT is not connected' });
    }

    return res.json({
      ok: true,
      mode: 'stream',
      greenhouseId,
      intervalMs,
      ranges,
      initial: payload,
    });
  } catch (e) {
    console.error('/api/simulate/start error:', e.message);
    return res.status(500).json({ error: e.message });
  }
}

async function stopSimulation(req, res) {
  try {
    const greenhouseId = requireGreenhouseId(req.body, res);
    if (!greenhouseId) return;

    const stopped = stopSession(greenhouseId);
    return res.json({ ok: true, greenhouseId, stopped });
  } catch (e) {
    console.error('/api/simulate/stop error:', e.message);
    return res.status(500).json({ error: e.message });
  }
}

module.exports = {
  publishOnce,
  startSimulation,
  stopSimulation,
};
