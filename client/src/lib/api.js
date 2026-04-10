import axios from "axios";

let transactions = [
  { id: 1, amount: 2500, type: "income", category: "Salary", date: new Date().toISOString(), description: "Monthly Salary" },
  { id: 2, amount: 50, type: "expense", category: "Food", date: new Date().toISOString(), description: "Lunch" },
  { id: 3, amount: 120, type: "expense", category: "Utilities", date: new Date().toISOString(), description: "Electric Bill" },
  { id: 4, amount: 800, type: "expense", category: "Housing", date: new Date().toISOString(), description: "Rent" }
];
let nextId = 5;

const mockAdapter = async (config) => {
  await new Promise(resolve => setTimeout(resolve, 400)); // Simulate network delay
  
  const parseData = (data) => (typeof data === "string" ? JSON.parse(data) : data);
  const path = config.url.replace(config.baseURL || "", "");

  if (path === "/auth/login") {
    const data = parseData(config.data);
    if (!data.email || !data.password) {
      return Promise.reject({ response: { data: { message: "Email and password required" } } });
    }
    return {
      data: { token: "mock-jwt-token", user: { id: 1, email: data.email } },
      status: 200, statusText: "OK", headers: {}, config, request: {}
    };
  }

  if (path === "/auth/signup") {
    const data = parseData(config.data);
    return {
      data: { token: "mock-jwt-token", user: { id: 1, email: data.email } },
      status: 200, statusText: "OK", headers: {}, config, request: {}
    };
  }

  if (path === "/transactions" && config.method === "get") {
    return {
      data: { transactions: [...transactions] },
      status: 200, statusText: "OK", headers: {}, config, request: {}
    };
  }

  if (path === "/transactions" && config.method === "post") {
    const data = parseData(config.data);
    const newTx = { ...data, id: nextId++ };
    transactions.push(newTx);
    return {
      data: newTx,
      status: 201, statusText: "Created", headers: {}, config, request: {}
    };
  }

  if (path.match(/^\/transactions\/\d+$/) && config.method === "put") {
    const id = parseInt(path.split("/").pop());
    const data = parseData(config.data);
    const index = transactions.findIndex(t => t.id === id);
    if (index !== -1) {
      transactions[index] = { ...transactions[index], ...data };
      return {
        data: transactions[index],
        status: 200, statusText: "OK", headers: {}, config, request: {}
      };
    }
  }

  if (path.match(/^\/transactions\/\d+$/) && config.method === "delete") {
    const id = parseInt(path.split("/").pop());
    transactions = transactions.filter(t => t.id !== id);
    return {
      data: { message: "Deleted" },
      status: 200, statusText: "OK", headers: {}, config, request: {}
    };
  }

  // Dashboard exportCsv calls this
  if (path === "/transactions/export" && config.method === "get") {
    const csvContent = transactions.map(t => `${t.date},${t.type},${t.category},${t.amount},${t.description}`).join("\n");
    return {
      data: "Date,Type,Category,Amount,Description\n" + csvContent,
      status: 200, statusText: "OK", headers: {}, config, request: {}
    };
  }

  return Promise.reject({ response: { data: { message: "Route not found in mock" } } });
};

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000",
  adapter: mockAdapter
});

export function getAuthHeaders(token) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}
