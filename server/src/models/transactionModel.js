const pool = require("../config/db");

async function createTransaction(userId, transaction) {
  const { amount, type, category, date, description } = transaction;
  const [result] = await pool.query(
    "INSERT INTO transactions (user_id, amount, type, category, date, description) VALUES (?, ?, ?, ?, ?, ?)",
    [userId, amount, type, category, date, description || null]
  );

  const [rows] = await pool.query(
    "SELECT id, amount, type, category, date, description FROM transactions WHERE id = ? AND user_id = ?",
    [result.insertId, userId]
  );

  return rows[0];
}

async function getTransactionsByUser(userId, filters = {}) {
  const { startDate, endDate, category } = filters;

  let query =
    "SELECT id, amount, type, category, date, description FROM transactions WHERE user_id = ?";
  const params = [userId];

  if (startDate) {
    query += " AND date >= ?";
    params.push(startDate);
  }

  if (endDate) {
    query += " AND date <= ?";
    params.push(endDate);
  }

  if (category) {
    query += " AND category = ?";
    params.push(category);
  }

  query += " ORDER BY date DESC, id DESC";

  const [rows] = await pool.query(query, params);
  return rows;
}

async function updateTransactionById(userId, transactionId, transaction) {
  const { amount, type, category, date, description } = transaction;
  const [result] = await pool.query(
    `UPDATE transactions
     SET amount = ?, type = ?, category = ?, date = ?, description = ?
     WHERE id = ? AND user_id = ?`,
    [amount, type, category, date, description || null, transactionId, userId]
  );

  if (result.affectedRows === 0) {
    return null;
  }

  const [rows] = await pool.query(
    "SELECT id, amount, type, category, date, description FROM transactions WHERE id = ? AND user_id = ?",
    [transactionId, userId]
  );
  return rows[0] || null;
}

async function deleteTransactionById(userId, transactionId) {
  const [result] = await pool.query(
    "DELETE FROM transactions WHERE id = ? AND user_id = ?",
    [transactionId, userId]
  );
  return result.affectedRows > 0;
}

module.exports = {
  createTransaction,
  getTransactionsByUser,
  updateTransactionById,
  deleteTransactionById,
};
