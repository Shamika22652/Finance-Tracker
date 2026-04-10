# 1. Tech stack used
- Frontend: React (Vite, Hooks, React Router, Chart.js via react-chartjs-2)
- Backend: Node.js + Express
- Database: MySQL
- Authentication: JWT + bcrypt

# 2. Prerequisites (Node.js, MySQL)
- Node.js 18+ and npm
- MySQL 8+

# 3. Setup steps (npm install)
```bash
cd server
npm install
cd ../client
npm install
```

# 4. Database setup steps (SQL queries)
Run in MySQL client:
```sql
CREATE DATABASE IF NOT EXISTS finance_tracker;
USE finance_tracker;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS transactions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  type ENUM('income', 'expense') NOT NULL,
  category VARCHAR(100) NOT NULL,
  date DATE NOT NULL,
  description VARCHAR(500),
  CONSTRAINT fk_transactions_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE
);
```

# 5. Environment variables (.env example)
Create `server/.env`:
```env
PORT=5000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=finance_tracker
JWT_SECRET=replace_with_strong_secret
JWT_EXPIRES_IN=7d
CLIENT_ORIGIN=http://localhost:5173
```

Create `client/.env`:
```env
VITE_API_URL=http://localhost:5000
```

# 6. Commands to run backend and frontend
From project root (single command):
```bash
npm run dev
```

Or run separately in two terminals:

Terminal 1:
```bash
cd server
npm run dev
```

Terminal 2:
```bash
cd client
npm run dev
```

# 7. How to verify
- Signup: Open `http://localhost:5173/signup`, create a new account.
- Login: Open `http://localhost:5173/login`, sign in with the same account.
- Add transaction: In Dashboard, submit amount, type, category, date, description.
- Edit transaction: Click `Edit` in table, update fields, then click `Update`.
- Delete transaction: Click `Delete` in table and confirm row is removed.
- Filter: Set start/end date and category in Filters section and confirm list updates.
- View charts: Confirm pie chart shows expense category split and line chart shows monthly trend.
- Export CSV: Click `Export CSV` and confirm a `.csv` file downloads with your transactions.
- Metrics: Confirm Net Balance, Income, Expenses, Savings Rate, and Top Expense Category update as data changes.

# 8. Troubleshooting login/signup
- If login says `No account found`, sign up first with that email.
- Email is normalized (trimmed + lowercase) at signup/login, so `User@Email.com` and `user@email.com` are treated as the same account.
- Frontend can run on both `http://localhost:5173` and `http://127.0.0.1:5173`.
