// src/services/authService.js
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { pool } = require("../db/pool");
const { JWT_SECRET, JWT_EXPIRES_IN } = require("../config");

function signToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      name: user.name,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

async function createUser({ email, password, name }) {
  const normalizedEmail = String(email).trim().toLowerCase();
  const passwordHash = await bcrypt.hash(password, 10);

  const { rows } = await pool.query(
    `INSERT INTO users (email, password_hash, name)
     VALUES ($1, $2, $3)
     RETURNING id, email, name, created_at`,
    [normalizedEmail, passwordHash, name ?? null]
  );

  const user = rows[0];
  const token = signToken(user);
  return { user, token };
}

async function loginUser({ email, password }) {
  const normalizedEmail = String(email).trim().toLowerCase();

  const { rows } = await pool.query(
    `SELECT id, email, name, password_hash, created_at
     FROM users
     WHERE email = $1`,
    [normalizedEmail]
  );

  const user = rows[0];
  if (!user) return null;

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return null;

  const token = signToken(user);
  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      created_at: user.created_at,
    },
    token,
  };
}

async function getUserById(userId) {
  const { rows } = await pool.query(
    `SELECT id, email, name, created_at
     FROM users
     WHERE id = $1`,
    [userId]
  );
  return rows[0] ?? null;
}

module.exports = {
  createUser,
  loginUser,
  getUserById,
};
