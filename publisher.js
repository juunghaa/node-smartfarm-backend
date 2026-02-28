const mqtt = require("mqtt");

const client = mqtt.connect("mqtt://localhost:1883");

// 센서 데이터 토픽(프로젝트용)
const TOPIC = "farm/gh1/sensor";
const PUMP_TOPIC = "farm/gh1/actuator/pump";

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

// “그럴듯한” 시뮬레이션: 시간에 따라 조금씩 변동
let state = {
  temperature: 23.0,
  humidity: 60.0,
  soilMoisture: 35.0,
};

// 펌프 상태 
let pumpOn = false;
let pumpEndTime = 0;

function tick() {
  // 자연 변화(서서히)
  state.temperature += (Math.random() - 0.5) * 0.4; // -0.2~+0.2
  state.humidity += (Math.random() - 0.5) * 1.0;    // -0.5~+0.5
  state.soilMoisture -= 0.2 + Math.random() * 0.3;  // 서서히 감소(증발/흡수)

  // 펌프 작동 중이면 토양 수분 급증
  if (pumpOn) {
    state.soilMoisture += 1.5; // 물 줄 때 빠르게 증가
    if (Date.now() > pumpEndTime) {
      pumpOn = false;
      console.log("🚰 Pump OFF");
    }
  }

  state.temperature = +clamp(state.temperature, 10, 40).toFixed(1);
  state.humidity = +clamp(state.humidity, 20, 95).toFixed(1);
  state.soilMoisture = +clamp(state.soilMoisture, 0, 100).toFixed(1);

  return {
    greenhouseId: "gh1",
    temperature: state.temperature,
    humidity: state.humidity,
    soilMoisture: state.soilMoisture,
    ts: new Date().toISOString(),
  };
}

client.on("connect", () => {
  console.log("✅ Publisher connected to MQTT");

  // 연결된 다음에 펌프 명령 구독
  client.subscribe(PUMP_TOPIC, (err) => {
    if (err) console.error("❌ Subscribe error:", err);
    else console.log("📡 Subscribed:", PUMP_TOPIC);
  });

  // 2초마다 센서 데이터 발행
  setInterval(() => {
    const payload = tick();
    client.publish(TOPIC, JSON.stringify(payload));
    console.log("📤 Published:", payload);
  }, 2000);
});

// 펌프 명령 수신
client.on("message", (topic, message) => {
  if (topic !== PUMP_TOPIC) return;

  let cmd;
  try {
    cmd = JSON.parse(message.toString());
  } catch {
    console.log("⚠️ Pump command not JSON:", message.toString());
    return;
  }

  if (cmd.action === "ON") {
    pumpOn = true;
    pumpEndTime = Date.now() + (cmd.duration ?? 8000);
    console.log(`🚰 Pump ON (${cmd.duration ?? 8000}ms)`);
  }
});

client.on("error", (err) => console.error("❌ Publisher error:", err));
