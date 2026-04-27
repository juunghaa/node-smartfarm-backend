// src/app.js
// Express 앱 설정, 라우터 등록 담당

const express = require("express");
const cors = require("cors");
const app = express();

app.use(cors());
app.use(express.json());

[
  "./routes/apiRoutes",
  "./routes/control",
  "./routes/weather",
  "./routes/greenhouse",
  "./routes/alert",
  "./routes/plant",
  "./routes/report",
].forEach((routePath) => {
  app.use("/api", require(routePath));
});

module.exports = app;

// 이전 버전
// const express = require("express");
// const cors = require("cors");
// const apiRoutes = require("./routes/apiRoutes");

// const app = express();

// app.use(cors());
// app.use(express.json());

// app.use("/api", apiRoutes);

// module.exports = app;
