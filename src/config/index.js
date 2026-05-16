// 환경 변수

const PORT = Number(process.env.PORT ?? 10000);
const ENABLE_MQTT = process.env.ENABLE_MQTT === "true";
const MQTT_URL = process.env.MQTT_URL ?? "mqtt://localhost:1883";
const SENSOR_TOPIC = process.env.SENSOR_TOPIC ?? "farm/+/sensor";
const PUMP_TOPIC = process.env.PUMP_TOPIC ?? "farm/gh1/actuator/pump";
const DATABASE_URL = process.env.DATABASE_URL;
const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY;
const OPENWEATHER_LAT     = process.env.OPENWEATHER_LAT ?? "37.5665";
const OPENWEATHER_LON     = process.env.OPENWEATHER_LON ?? "126.9780";
const MQTT_USERNAME = process.env.MQTT_USERNAME;
const MQTT_PASSWORD = process.env.MQTT_PASSWORD;
const JWT_SECRET = process.env.JWT_SECRET ?? "change-this-in-production";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? "7d";
const SUPABASE_URL = process.env.SUPABASE_URL ?? "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const SUPABASE_JWT_AUDIENCE = process.env.SUPABASE_JWT_AUDIENCE ?? "authenticated";
const DISEASE_AI_URL = process.env.DISEASE_AI_URL ?? process.env.PYTHON_INFERENCE_URL ?? "";
const DISEASE_AI_TIMEOUT_MS = Number(process.env.DISEASE_AI_TIMEOUT_MS ?? 25000);
const AI_MAX_RETRIES = Number(process.env.AI_MAX_RETRIES ?? 2);
const AI_RETRY_BASE_DELAY_MS = Number(process.env.AI_RETRY_BASE_DELAY_MS ?? 500);
const AI_WARMUP_ENABLED = process.env.AI_WARMUP_ENABLED === "true";
const AI_WARMUP_INTERVAL_MS = Number(process.env.AI_WARMUP_INTERVAL_MS ?? 840000);
const WEB_PUSH_VAPID_PUBLIC_KEY = process.env.WEB_PUSH_VAPID_PUBLIC_KEY ?? "";
const WEB_PUSH_VAPID_PRIVATE_KEY = process.env.WEB_PUSH_VAPID_PRIVATE_KEY ?? "";
const WEB_PUSH_SUBJECT = process.env.WEB_PUSH_SUBJECT ?? "";
const REPORT_SCHEDULE_TIMEZONE = process.env.REPORT_SCHEDULE_TIMEZONE ?? "Asia/Seoul";

module.exports = {
  PORT,
  ENABLE_MQTT,
  MQTT_URL,
  MQTT_USERNAME,
  MQTT_PASSWORD,
  SENSOR_TOPIC,
  PUMP_TOPIC,
  DATABASE_URL,
  OPENWEATHER_API_KEY,
  OPENWEATHER_LAT,
  OPENWEATHER_LON,
  JWT_SECRET,
  JWT_EXPIRES_IN,
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  SUPABASE_JWT_AUDIENCE,
  DISEASE_AI_URL,
  DISEASE_AI_TIMEOUT_MS,
  AI_MAX_RETRIES,
  AI_RETRY_BASE_DELAY_MS,
  AI_WARMUP_ENABLED,
  AI_WARMUP_INTERVAL_MS,
  WEB_PUSH_VAPID_PUBLIC_KEY,
  WEB_PUSH_VAPID_PRIVATE_KEY,
  WEB_PUSH_SUBJECT,
  REPORT_SCHEDULE_TIMEZONE,
};
