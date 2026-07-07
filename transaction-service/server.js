const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 8003;
const JWT_SECRET = process.env.JWT_SECRET || 'banking_secret_2024';
const ACCOUNT_SERVICE_URL = process.env.ACCOUNT_SERVICE_URL || 'http://localhost:8002';

app.use(cors({ origin: '*' }));
app.use(express.json());

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('[Transaction] MongoDB connected'))
  .catch(err => console.error('[Transaction] MongoDB error:', err));

const transactionSchema = new mongoose.Schema({
  transactionId:  { type: String, unique: true },
  accountId:      { type: String, required: true },
  accountNumber:  { type: String },
  userId:         { type: String, required: true },
  type:           { type: String, enum: ['credit','debit','transfer_in','transfer_out'], required: true },
  amount:         { type: Number, required: true },
  currency:       { type: String, default: 'INR' },
  description:    { type: String },
  category:       { type: String, enum: ['deposit','withdrawal','transfer','payment','salary','other'], default: 'other' },
  status:         { type: String, enum: ['pending','completed','failed'], default: 'completed' },
  balanceBefore:  { type: Number },
  balanceAfter:   { type: Number },
  referenceId:    { type: String },
  relatedAccount: { type: String },
  createdAt:      { type: Date, default: Date.now }
});

transactionSchema.pre('save', function(next) {
  if (!this.transactionId)
    this.transactionId = `TXN${Date.now()}${Math.floor(Math.random()*1000)}`;
  next();
});
const Transaction = mongoose.model('Transaction', transactionSchema);

const verifyToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token required' });
  try { req.user = jwt.verify(token, JWT_SECRET); next(); }
  catch { res.status(401).json({ error: 'Invalid token' }); }
};

app.get('/api/transactions/health', (_, res) => res.json({ status: 'Transaction Service OK' }));

app.post('/api/transactions/credit', verifyToken, async (req, res) => {
  try {
    const { accountId, amount, description, category } = req.body;
    if (!accountId || !amount || amount <= 0)
      return res.status(400).json({ error: 'accountId and positive amount required' });
    const accRes = await axios.get(`${ACCOUNT_SERVICE_URL}/api/accounts/${accountId}`,
      { headers: { Authorization: req.headers['authorization'] } });
    const account = accRes.data;
    const balanceBefore = account.balance;
    const updateRes = await axios.patch(`${ACCOUNT_SERVICE_URL}/api/accounts/${accountId}/balance`,
      { amount, operation: 'credit' });
    const txn = await Transaction.create({
      accountId, accountNumber: account.accountNumber, userId: req.user.id,
      type: 'credit', amount, description: description || 'Credit transaction',
      category: category || 'deposit', balanceBefore, balanceAfter: updateRes.data.balance
    });
    res.status(201).json({ message: 'Credit successful', transaction: txn, newBalance: updateRes.data.balance });
  } catch (err) { res.status(err.response?.status||500).json({ error: err.response?.data?.error||err.message }); }
});

app.post('/api/transactions/debit', verifyToken, async (req, res) => {
  try {
    const { accountId, amount, description, category } = req.body;
    if (!accountId || !amount || amount <= 0)
      return res.status(400).json({ error: 'accountId and positive amount required' });
    const accRes = await axios.get(`${ACCOUNT_SERVICE_URL}/api/accounts/${accountId}`,
      { headers: { Authorization: req.headers['authorization'] } });
    const account = accRes.data;
    const balanceBefore = account.balance;
    const updateRes = await axios.patch(`${ACCOUNT_SERVICE_URL}/api/accounts/${accountId}/balance`,
      { amount, operation: 'debit' });
    const txn = await Transaction.create({
      accountId, accountNumber: account.accountNumber, userId: req.user.id,
      type: 'debit', amount, description: description || 'Debit transaction',
      category: category || 'withdrawal', balanceBefore, balanceAfter: updateRes.data.balance
    });
    res.status(201).json({ message: 'Debit successful', transaction: txn, newBalance: updateRes.data.balance });
  } catch (err) { res.status(err.response?.status||500).json({ error: err.response?.data?.error||err.message }); }
});

app.post('/api/transactions/transfer', verifyToken, async (req, res) => {
  try {
    const { fromAccountId, toAccountNumber, amount, description } = req.body;
    if (!fromAccountId || !toAccountNumber || !amount || amount <= 0)
      return res.status(400).json({ error: 'fromAccountId, toAccountNumber, amount required' });
    const srcRes = await axios.get(`${ACCOUNT_SERVICE_URL}/api/accounts/${fromAccountId}`,
      { headers: { Authorization: req.headers['authorization'] } });
    const dstRes = await axios.get(`${ACCOUNT_SERVICE_URL}/api/accounts/number/${toAccountNumber}`);
    const srcAccount = srcRes.data, dstAccount = dstRes.data;
    if (srcAccount.accountNumber === toAccountNumber)
      return res.status(400).json({ error: 'Cannot transfer to same account' });
    const srcBefore = srcAccount.balance, dstBefore = dstAccount.balance;
    const srcUpdate = await axios.patch(`${ACCOUNT_SERVICE_URL}/api/accounts/${fromAccountId}/balance`,
      { amount, operation: 'debit' });
    const dstUpdate = await axios.patch(`${ACCOUNT_SERVICE_URL}/api/accounts/${dstAccount._id}/balance`,
      { amount, operation: 'credit' });
    const refId = `TRF${Date.now()}`;
    const [txnOut, txnIn] = await Promise.all([
      Transaction.create({ accountId: fromAccountId, accountNumber: srcAccount.accountNumber,
        userId: req.user.id, type: 'transfer_out', amount,
        description: description || `Transfer to ${toAccountNumber}`, category: 'transfer',
        balanceBefore: srcBefore, balanceAfter: srcUpdate.data.balance,
        referenceId: refId, relatedAccount: toAccountNumber }),
      Transaction.create({ accountId: dstAccount._id, accountNumber: dstAccount.accountNumber,
        userId: dstAccount.userId, type: 'transfer_in', amount,
        description: `Transfer from ${srcAccount.accountNumber}`, category: 'transfer',
        balanceBefore: dstBefore, balanceAfter: dstUpdate.data.balance,
        referenceId: refId, relatedAccount: srcAccount.accountNumber })
    ]);
    res.status(201).json({ message: 'Transfer successful', referenceId: refId,
      debitTransaction: txnOut, creditTransaction: txnIn, newBalance: srcUpdate.data.balance });
  } catch (err) { res.status(err.response?.status||500).json({ error: err.response?.data?.error||err.message }); }
});

app.get('/api/transactions/:accountId', verifyToken, async (req, res) => {
  try {
    const { page=1, limit=10, type, category } = req.query;
    const filter = { accountId: req.params.accountId };
    if (type) filter.type = type;
    if (category) filter.category = category;
    const total = await Transaction.countDocuments(filter);
    const transactions = await Transaction.find(filter)
      .sort({ createdAt: -1 }).skip((page-1)*limit).limit(parseInt(limit));
    res.json({ total, page: parseInt(page), pages: Math.ceil(total/limit), transactions });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.listen(PORT, () => console.log(`[Transaction Service] Running on port ${PORT}`));
