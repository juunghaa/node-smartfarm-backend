// DB 연결 풀, 연결 확인 로직 담당 

const { Pool } = require("pg");
const { DATABASE_URL } = require("../config");

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: DATABASE_URL.includes("localhost") ? false : { rejectUnauthorized: false },
});

async function testDbConnection() {
  try {
    const client = await pool.connect();
    console.log("DB Connected");
    client.release();
  } catch (err) {
    console.error("DB Connection Error:", err.stack);
    throw err;
  }
}

async function logCurrentDbInfo() {
  try {
    console.log("연결 시도 중인 DB 주소:", DATABASE_URL);

    const res = await pool.query("SELECT current_user, current_database()");
    console.log(
      `DB 연결 성공! 유저: ${res.rows[0].current_user}, DB: ${res.rows[0].current_database}`
    );
  } catch (err) {
    console.error("DB 연결 실패:", err.message);
    throw err;
  }
}

module.exports = {
  pool,
  testDbConnection,
  logCurrentDbInfo,
};
