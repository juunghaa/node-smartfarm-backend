// 루트 진입점, 서버 실행만 담당!!

require("dotenv").config();

const app = require("./src/app");
const { PORT } = require("./src/config");
const { testDbConnection, logCurrentDbInfo } = require("./src/db/pool");
const { initMqttService } = require("./src/services/mqttService");
const { initWeatherScheduler } = require("./src/services/weatherService");

async function startServer() {
  try {
    await testDbConnection();
    await logCurrentDbInfo();

    initMqttService();
    initWeatherScheduler();

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`API server running on port ${PORT}`);
    });
  } catch (err) {
    console.error("❌ Server startup failed:", err.message);
    process.exit(1);
  }
}

startServer();
