const mqtt = require("mqtt");

// MQTT 브로커 연결 (기본 로컬 호스트 1883 포트)
const client = mqtt.connect("mqtt://localhost:1883");

// 메시지 전송 및 수신을 위한 토픽 설정
const SENSOR_TOPIC = "farm/gh1/sensor";
const PUMP_TOPIC = "farm/gh1/actuator/pump";

/**
 * 숫자를 최소값과 최대값 사이로 제한하는 유틸리티 함수
 */
function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

// 온실의 현재 상태를 관리하는 객체
let state = {
  temperature: 23.0,
  humidity: 60.0,
  soilMoisture: 35.0,
};

// 펌프 상태 관리 변수
let pumpOn = false;
let pumpEndTime = 0;

/**
 * 실시간 환경 변화 시뮬레이션 함수
 * 자연적인 수치 변동과 펌프 작동에 따른 수분 변화를 계산합니다.
 */
function tick() {
  // 1. 자연적인 수치 변화 (랜덤 워크 방식)
  state.temperature += (Math.random() - 0.5) * 0.4; // -0.2 ~ +0.2 도 변동
  state.humidity += (Math.random() - 0.5) * 1.0;    // -0.5 ~ +0.5 % 변동
  state.soilMoisture -= 0.1 + Math.random() * 0.2;  // 수분은 서서히 감소 (증발/흡수)

  // 2. 펌프 작동 중일 때 로직
  if (pumpOn) {
    state.soilMoisture += 2.0; // 물을 주면 토양 수분이 빠르게 상승
    if (Date.now() > pumpEndTime) {
      pumpOn = false;
      console.log("🚰 [Simulator] Pump OFF (Duration Ended)");
    }
  }

  // 수치 범위 제한 (현실적인 범위 유지)
  state.temperature = +clamp(state.temperature, 10, 40).toFixed(1);
  state.humidity = +clamp(state.humidity, 20, 95).toFixed(1);
  state.soilMoisture = +clamp(state.soilMoisture, 0, 100).toFixed(1);

  // 최종 전송할 데이터 객체(Payload) 구성
  return {
    greenhouseId: "gh1",
    plantType: "sansevieria", // 요청하신 식물 타입 추가
    temperature: state.temperature,
    humidity: state.humidity,
    soilMoisture: state.soilMoisture,
    lux: Math.floor(Math.random() * 2000) + 200, // 200~2200 lux 범위의 조도 데이터 추가
    ts: new Date().toISOString(), // ISO 8601 형식의 타임스탬프
  };
}

// MQTT 브로커 연결 이벤트
client.on("connect", () => {
  console.log("✅ [Simulator] Connected to MQTT Broker");

  // 제어 명령(펌프) 토픽 구독
  client.subscribe(PUMP_TOPIC, (err) => {
    if (err) {
      console.error("❌ [Simulator] Subscribe error:", err);
    } else {
      console.log(`📡 [Simulator] Monitoring Topic: ${PUMP_TOPIC}`);
    }
  });

  // 2초마다 주기적으로 가상 센서 데이터 발행
  setInterval(() => {
    const payload = tick();
    client.publish(SENSOR_TOPIC, JSON.stringify(payload));
    console.log("📤 [Published Sensor Data]:", payload);
  }, 2000);
});

// MQTT 메시지 수신 이벤트 (펌프 제어 명령 처리)
client.on("message", (topic, message) => {
  if (topic !== PUMP_TOPIC) return;

  try {
    const cmd = JSON.parse(message.toString());
    
    if (cmd.action === "ON") {
      pumpOn = true;
      // 명령에 포함된 duration(ms)만큼 작동, 기본값은 8초
      const duration = cmd.duration || 8000;
      pumpEndTime = Date.now() + duration;
      console.log(`🚰 [Command Received] Pump ON for ${duration}ms`);
    } else if (cmd.action === "OFF") {
      pumpOn = false;
      console.log("🚰 [Command Received] Pump OFF (Manual)");
    }
  } catch (error) {
    console.error("⚠️ [Simulator] Invalid Command Format:", message.toString());
  }
});

// 에러 처리
client.on("error", (err) => {
  console.error("❌ [Simulator] Connection Error:", err);
});