const mqtt = require("mqtt");
const fs = require("fs");

const client = mqtt.connect("mqtt://localhost:1883");

const SENSOR_TOPIC = "farm/gh1/sensor";
const PUMP_TOPIC = "farm/gh1/actuator/pump";

// 파일 로그(프론트 없어도 결과 증빙 가능)
const LOG_FILE = "sensor.log";

// 자동 물주기 설정
let lastWatered = 0;
const COOLDOWN_MS = 15000; // 15초
const THRESHOLD = 30;      // soilMoisture 임계치
const DURATION_MS = 8000;  // 펌프 ON 지속시간

client.on("connect", () => {
  console.log("✅ Subscriber connected to MQTT");

  // 센서 토픽만 구독 (여기서는 룰이 센서에만 필요)
  client.subscribe(SENSOR_TOPIC, (err) => {
    if (err) console.error("❌ Subscribe error:", err);
    else console.log(`📡 Subscribed: ${SENSOR_TOPIC}`);
  });
});

client.on("message", (topic, message) => {
  const raw = message.toString();

  // 1) 파싱 안전하게
  let data;
  try {
    data = JSON.parse(raw);
  } catch (e) {
    // JSON 아니면 로그만 남기고 종료
    const line = `${new Date().toISOString()} ${topic} ${raw}\n`;
    process.stdout.write("📥 " + line);
    fs.appendFileSync(LOG_FILE, line);
    return;
  }

  // 2) 로그 남기기
  const line = `${new Date().toISOString()} ${topic} ${JSON.stringify(data)}\n`;
  process.stdout.write("📥 " + line);
  fs.appendFileSync(LOG_FILE, line);

  if (topic === SENSOR_TOPIC) {
    console.log("DEBUG soilMoisture:", data.soilMoisture, "type:", typeof data.soilMoisture);
  }  

  // 3) 룰 적용: 센서 토픽일 때만
  if (topic !== SENSOR_TOPIC) return;

  // soilMoisture가 없으면(데이터 포맷 다르면) 무시
  //if (typeof data.soilMoisture !== "number") return;
  const soil = Number(data.soilMoisture);
  if (Number.isNaN(soil)) return;

  const now = Date.now();

  // if (data.soilMoisture < THRESHOLD && now - lastWatered > COOLDOWN_MS) {
  if (soil < THRESHOLD && now - lastWatered > COOLDOWN_MS) {
    console.log("💧 Auto Watering Triggered!");
    client.publish(
      PUMP_TOPIC,
      JSON.stringify({ action: "ON", duration: DURATION_MS })
    );
    lastWatered = now;
  }
});

client.on("error", (err) => console.error("❌ Subscriber error:", err));
