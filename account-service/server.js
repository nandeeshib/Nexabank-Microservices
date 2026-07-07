const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 8002;
const JWT_SECRET = process.env.JWT_SECRET || 'banking_secret_2024';

app.use(cors({ origin: '*' }));
app.use(express.json());

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('[Account] MongoDB connected'))
  .catch(err => console.error('[Account] MongoDB error:', err));

const accountSchema = new mongoose.Schema({
  userId:        { type: String, required: true },
  accountNumber: { type: String, unique: true },
  accountType:   { type: String, enum: ['savings', 'current', 'fixed_deposit'], default: 'savings' },
  holderName:    { type: String, required: true },
  email:         { type: String, required: true },
  phone:         { type: String, required: true },
  address:       { type: String },
  balance:       { type: Number, default: 0 },
  currency:      { type: String, default: 'INR' },
  status:        { type: String, enum: ['active', 'inactive', 'frozen'], default: 'active' },
  ifscCode:      { type: String, default: 'BANK0001234' },
  branchName:    { type: String, default: 'Main Branch' },
  createdAt:     { type: Date, default: Date.now }
});

accountSchema.pre('save', async function (next) {
  if (!this.accountNumber) {
    const count = await Account.countDocuments();
    this.accountNumber = `ACC${String(Date.now()).slice(-8)}${String(count + 1).padStart(3, '0')}`;
  }
  next();
});

const Account = mongoose.model('Account', accountSchema);

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

// ── Health check FIRST (before any /:id routes) ───────────
app.get('/api/accounts/health', (_, res) => res.json({ status: 'Account Service OK' }));

// ── Create Account ────────────────────────────────────────
app.post('/api/accounts', verifyToken, async (req, res) => {
  try {
    const { accountType, holderName, email, phone, address, initialDeposit } = req.body;
    if (!holderName || !email || !phone)
      return res.status(400).json({ error: 'holderName, email, phone required' });
    const account = await Account.create({
      userId: req.user.id,
      accountType: accountType || 'savings',
      holderName, email, phone, address,
      balance: initialDeposit || 0
    });
    res.status(201).json({ message: 'Account created successfully', account });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── List All Accounts ─────────────────────────────────────
app.get('/api/accounts', verifyToken, async (req, res) => {
  try {
    const query = req.user.role === 'admin' ? {} : { userId: req.user.id };
    const accounts = await Account.find(query).sort({ createdAt: -1 });
    res.json({ count: accounts.length, accounts });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Get by Account Number ─────────────────────────────────
app.get('/api/accounts/number/:accountNumber', async (req, res) => {
  try {
    const account = await Account.findOne({ accountNumber: req.params.accountNumber });
    if (!account) return res.status(404).json({ error: 'Account not found' });
    res.json(account);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Get by ID ─────────────────────────────────────────────
app.get('/api/accounts/:id', verifyToken, async (req, res) => {
  try {
    const account = await Account.findById(req.params.id);
    if (!account) return res.status(404).json({ error: 'Account not found' });
    res.json(account);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Update Balance (internal) ─────────────────────────────
app.patch('/api/accounts/:id/balance', async (req, res) => {
  try {
    const { amount, operation } = req.body;
    const account = await Account.findById(req.params.id);
    if (!account) return res.status(404).json({ error: 'Account not found' });
    if (account.status !== 'active') return res.status(403).json({ error: 'Account is not active' });
    if (operation === 'credit') {
      account.balance += amount;
    } else if (operation === 'debit') {
      if (account.balance < amount) return res.status(400).json({ error: 'Insufficient balance' });
      account.balance -= amount;
    } else {
      return res.status(400).json({ error: 'operation must be credit or debit' });
    }
    await account.save();
    res.json({ message: `Balance ${operation}ed successfully`, balance: account.balance, account });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Update Account Details ────────────────────────────────
app.put('/api/accounts/:id', verifyToken, async (req, res) => {
  try {
    const allowed = ['holderName', 'phone', 'address', 'status'];
    const updates = {};
    allowed.forEach(k => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });
    const account = await Account.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!account) return res.status(404).json({ error: 'Account not found' });
    res.json({ message: 'Account updated', account });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => console.log(`[Account Service] Running on port ${PORT}`));
