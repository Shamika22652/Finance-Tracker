import { useEffect, useMemo, useState } from "react";
import {
  ArcElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Title,
  Tooltip,
  Filler
} from "chart.js";
import { Line, Pie } from "react-chartjs-2";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { api, getAuthHeaders } from "../lib/api";

ChartJS.register(
  ArcElement,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const initialForm = {
  amount: "",
  type: "expense",
  category: "",
  date: "",
  description: "",
};

const initialFilters = {
  startDate: "",
  endDate: "",
  category: "",
};

function formatCurrency(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

function DashboardPage() {
  const navigate = useNavigate();
  const { token, user, logout } = useAuth();
  
  // Theme State
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('theme') === 'dark';
  });

  const [transactions, setTransactions] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [editingTransactionId, setEditingTransactionId] = useState(null);
  const [filters, setFilters] = useState(initialFilters);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState("");
  const [role, setRole] = useState("Admin");

  useEffect(() => {
    if (isDarkMode) {
      document.body.classList.add('theme-dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.body.classList.remove('theme-dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const loadTransactions = async () => {
    setIsLoading(true);
    setError("");
    try {
      const params = {};
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;
      if (filters.category) params.category = filters.category;

      const response = await api.get("/transactions", {
        params,
        headers: getAuthHeaders(token),
      });

      setTransactions(response.data.transactions || []);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Failed to fetch transactions");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTransactions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.startDate, filters.endDate, filters.category]);

  const onFormChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const onFilterChange = (event) => {
    const { name, value } = event.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const submitTransaction = async (event) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      if (editingTransactionId) {
        await api.put(`/transactions/${editingTransactionId}`, form, {
          headers: getAuthHeaders(token),
        });
      } else {
        await api.post("/transactions", form, {
          headers: getAuthHeaders(token),
        });
      }
      setEditingTransactionId(null);
      setForm(initialForm);
      await loadTransactions();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Failed to save transaction");
    } finally {
      setIsSubmitting(false);
    }
  };

  const startEdit = (transaction) => {
    setError("");
    setEditingTransactionId(transaction.id);
    setForm({
      amount: String(transaction.amount),
      type: transaction.type,
      category: transaction.category,
      date: String(transaction.date).slice(0, 10),
      description: transaction.description || "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelEdit = () => {
    setEditingTransactionId(null);
    setForm(initialForm);
  };

  const removeTransaction = async (transactionId) => {
    setError("");
    setDeletingId(transactionId);
    try {
      await api.delete(`/transactions/${transactionId}`, {
        headers: getAuthHeaders(token),
      });
      await loadTransactions();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Failed to delete transaction");
    } finally {
      setDeletingId(null);
    }
  };

  const exportCsv = async () => {
    setError("");
    try {
      const response = await api.get("/transactions/export", {
        headers: getAuthHeaders(token),
        responseType: "blob",
      });

      const blob = new Blob([response.data], { type: "text/csv;charset=utf-8;" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "transactions.csv";
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "CSV export failed");
    }
  };

  const categories = useMemo(() => {
    return [...new Set(transactions.map((tx) => tx.category))].sort((a, b) =>
      a.localeCompare(b)
    );
  }, [transactions]);

  const metrics = useMemo(() => {
    let income = 0;
    let expense = 0;
    for (const tx of transactions) {
      const amount = Number(tx.amount);
      if (tx.type === "income") income += amount;
      if (tx.type === "expense") expense += amount;
    }
    const savingsRate = income > 0 ? ((income - expense) / income) * 100 : 0;
    const balance = income - expense;
    const totalCount = transactions.length;
    return { income, expense, savingsRate, balance, totalCount };
  }, [transactions]);

  const topExpenseCategory = useMemo(() => {
    const grouped = transactions
      .filter((tx) => tx.type === "expense")
      .reduce((acc, tx) => {
        acc[tx.category] = (acc[tx.category] || 0) + Number(tx.amount);
        return acc;
      }, {});
    const entries = Object.entries(grouped);
    if (entries.length === 0) {
      return null;
    }
    entries.sort((a, b) => b[1] - a[1]);
    return { category: entries[0][0], amount: entries[0][1] };
  }, [transactions]);

  // Premium charts config
  const textColor = isDarkMode ? "#e4e4e7" : "#3f3f46";
  const gridColor = isDarkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)";

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: textColor, usePointStyle: true, boxWidth: 8 } },
      tooltip: {
        backgroundColor: isDarkMode ? "#27272a" : "#fff",
        titleColor: isDarkMode ? "#fff" : "#000",
        bodyColor: isDarkMode ? "#e4e4e7" : "#3f3f46",
        borderColor: isDarkMode ? "#3f3f46" : "#e4e4e7",
        borderWidth: 1,
        padding: 10,
        boxPadding: 4,
        usePointStyle: true
      }
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: textColor } },
      y: { border: { display: false }, grid: { color: gridColor }, ticks: { color: textColor } }
    }
  };

  const pieOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'right', labels: { color: textColor, usePointStyle: true, padding: 20 } },
      tooltip: chartOptions.plugins.tooltip
    },
    borderWidth: 0,
    cutout: '70%'
  };

  const pieData = useMemo(() => {
    const grouped = transactions
      .filter((tx) => tx.type === "expense")
      .reduce((acc, tx) => {
        acc[tx.category] = (acc[tx.category] || 0) + Number(tx.amount);
        return acc;
      }, {});

    const labels = Object.keys(grouped);
    return {
      labels,
      datasets: [
        {
          label: "Spending",
          data: labels.map((label) => grouped[label]),
          backgroundColor: [
            "#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"
          ],
          borderWidth: 2,
          borderColor: isDarkMode ? "#18181b" : "#ffffff",
          hoverOffset: 4
        },
      ],
    };
  }, [transactions, isDarkMode]);

  const lineData = useMemo(() => {
    const grouped = transactions.reduce((acc, tx) => {
      const key = String(tx.date).slice(0, 7);
      if (!acc[key]) {
        acc[key] = { income: 0, expense: 0 };
      }
      acc[key][tx.type] += Number(tx.amount);
      return acc;
    }, {});

    const labels = Object.keys(grouped).sort();
    return {
      labels,
      datasets: [
        {
          label: "Income",
          data: labels.map((label) => grouped[label].income),
          borderColor: "#10b981",
          backgroundColor: "rgba(16, 185, 129, 0.1)",
          tension: 0.4,
          fill: true,
          pointRadius: 4,
          pointHoverRadius: 6,
        },
        {
          label: "Expense",
          data: labels.map((label) => grouped[label].expense),
          borderColor: "#ef4444",
          backgroundColor: "rgba(239, 68, 68, 0.1)",
          tension: 0.4,
          fill: true,
          pointRadius: 4,
          pointHoverRadius: 6,
        },
      ],
    };
  }, [transactions]);

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <main className="dashboard-wrapper">
      <header className="dashboard-header">
        <div className="header-brand">
          <i className="ri-wallet-3-fill"></i>
          <h1>FinanceTracker</h1>
        </div>
        <div className="header-actions">
          <select value={role} onChange={(e) => setRole(e.target.value)} className="role-select">
            <option value="Admin">Admin</option>
            <option value="Viewer">Viewer</option>
          </select>
          <button type="button" onClick={exportCsv} className="secondary small">
            <i className="ri-download-line"></i> Export
          </button>
          <button type="button" onClick={() => setIsDarkMode(!isDarkMode)} className="icon-btn">
            <i className={isDarkMode ? "ri-sun-line" : "ri-moon-line"}></i>
          </button>
          <button type="button" className="secondary small" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>

      {error ? <p className="error-text fade-in">{error}</p> : null}

      <section className="metrics fade-in">
        <article className="metric-card">
          <i className="ri-safe-2-line metric-icon"></i>
          <h3>Net Balance</h3>
          <p>{formatCurrency(metrics.balance)}</p>
        </article>
        <article className="metric-card">
          <i className="ri-arrow-up-circle-line metric-icon text-success"></i>
          <h3>Total Income</h3>
          <p>{formatCurrency(metrics.income)}</p>
        </article>
        <article className="metric-card">
          <i className="ri-arrow-down-circle-line metric-icon text-danger"></i>
          <h3>Total Expenses</h3>
          <p>{formatCurrency(metrics.expense)}</p>
        </article>
        <article className="metric-card">
          <i className="ri-bar-chart-box-line metric-icon"></i>
          <h3>Savings Rate</h3>
          <p>{metrics.savingsRate.toFixed(1)}%</p>
        </article>
      </section>

      {role === "Admin" && (
        <section className="panel fade-in">
          <div className="panel-header">
            <h2>{editingTransactionId ? "Edit Transaction" : "Add Transaction"}</h2>
          </div>
          <form onSubmit={submitTransaction} className="grid-form">
            <label>
              Amount
              <input
                name="amount"
                type="number"
                step="0.01"
                min="0.01"
                value={form.amount}
                onChange={onFormChange}
                placeholder="0.00"
                required
              />
            </label>
            <label>
              Type
              <select name="type" value={form.type} onChange={onFormChange}>
                <option value="income">Income</option>
                <option value="expense">Expense</option>
              </select>
            </label>
            <label>
              Category
              <input
                name="category"
                value={form.category}
                onChange={onFormChange}
                placeholder="e.g., Groceries"
                required
              />
            </label>
            <label>
              Date
              <input name="date" type="date" value={form.date} onChange={onFormChange} required />
            </label>
            <label className="description-field">
              Description <span className="muted">(Optional)</span>
              <input name="description" value={form.description} onChange={onFormChange} placeholder="Details about this transaction..." />
            </label>
            <div className="form-actions description-field">
              <button type="submit" disabled={isSubmitting}>
                <i className={editingTransactionId ? "ri-save-line" : "ri-add-line"}></i>
                {isSubmitting
                  ? (editingTransactionId ? "Updating..." : "Adding...")
                  : (editingTransactionId ? "Update Transaction" : "Add Transaction")}
              </button>
              {editingTransactionId ? (
                <button type="button" className="secondary" onClick={cancelEdit}>
                  Cancel
                </button>
              ) : null}
            </div>
          </form>
        </section>
      )}

      <section className="charts-grid fade-in">
        <article className="panel">
          <div className="panel-header">
            <h2>Cash Flow Trend</h2>
          </div>
          <div className="chart-container">
            {lineData.labels.length > 0 ? (
              <Line data={lineData} options={chartOptions} />
            ) : (
              <div className="empty-state">
                <i className="ri-bar-chart-grouped-line"></i>
                <h3>No trend data</h3>
                <p>Add transactions to visualize your cash flow over time.</p>
              </div>
            )}
          </div>
        </article>

        <article className="panel">
          <div className="panel-header">
            <h2>Expenses by Category</h2>
          </div>
          <div className="chart-container">
            {pieData.labels.length > 0 ? (
              <Pie data={pieData} options={pieOptions} />
            ) : (
              <div className="empty-state">
                <i className="ri-pie-chart-2-line"></i>
                <h3>No category data</h3>
                <p>Add expense transactions to see your spending breakdown.</p>
              </div>
            )}
          </div>
        </article>
      </section>

      <section className="panel fade-in">
        <div className="panel-header">
          <h2>Recent Transactions <span className="muted" style={{marginLeft: '8px', fontSize: '1rem', fontWeight: 'normal'}}>({metrics.totalCount})</span></h2>
          <form className="flex items-center gap-2">
            <select name="category" value={filters.category} onChange={onFilterChange} style={{padding: '0.4rem 1rem'}}>
              <option value="">All Categories</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
            {filters.category && (
              <button type="button" className="icon-btn" onClick={() => setFilters(initialFilters)}>
                <i className="ri-close-line"></i>
              </button>
            )}
          </form>
        </div>
        
        {isLoading ? (
          <div className="empty-state">
            <i className="ri-loader-4-line ri-spin"></i>
            <p>Loading transactions...</p>
          </div>
        ) : transactions.length === 0 ? (
          <div className="empty-state">
            <i className="ri-file-list-3-line"></i>
            <h3>No transactions found</h3>
            <p>You haven't recorded any activity yet.</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Description</th>
                  <th>Category</th>
                  <th>Type</th>
                  <th>Amount</th>
                  {role === "Admin" && <th></th>}
                </tr>
              </thead>
              <tbody>
                {transactions.slice().reverse().map((tx) => (
                  <tr key={tx.id}>
                    <td className="muted">{String(tx.date).slice(0, 10)}</td>
                    <td className="font-semibold">{tx.description || <span className="muted">-</span>}</td>
                    <td>{tx.category}</td>
                    <td>
                      <span className={`tx-pill ${tx.type === 'income' ? 'tx-income' : 'tx-expense'}`}>
                        {tx.type}
                      </span>
                    </td>
                    <td className={`font-semibold ${tx.type === 'income' ? 'text-success' : ''}`}>
                      {tx.type === 'income' ? '+' : '-'}{formatCurrency(Number(tx.amount))}
                    </td>
                    {role === "Admin" && (
                      <td>
                        <div className="table-actions">
                          <button type="button" className="icon-btn" onClick={() => startEdit(tx)} aria-label="Edit">
                            <i className="ri-pencil-line"></i>
                          </button>
                          <button
                            type="button"
                            className="icon-btn text-danger"
                            onClick={() => removeTransaction(tx.id)}
                            disabled={deletingId === tx.id}
                            aria-label="Delete"
                          >
                            <i className={deletingId === tx.id ? "ri-loader-4-line ri-spin" : "ri-delete-bin-line"}></i>
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}

export default DashboardPage;
