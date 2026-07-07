const express = require('express');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 8004;
const JWT_SECRET = process.env.JWT_SECRET || 'banking_secret_2024';
const ACCOUNT_SERVICE_URL = process.env.ACCOUNT_SERVICE_URL || 'http://localhost:8002';
const TRANSACTION_SERVICE_URL = process.env.TRANSACTION_SERVICE_URL || 'http://localhost:8003';

app.use(cors({ origin: '*' }));
app.use(express.json());

const verifyToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token required' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// ── Health check FIRST (before any /:param routes) ────────
app.get('/api/balance/health', (_, res) => res.json({ status: 'Balance Service OK' }));

// ── All accounts balance for user ─────────────────────────
app.get('/api/balance/user/all', verifyToken, async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const accRes = await axios.get(`${ACCOUNT_SERVICE_URL}/api/accounts`, {
      headers: { Authorization: authHeader }
    });
    const accounts = accRes.data.accounts;
    const summary = accounts.map(a => ({
      accountId:     a._id,
      accountNumber: a.accountNumber,
      accountType:   a.accountType,
      holderName:    a.holderName,
      balance:       a.balance,
      currency:      a.currency,
      status:        a.status
    }));
    const totalBalance = summary.reduce((s, a) => s + a.balance, 0);
    res.json({ totalAccounts: accounts.length, totalBalance, currency: 'INR', accounts: summary });
  } catch (err) {
    res.status(err.response?.status || 500).json({ error: err.response?.data?.error || err.message });
  }
});

// ── Full balance summary for one account ──────────────────
app.get('/api/balance/:accountId', verifyToken, async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const [accountRes, txnRes] = await Promise.all([
      axios.get(`${ACCOUNT_SERVICE_URL}/api/accounts/${req.params.accountId}`, {
        headers: { Authorization: authHeader }
      }),
      axios.get(`${TRANSACTION_SERVICE_URL}/api/transactions/${req.params.accountId}?limit=5`, {
        headers: { Authorization: authHeader }
      })
    ]);
    const account = accountRes.data;
    const { transactions, total: txnCount } = txnRes.data;
    const credits = transactions.filter(t => t.type === 'credit' || t.type === 'transfer_in');
    const debits  = transactions.filter(t => t.type === 'debit'  || t.type === 'transfer_out');
    const totalCredit = credits.reduce((s, t) => s + t.amount, 0);
    const totalDebit  = debits.reduce((s, t)  => s + t.amount, 0);
    res.json({
      accountNumber:  account.accountNumber,
      holderName:     account.holderName,
      accountType:    account.accountType,
      currency:       account.currency,
      currentBalance: account.balance,
      status:         account.status,
      ifscCode:       account.ifscCode,
      branchName:     account.branchName,
      summary: {
        totalTransactions: txnCount,
        recentCreditTotal: totalCredit,
        recentDebitTotal:  totalDebit,
        lastUpdated:       new Date().toISOString()
      },
      recentTransactions: transactions
    });
  } catch (err) {
    res.status(err.response?.status || 500).json({ error: err.response?.data?.error || err.message });
  }
});

app.listen(PORT, () => console.log(`[Balance Service] Running on port ${PORT}`));
