const pool = require("../config/db");

async function findUserByEmail(email) {
  const [rows] = await pool.query(
    "SELECT id, email, password FROM users WHERE LOWER(email) = LOWER(?)",
    [email]
  );
  return rows[0] || null;
}

async function createUser(email, hashedPassword) {
  const [result] = await pool.query(
    "INSERT INTO users (email, password) VALUES (?, ?)",
    [email, hashedPassword]
  );
  return { id: result.insertId, email };
}

module.exports = {
  findUserByEmail,
  createUser,
};
