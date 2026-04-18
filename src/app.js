// src/app.js
// Express 앱 설정, 라우터 등록 담당

const express = require("express");
const cors = require("cors");
const app = express();

app.use(cors());
app.use(express.json());

app.use("/api", require("./routes/apiRoutes")); 
app.use("/api", require("./routes/control")); 
app.use("/api", require("./routes/weather")); 
app.use("/api", require("./routes/greenhouse"));
app.use("/api", require("./routes/alert"));
app.use("/api", require("./routes/plant"));

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
