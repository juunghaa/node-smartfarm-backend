# Multi-Greenhouse MQTT Topic Migration

Date: 2026-04-27

## Background
- Sensor subscribe topic was changed from `farm/gh1/sensor` to wildcard format `farm/+/sensor` to support multiple greenhouses.
- Existing code still contained `gh1`-fixed logic, so additional code updates were applied.

## Updated Files

### 1) `src/services/mqttService.js`
- Added topic parser `extractGreenhouseIdFromTopic(topic)`.
- Removed strict equality check `topic !== SENSOR_TOPIC` and now accepts any topic matching `farm/{greenhouseId}/sensor` format.
- `greenhouseId` resolution now prefers payload value and falls back to topic value:
  - `const greenhouseId = data.greenhouseId ?? topicGreenhouseId`
- Changed actuator publish API to include greenhouse id:
  - Before: `publishCommand(actuator, payload)`
  - After: `publishCommand(greenhouseId, actuator, payload)`
- Removed `farm/gh1` hardcoding in actuator topic and now publishes dynamically:
  - `farm/${greenhouseId}/actuator/${actuator}`
- Fixed MQTT enable flag check:
  - Before: `if (ENABLE_MQTT !== "true")`
  - After: `if (!ENABLE_MQTT)`
- Rule engine publish callback now binds current greenhouse id per incoming sensor message.

### 2) `src/controllers/controlController.js`
- Updated manual control publish call:
  - Before: `publishCommand(actuator, { action })`
  - After: `publishCommand(greenhouseId, actuator, { action })`
- Manual actuator control now publishes to the requested greenhouse topic instead of fixed greenhouse.

### 3) `src/config/index.js`
- Updated default sensor topic to wildcard:
  - Before: `farm/gh1/sensor`
  - After: `farm/+/sensor`

## Result
- Sensor ingest supports multiple greenhouses via wildcard subscription.
- Automatic rule actions publish to actuator topics of the same greenhouse that sent the sensor data.
- Manual control API publishes to the actuator topic of the requested greenhouse.

## Note
- `PUMP_TOPIC` env/config is still present for compatibility, but core actuator publish path now uses `farm/{greenhouseId}/actuator/{actuator}` for all actuators.

## Additional Update (2026-04-27)
### `src/controllers/controlController.js`
- Removed default `gh1` fallback for manual control.
- `greenhouseId` is now required for manual actuator control requests.
- Temporary compatibility support added for request key typo:
  - accepts `greenhouseId` or `greenhouseID`
- Reason: control API directly affects physical actuators, so defaulting to `gh1` can mis-route commands in multi-greenhouse setups.

## Multi-Greenhouse Audit Notes (Historical)
- This section reflected the interim state before full migration.
- All listed follow-up items below this section are now completed in "Full Migration Update (2026-04-27)".

## Full Migration Update (2026-04-27)
The remaining `gh1` defaults were removed and updated for multi-greenhouse support.

### Controllers updated (no `gh1` fallback)
- `src/controllers/apiController.js`
- `src/controllers/alertController.js`
- `src/controllers/reportController.js`
- `src/controllers/weatherController.js`
- `src/controllers/greenhouseController.js`
- `src/controllers/plantController.js`
- `src/controllers/controlController.js` (already updated previously)

Common behavior:
- `greenhouseId` is now required for greenhouse-scoped endpoints.
- Temporary request-key compatibility: accepts `greenhouseId` or `greenhouseID`.
- Missing `greenhouseId` returns HTTP 400.

### Services/config updated
- `src/services/ruleEngine.js`
  - removed `gh1` default in `runRules`, now skips with warning if id is missing.
- `src/services/weatherService.js`
  - removed `gh1` defaults.
  - weather scheduler now fetches weather for all greenhouses from DB, not a single default greenhouse.
- `src/config/index.js`
  - `PUMP_TOPIC` default changed from `farm/gh1/actuator/pump` to `farm/+/actuator/pump`.

### Verification
- Codebase scan confirms no remaining `farm/gh1`, `?? "gh1"`, or `= "gh1"` in `src`.

## Refactor Update (2026-04-27)
### Goal
- Reduce repeated request parsing/validation logic after multi-greenhouse migration.

### Changes
- Added common request utilities:
  - `src/utils/requestUtils.js`
  - `getGreenhouseId(source)`
  - `requireGreenhouseId(source, res)`
  - `clampInt(value, fallback, min, max)`
- Refactored controllers to use common utilities:
  - `src/controllers/apiController.js`
  - `src/controllers/alertController.js`
  - `src/controllers/reportController.js`
  - `src/controllers/weatherController.js`
  - `src/controllers/greenhouseController.js`
  - `src/controllers/controlController.js`
  - `src/controllers/plantController.js`
- Refactored `src/app.js` route registration from repeated `app.use` lines to a route list iteration.
- Introduced controller-level constants in control API:
  - `ALLOWED_ACTUATORS`
  - `ALLOWED_ACTIONS`

### Result
- Greenhouse id validation behavior is now centralized and consistent.
- Numeric query limit/range handling is centralized and reusable.
- Route mounting is easier to maintain when adding/removing route modules.

## MQTT Attach-Driven Update (2026-04-27)
### Goal
- Prevent automatic MQTT broker connection on server startup.
- Connect only when user indicates sensor is actually attached.

### Changes
- `src/services/mqttService.js`
  - startup behavior changed to standby mode (`initMqttService` no longer auto-connects)
  - added connection control APIs:
    - `onSensorAttached(greenhouseId)`
    - `onSensorDetached(greenhouseId)`
    - `getMqttStatus()`
  - tracks attached greenhouse set and disconnects when last attached sensor is detached
- Added controller:
  - `src/controllers/mqttController.js`
- Added routes:
  - `src/routes/mqtt.js`
  - `GET /api/mqtt/status`
  - `POST /api/mqtt/attach` (body: `greenhouseId`)
  - `POST /api/mqtt/detach` (body: `greenhouseId`)
- Updated app route registration:
  - `src/app.js` includes `./routes/mqtt`

### Usage
1. User connects a sensor: call `POST /api/mqtt/attach` with greenhouse id.
2. Server connects/subscribes MQTT automatically.
3. User disconnects sensor: call `POST /api/mqtt/detach`.
4. If no attached sensors remain, server disconnects MQTT.
