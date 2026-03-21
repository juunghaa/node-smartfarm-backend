// 환경 변수

const PORT = Number(process.env.PORT ?? 10000);
const ENABLE_MQTT = process.env.ENABLE_MQTT === "true";
const MQTT_URL = process.env.MQTT_URL ?? "mqtt://localhost:1883";
const SENSOR_TOPIC = process.env.SENSOR_TOPIC ?? "farm/gh1/sensor";
const PUMP_TOPIC = process.env.PUMP_TOPIC ?? "farm/gh1/actuator/pump";
const DATABASE_URL = process.env.DATABASE_URL;

module.exports = {
  PORT,
  ENABLE_MQTT,
  MQTT_URL,
  SENSOR_TOPIC,
  PUMP_TOPIC,
  DATABASE_URL,
};
