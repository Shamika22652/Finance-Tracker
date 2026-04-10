const {
  createTransaction,
  getTransactionsByUser,
  updateTransactionById,
  deleteTransactionById,
} = require("../models/transactionModel");
const { toCsv } = require("../utils/csv");

function validateTransactionPayload(payload) {
  const { amount, type, category, date, description } = payload;

  if (amount === undefined || !type || !category || !date) {
    return {
      error: "amount, type, category, and date are required",
    };
  }

  if (!["income", "expense"].includes(type)) {
    return { error: "type must be income or expense" };
  }

  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    return { error: "amount must be a positive number" };
  }

  const parsedDate = new Date(date);
  if (Number.isNaN(parsedDate.getTime())) {
    return { error: "date must be a valid date" };
  }

  const normalizedCategory = String(category).trim();
  if (!normalizedCategory) {
    return { error: "category cannot be empty" };
  }

  return {
    data: {
      amount: numericAmount,
      type,
      category: normalizedCategory,
      date: parsedDate.toISOString().slice(0, 10),
      description: description ? String(description).trim() : null,
    },
  };
}

async function getTransactions(req, res) {
  try {
    const { startDate, endDate, category } = req.query;
    if (startDate && Number.isNaN(new Date(startDate).getTime())) {
      return res.status(400).json({ message: "startDate must be a valid date" });
    }
    if (endDate && Number.isNaN(new Date(endDate).getTime())) {
      return res.status(400).json({ message: "endDate must be a valid date" });
    }

    const transactions = await getTransactionsByUser(req.user.id, {
      startDate,
      endDate,
      category,
    });
    return res.status(200).json({ transactions });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
}

async function addTransaction(req, res) {
  try {
    const validated = validateTransactionPayload(req.body);
    if (validated.error) {
      return res.status(400).json({ message: validated.error });
    }

    const transaction = await createTransaction(req.user.id, validated.data);

    return res.status(201).json({ transaction });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
}

async function updateTransaction(req, res) {
  try {
    const transactionId = Number(req.params.id);
    if (!Number.isInteger(transactionId) || transactionId <= 0) {
      return res.status(400).json({ message: "Invalid transaction id" });
    }

    const validated = validateTransactionPayload(req.body);
    if (validated.error) {
      return res.status(400).json({ message: validated.error });
    }

    const transaction = await updateTransactionById(req.user.id, transactionId, validated.data);
    if (!transaction) {
      return res.status(404).json({ message: "Transaction not found" });
    }

    return res.status(200).json({ transaction });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
}

async function deleteTransaction(req, res) {
  try {
    const transactionId = Number(req.params.id);
    if (!Number.isInteger(transactionId) || transactionId <= 0) {
      return res.status(400).json({ message: "Invalid transaction id" });
    }

    const deleted = await deleteTransactionById(req.user.id, transactionId);
    if (!deleted) {
      return res.status(404).json({ message: "Transaction not found" });
    }

    return res.status(200).json({ message: "Transaction deleted" });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
}

async function exportTransactionsCsv(req, res) {
  try {
    const transactions = await getTransactionsByUser(req.user.id, {});
    const csv = toCsv(transactions);

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="transactions-user-${req.user.id}.csv"`
    );

    return res.status(200).send(csv);
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
}

module.exports = {
  getTransactions,
  addTransaction,
  updateTransaction,
  deleteTransaction,
  exportTransactionsCsv,
};
