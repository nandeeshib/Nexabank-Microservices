import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const API = 'http://localhost:8080/api';

const api = axios.create({ baseURL: API });
api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

const fmt = n => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(n);
const fmtDate = d => new Date(d).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });

const Icon = ({ d, size = 18, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);
const ICONS = {
  bank:    "M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10",
  credit:  "M12 5v14 M5 12l7-7 7 7",
  debit:   "M12 19V5 M5 12l7 7 7-7",
  transfer:"M17 1l4 4-4 4 M3 11V9a4 4 0 0 1 4-4h14 M7 23l-4-4 4-4 M21 13v2a4 4 0 0 1-4 4H3",
  account: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z",
  balance: "M12 2L2 7l10 5 10-5-10-5z M2 17l10 5 10-5 M2 12l10 5 10-5",
  logout:  "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4 M16 17l5-5-5-5 M21 12H9",
  history: "M12 8v4l3 3 M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0",
  plus:    "M12 5v14 M5 12h14",
};

const css = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --bg: #0a0c10; --card: #111318; --card2: #181c24; --border: #1e2330;
    --accent: #00e5a0; --accent2: #0066ff; --red: #ff4757; --gold: #ffd700;
    --text: #e8eaf0; --muted: #6b7280; --radius: 16px;
    --font-head: 'Syne', sans-serif; --font-body: 'DM Sans', sans-serif;
  }
  body { background: var(--bg); color: var(--text); font-family: var(--font-body); }
  .app { display: flex; min-height: 100vh; }
  .sidebar { width: 240px; background: var(--card); border-right: 1px solid var(--border);
    display: flex; flex-direction: column; padding: 24px 0; position: fixed;
    top: 0; left: 0; height: 100vh; z-index: 100; }
  .logo { padding: 0 24px 32px; display: flex; align-items: center; gap: 10px; }
  .logo-icon { width: 36px; height: 36px; background: var(--accent); border-radius: 10px;
    display: flex; align-items: center; justify-content: center; font-weight: 800;
    font-family: var(--font-head); color: #0a0c10; font-size: 16px; }
  .logo-name { font-family: var(--font-head); font-size: 20px; font-weight: 700;
    background: linear-gradient(135deg, var(--accent), var(--accent2));
    -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
  .nav { flex: 1; }
  .nav-item { display: flex; align-items: center; gap: 12px; padding: 12px 24px;
    cursor: pointer; color: var(--muted); font-size: 14px; font-weight: 500;
    transition: all .2s; border-left: 3px solid transparent; }
  .nav-item:hover { color: var(--text); background: var(--card2); }
  .nav-item.active { color: var(--accent); border-left-color: var(--accent); background: rgba(0,229,160,.06); }
  .sidebar-user { padding: 16px 24px; border-top: 1px solid var(--border); }
  .user-name { font-size: 13px; font-weight: 600; color: var(--text); }
  .user-role { font-size: 11px; color: var(--muted); text-transform: capitalize; }
  .logout-btn { margin-top: 12px; display: flex; align-items: center; gap: 8px;
    color: var(--red); font-size: 13px; cursor: pointer; padding: 8px 0; }
  .main { margin-left: 240px; flex: 1; padding: 32px; }
  .page-title { font-family: var(--font-head); font-size: 28px; font-weight: 700; margin-bottom: 8px; }
  .page-sub { color: var(--muted); font-size: 14px; margin-bottom: 28px; }
  .card { background: var(--card); border: 1px solid var(--border); border-radius: var(--radius); padding: 24px; }
  .card-grid { display: grid; gap: 20px; }
  .card-grid-2 { grid-template-columns: repeat(2, 1fr); }
  .card-grid-3 { grid-template-columns: repeat(3, 1fr); }
  .card-grid-4 { grid-template-columns: repeat(4, 1fr); }
  .stat-card { background: var(--card2); border: 1px solid var(--border); border-radius: var(--radius); padding: 20px; }
  .stat-label { font-size: 12px; color: var(--muted); font-weight: 500; text-transform: uppercase;
    letter-spacing: .05em; margin-bottom: 8px; }
  .stat-value { font-family: var(--font-head); font-size: 24px; font-weight: 700; }
  .stat-sub { font-size: 12px; color: var(--muted); margin-top: 4px; }
  .account-card { background: linear-gradient(135deg, #0f2027, #203a43, #2c5364);
    border: 1px solid var(--border); border-radius: 20px; padding: 24px;
    position: relative; overflow: hidden; cursor: pointer; transition: transform .2s; }
  .account-card:hover { transform: translateY(-2px); }
  .account-card::before { content: ''; position: absolute; top: -40px; right: -40px;
    width: 120px; height: 120px; border-radius: 50%; background: rgba(0,229,160,.1); }
  .acc-type { font-size: 11px; text-transform: uppercase; letter-spacing: .1em;
    color: var(--accent); font-weight: 600; }
  .acc-number { font-family: monospace; font-size: 13px; color: var(--muted); margin: 6px 0 16px; }
  .acc-balance { font-family: var(--font-head); font-size: 28px; font-weight: 700; }
  .acc-holder { font-size: 13px; color: var(--muted); margin-top: 12px; }
  .acc-status { display: inline-block; padding: 2px 10px; border-radius: 20px;
    font-size: 11px; font-weight: 600; text-transform: uppercase; }
  .status-active { background: rgba(0,229,160,.15); color: var(--accent); }
  .status-inactive { background: rgba(107,114,128,.15); color: var(--muted); }
  .status-frozen { background: rgba(255,71,87,.15); color: var(--red); }
  .form-group { margin-bottom: 16px; }
  .form-label { display: block; font-size: 13px; font-weight: 500; color: var(--muted); margin-bottom: 6px; }
  .form-input, .form-select { width: 100%; padding: 11px 14px; background: var(--card2);
    border: 1px solid var(--border); border-radius: 10px; color: var(--text);
    font-family: var(--font-body); font-size: 14px; transition: border-color .2s; outline: none; }
  .form-input:focus, .form-select:focus { border-color: var(--accent); }
  .form-select option { background: var(--card2); }
  .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  .btn { display: inline-flex; align-items: center; gap: 8px; padding: 11px 20px;
    border-radius: 10px; font-family: var(--font-body); font-size: 14px; font-weight: 600;
    cursor: pointer; border: none; transition: all .2s; }
  .btn-primary { background: var(--accent); color: #0a0c10; }
  .btn-primary:hover { background: #00c98a; }
  .btn-secondary { background: var(--card2); color: var(--text); border: 1px solid var(--border); }
  .btn-secondary:hover { border-color: var(--accent); color: var(--accent); }
  .btn-full { width: 100%; justify-content: center; }
  .btn:disabled { opacity: .5; cursor: not-allowed; }
  .table { width: 100%; border-collapse: collapse; }
  .table th { font-size: 12px; text-transform: uppercase; letter-spacing: .05em;
    color: var(--muted); font-weight: 600; text-align: left; padding: 10px 16px;
    border-bottom: 1px solid var(--border); }
  .table td { padding: 14px 16px; border-bottom: 1px solid var(--border); font-size: 14px; vertical-align: middle; }
  .table tr:last-child td { border-bottom: none; }
  .table tr:hover td { background: rgba(255,255,255,.02); }
  .txn-type { display: inline-flex; align-items: center; gap: 6px; padding: 3px 10px;
    border-radius: 20px; font-size: 12px; font-weight: 600; }
  .txn-credit { background: rgba(0,229,160,.1); color: var(--accent); }
  .txn-debit  { background: rgba(255,71,87,.1); color: var(--red); }
  .txn-transfer { background: rgba(0,102,255,.1); color: var(--accent2); }
  .amount-credit { color: var(--accent); font-weight: 700; }
  .amount-debit  { color: var(--red); font-weight: 700; }
  .toast { position: fixed; bottom: 28px; right: 28px; padding: 14px 20px;
    border-radius: 12px; font-size: 14px; font-weight: 500; z-index: 999;
    animation: slideUp .3s ease; max-width: 360px; }
  .toast-success { background: rgba(0,229,160,.15); border: 1px solid var(--accent); color: var(--accent); }
  .toast-error { background: rgba(255,71,87,.15); border: 1px solid var(--red); color: var(--red); }
  @keyframes slideUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
  .auth-wrap { min-height: 100vh; display: flex; align-items: center; justify-content: center;
    background: radial-gradient(ellipse at 30% 50%, rgba(0,229,160,.04) 0%, transparent 70%),
                radial-gradient(ellipse at 70% 20%, rgba(0,102,255,.06) 0%, transparent 60%), var(--bg); }
  .auth-card { background: var(--card); border: 1px solid var(--border); border-radius: 24px; padding: 40px; width: 420px; }
  .auth-logo { text-align: center; margin-bottom: 32px; }
  .auth-title { font-family: var(--font-head); font-size: 32px; font-weight: 800;
    background: linear-gradient(135deg, var(--accent), var(--accent2));
    -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
  .auth-sub { color: var(--muted); font-size: 14px; margin-top: 4px; }
  .auth-toggle { text-align: center; margin-top: 20px; color: var(--muted); font-size: 14px; }
  .auth-toggle span { color: var(--accent); cursor: pointer; font-weight: 600; }
  .section-title { font-family: var(--font-head); font-size: 18px; font-weight: 700; margin-bottom: 16px; }
  .empty { text-align: center; padding: 40px; color: var(--muted); font-size: 14px; }
  .loading { text-align: center; padding: 40px; color: var(--muted); }
  .error-msg { color: var(--red); font-size: 13px; margin-top: 8px; }
  @media(max-width:900px) {
    .card-grid-4 { grid-template-columns: repeat(2,1fr); }
    .card-grid-3 { grid-template-columns: repeat(2,1fr); }
    .card-grid-2 { grid-template-columns: 1fr; }
    .form-row { grid-template-columns: 1fr; }
  }
`;

function Toast({ msg, type, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, [onClose]);
  return <div className={`toast toast-${type}`}>{msg}</div>;
}

function AuthPage({ onLogin }) {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'customer' });
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  const handle = async () => {
    setErr(''); setLoading(true);
    try {
      const url = mode === 'login' ? '/auth/login' : '/auth/register';
      const { data } = await api.post(url, form);
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      onLogin(data.user);
    } catch (e) {
      setErr(e.response?.data?.error || 'Something went wrong');
    } finally { setLoading(false); }
  };

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-logo">
          <div style={{ fontSize: 40, marginBottom: 8 }}>🏦</div>
          <div className="auth-title">NexaBank</div>
          <div className="auth-sub">Cloud Banking · Microservices Architecture</div>
        </div>
        {mode === 'register' && (
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input className="form-input" placeholder="John Doe"
              value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          </div>
        )}
        <div className="form-group">
          <label className="form-label">Email Address</label>
          <input className="form-input" type="email" placeholder="you@email.com"
            value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
        </div>
        <div className="form-group">
          <label className="form-label">Password</label>
          <input className="form-input" type="password" placeholder="••••••••"
            value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
        </div>
        {mode === 'register' && (
          <div className="form-group">
            <label className="form-label">Role</label>
            <select className="form-select" value={form.role}
              onChange={e => setForm({ ...form, role: e.target.value })}>
              <option value="customer">Customer</option>
              <option value="admin">Admin</option>
            </select>
          </div>
        )}
        {err && <div className="error-msg">{err}</div>}
        <button className="btn btn-primary btn-full" style={{ marginTop: 20 }}
          onClick={handle} disabled={loading}>
          {loading ? 'Please wait…' : mode === 'login' ? '→ Sign In' : '→ Create Account'}
        </button>
        <div className="auth-toggle">
          {mode === 'login'
            ? <><span>Don't have an account? </span><span onClick={() => setMode('register')}>Register</span></>
            : <><span>Already have an account? </span><span onClick={() => setMode('login')}>Sign In</span></>}
        </div>
      </div>
    </div>
  );
}

function Dashboard({ user }) {
  const [summary, setSummary] = useState(null);
  const [accounts, setAccounts] = useState([]);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/balance/user/all');
      setSummary(data);
      setAccounts(data.accounts || []);
    } catch {}
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <div className="page-title">Welcome back, {user.name.split(' ')[0]} 👋</div>
      <div className="page-sub">Here's your financial overview</div>
      <div className="card-grid card-grid-4" style={{ marginBottom: 28 }}>
        <div className="stat-card">
          <div className="stat-label">Total Balance</div>
          <div className="stat-value" style={{ color: 'var(--accent)' }}>{summary ? fmt(summary.totalBalance) : '—'}</div>
          <div className="stat-sub">Across all accounts</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Accounts</div>
          <div className="stat-value">{summary?.totalAccounts ?? '—'}</div>
          <div className="stat-sub">Active accounts</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Currency</div>
          <div className="stat-value">INR ₹</div>
          <div className="stat-sub">Indian Rupee</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Account Role</div>
          <div className="stat-value" style={{ fontSize: 18, textTransform: 'capitalize' }}>{user.role}</div>
          <div className="stat-sub">{user.email}</div>
        </div>
      </div>
      {accounts.length > 0 && (
        <>
          <div className="section-title">Your Accounts</div>
          <div className="card-grid card-grid-2">
            {accounts.map(a => (
              <div className="account-card" key={a.accountId}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div className="acc-type">{a.accountType?.replace('_', ' ')} Account</div>
                  <span className={`acc-status status-${a.status}`}>{a.status}</span>
                </div>
                <div className="acc-number">{a.accountNumber}</div>
                <div className="acc-balance">{fmt(a.balance)}</div>
                <div className="acc-holder">{a.holderName}</div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function CreateAccount({ onSuccess }) {
  const [form, setForm] = useState({
    holderName: '', email: '', phone: '', address: '',
    accountType: 'savings', initialDeposit: ''
  });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const submit = async () => {
    setErr(''); setLoading(true);
    try {
      const { data } = await api.post('/accounts', {
        ...form, initialDeposit: Number(form.initialDeposit) || 0
      });
      onSuccess(`Account created! Number: ${data.account.accountNumber}`);
      setForm({ holderName: '', email: '', phone: '', address: '', accountType: 'savings', initialDeposit: '' });
    } catch (e) {
      setErr(e.response?.data?.error || 'Failed to create account');
    } finally { setLoading(false); }
  };

  return (
    <div>
      <div className="page-title">Open New Account</div>
      <div className="page-sub">Create a new bank account for a customer</div>
      <div className="card" style={{ maxWidth: 600 }}>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Account Holder Name *</label>
            <input className="form-input" placeholder="Full legal name"
              value={form.holderName} onChange={e => setForm({ ...form, holderName: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Account Type</label>
            <select className="form-select" value={form.accountType}
              onChange={e => setForm({ ...form, accountType: e.target.value })}>
              <option value="savings">Savings Account</option>
              <option value="current">Current Account</option>
              <option value="fixed_deposit">Fixed Deposit</option>
            </select>
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Email Address *</label>
            <input className="form-input" type="email" placeholder="customer@email.com"
              value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Phone Number *</label>
            <input className="form-input" placeholder="+91 XXXXX XXXXX"
              value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Address</label>
          <input className="form-input" placeholder="Street, City, State, PIN"
            value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
        </div>
        <div className="form-group">
          <label className="form-label">Initial Deposit (₹)</label>
          <input className="form-input" type="number" placeholder="0"
            value={form.initialDeposit} onChange={e => setForm({ ...form, initialDeposit: e.target.value })} />
        </div>
        {err && <div className="error-msg">{err}</div>}
        <button className="btn btn-primary btn-full" onClick={submit} disabled={loading}>
          <Icon d={ICONS.plus} size={16} />
          {loading ? 'Creating…' : 'Open Account'}
        </button>
      </div>
    </div>
  );
}

function Transactions({ onSuccess }) {
  const [accounts, setAccounts] = useState([]);
  const [tab, setTab] = useState('credit');
  const [form, setForm] = useState({ accountId: '', amount: '', description: '', category: 'deposit', toAccountNumber: '' });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    api.get('/accounts').then(r => setAccounts(r.data.accounts || [])).catch(() => {});
  }, []);

  const submit = async () => {
    setErr(''); setLoading(true);
    try {
      if (tab === 'transfer') {
        await api.post('/transactions/transfer', {
          fromAccountId: form.accountId,
          toAccountNumber: form.toAccountNumber,
          amount: Number(form.amount),
          description: form.description
        });
        onSuccess('Transfer completed successfully!');
      } else {
        await api.post('/transactions/' + tab, {
          accountId: form.accountId,
          amount: Number(form.amount),
          description: form.description,
          category: form.category
        });
        onSuccess(tab.charAt(0).toUpperCase() + tab.slice(1) + ' of ' + fmt(form.amount) + ' completed!');
      }
      setForm({ accountId: '', amount: '', description: '', category: 'deposit', toAccountNumber: '' });
    } catch (e) {
      setErr(e.response?.data?.error || 'Transaction failed');
    } finally { setLoading(false); }
  };

  const tabs = [
    { id: 'credit',   label: 'Credit / Deposit',  icon: ICONS.credit },
    { id: 'debit',    label: 'Debit / Withdraw',   icon: ICONS.debit },
    { id: 'transfer', label: 'Fund Transfer',       icon: ICONS.transfer },
  ];

  const categories = {
    credit: ['deposit', 'salary', 'other'],
    debit:  ['withdrawal', 'payment', 'other'],
    transfer: ['transfer']
  };

  return (
    <div>
      <div className="page-title">Transactions</div>
      <div className="page-sub">Perform credit, debit, and fund transfer operations</div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {tabs.map(t => (
          <button key={t.id} className={'btn ' + (tab === t.id ? 'btn-primary' : 'btn-secondary')}
            onClick={() => setTab(t.id)}>
            <Icon d={t.icon} size={15} />
            {t.label}
          </button>
        ))}
      </div>
      <div className="card" style={{ maxWidth: 560 }}>
        <div className="section-title" style={{ marginBottom: 20 }}>
          {tab === 'credit' ? '💰 Deposit Funds' : tab === 'debit' ? '💸 Withdraw Funds' : '↔️ Transfer Funds'}
        </div>
        <div className="form-group">
          <label className="form-label">{tab === 'transfer' ? 'From Account' : 'Account'}</label>
          <select className="form-select" value={form.accountId}
            onChange={e => setForm({ ...form, accountId: e.target.value })}>
            <option value="">-- Select Account --</option>
            {accounts.map(a => (
              <option key={a._id} value={a._id}>
                {a.accountNumber} — {a.holderName} ({fmt(a.balance)})
              </option>
            ))}
          </select>
        </div>
        {tab === 'transfer' && (
          <div className="form-group">
            <label className="form-label">To Account Number</label>
            <input className="form-input" placeholder="ACC12345678001"
              value={form.toAccountNumber} onChange={e => setForm({ ...form, toAccountNumber: e.target.value })} />
          </div>
        )}
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Amount (₹) *</label>
            <input className="form-input" type="number" placeholder="0.00"
              value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} />
          </div>
          {tab !== 'transfer' && (
            <div className="form-group">
              <label className="form-label">Category</label>
              <select className="form-select" value={form.category}
                onChange={e => setForm({ ...form, category: e.target.value })}>
                {(categories[tab] || []).map(c => (
                  <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                ))}
              </select>
            </div>
          )}
        </div>
        <div className="form-group">
          <label className="form-label">Description / Remarks</label>
          <input className="form-input" placeholder="Optional note…"
            value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
        </div>
        {err && <div className="error-msg">{err}</div>}
        <button className="btn btn-primary btn-full" onClick={submit}
          disabled={loading || !form.accountId || !form.amount}>
          {loading ? 'Processing…' : 'Confirm ' + tab.charAt(0).toUpperCase() + tab.slice(1)}
        </button>
      </div>
    </div>
  );
}

function BalancePage() {
  const [accounts, setAccounts] = useState([]);
  const [selected, setSelected] = useState('');
  const [detail, setDetail] = useState(null);
  const [txns, setTxns] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get('/accounts').then(r => setAccounts(r.data.accounts || [])).catch(() => {});
  }, []);

  const loadBalance = async (id) => {
    setSelected(id); setLoading(true);
    try {
      const [balRes, txnRes] = await Promise.all([
        api.get('/balance/' + id),
        api.get('/transactions/' + id + '?limit=20')
      ]);
      setDetail(balRes.data);
      setTxns(txnRes.data.transactions || []);
    } catch {}
    setLoading(false);
  };

  const txnClass = t => (t.type === 'credit' || t.type === 'transfer_in') ? 'amount-credit' : 'amount-debit';
  const txnSign  = t => (t.type === 'credit' || t.type === 'transfer_in') ? '+' : '-';
  const txnBadge = t => {
    if (t.type === 'credit') return 'txn-credit';
    if (t.type === 'debit')  return 'txn-debit';
    return 'txn-transfer';
  };

  return (
    <div>
      <div className="page-title">Balance & Statement</div>
      <div className="page-sub">View account balance and transaction history</div>
      <div className="card" style={{ marginBottom: 24 }}>
        <label className="form-label">Select Account</label>
        <select className="form-select" style={{ maxWidth: 400 }}
          value={selected} onChange={e => loadBalance(e.target.value)}>
          <option value="">-- Choose Account --</option>
          {accounts.map(a => (
            <option key={a._id} value={a._id}>
              {a.accountNumber} — {a.holderName}
            </option>
          ))}
        </select>
      </div>
      {loading && <div className="loading">Loading account details…</div>}
      {detail && !loading && (
        <>
          <div style={{ marginBottom: 24 }}>
            <div className="account-card" style={{ maxWidth: 420 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div className="acc-type">{detail.accountType?.replace('_', ' ')} Account</div>
                <span className={'acc-status status-' + detail.status}>{detail.status}</span>
              </div>
              <div className="acc-number">{detail.accountNumber}</div>
              <div className="acc-balance">{fmt(detail.currentBalance)}</div>
              <div className="acc-holder">{detail.holderName}</div>
              <div style={{ marginTop: 12, fontSize: 12, color: 'var(--muted)' }}>
                IFSC: {detail.ifscCode} &nbsp;|&nbsp; Branch: {detail.branchName}
              </div>
            </div>
          </div>
          <div className="card-grid card-grid-3" style={{ marginBottom: 24 }}>
            <div className="stat-card">
              <div className="stat-label">Recent Credits</div>
              <div className="stat-value" style={{ color: 'var(--accent)', fontSize: 18 }}>
                {fmt(detail.summary.recentCreditTotal)}
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Recent Debits</div>
              <div className="stat-value" style={{ color: 'var(--red)', fontSize: 18 }}>
                {fmt(detail.summary.recentDebitTotal)}
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Total Transactions</div>
              <div className="stat-value" style={{ fontSize: 18 }}>{detail.summary.totalTransactions}</div>
            </div>
          </div>
          <div className="section-title">Transaction History</div>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {txns.length === 0
              ? <div className="empty">No transactions yet</div>
              : (
                <table className="table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Transaction ID</th>
                      <th>Type</th>
                      <th>Description</th>
                      <th>Amount</th>
                      <th>Balance After</th>
                    </tr>
                  </thead>
                  <tbody>
                    {txns.map(t => (
                      <tr key={t._id}>
                        <td style={{ color: 'var(--muted)', fontSize: 12 }}>{fmtDate(t.createdAt)}</td>
                        <td style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--muted)' }}>{t.transactionId}</td>
                        <td><span className={'txn-type ' + txnBadge(t)}>{t.type.replace('_', ' ')}</span></td>
                        <td style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {t.description}
                        </td>
                        <td className={txnClass(t)}>{txnSign(t)}{fmt(t.amount)}</td>
                        <td>{fmt(t.balanceAfter)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
          </div>
        </>
      )}
    </div>
  );
}

function AccountsList() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/accounts').then(r => { setAccounts(r.data.accounts || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading">Loading accounts…</div>;

  return (
    <div>
      <div className="page-title">All Accounts</div>
      <div className="page-sub">Manage and view all bank accounts</div>
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {accounts.length === 0
          ? <div className="empty">No accounts found. Open a new account to get started.</div>
          : (
            <table className="table">
              <thead>
                <tr>
                  <th>Account Number</th>
                  <th>Holder Name</th>
                  <th>Type</th>
                  <th>Balance</th>
                  <th>IFSC</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map(a => (
                  <tr key={a._id}>
                    <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{a.accountNumber}</td>
                    <td style={{ fontWeight: 500 }}>{a.holderName}</td>
                    <td style={{ textTransform: 'capitalize' }}>{a.accountType?.replace('_', ' ')}</td>
                    <td style={{ fontWeight: 700, color: 'var(--accent)' }}>{fmt(a.balance)}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--muted)' }}>BANK0001234</td>
                    <td><span className={'acc-status status-' + a.status}>{a.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
      </div>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('user')); } catch { return null; }
  });
  const [page, setPage] = useState('dashboard');
  const [toast, setToast] = useState(null);

  const notify = (msg, type = 'success') => setToast({ msg, type });

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  if (!user) return (
    <>
      <style>{css}</style>
      <AuthPage onLogin={u => setUser(u)} />
    </>
  );

  const nav = [
    { id: 'dashboard', label: 'Dashboard',           icon: ICONS.bank },
    { id: 'accounts',  label: 'All Accounts',        icon: ICONS.account },
    { id: 'open',      label: 'Open Account',        icon: ICONS.plus },
    { id: 'txn',       label: 'Transactions',        icon: ICONS.transfer },
    { id: 'balance',   label: 'Balance & Statement', icon: ICONS.balance },
  ];

  return (
    <>
      <style>{css}</style>
      <div className="app">
        <aside className="sidebar">
          <div className="logo">
            <div className="logo-icon">N</div>
            <div className="logo-name">NexaBank</div>
          </div>
          <nav className="nav">
            {nav.map(n => (
              <div key={n.id} className={'nav-item ' + (page === n.id ? 'active' : '')}
                onClick={() => setPage(n.id)}>
                <Icon d={n.icon} size={16} />
                {n.label}
              </div>
            ))}
          </nav>
          <div className="sidebar-user">
            <div className="user-name">{user.name}</div>
            <div className="user-role">{user.role} · {user.email}</div>
            <div className="logout-btn" onClick={logout}>
              <Icon d={ICONS.logout} size={14} />
              Sign Out
            </div>
          </div>
        </aside>
        <main className="main">
          {page === 'dashboard' && <Dashboard user={user} />}
          {page === 'accounts'  && <AccountsList />}
          {page === 'open'      && <CreateAccount onSuccess={msg => { notify(msg); setPage('accounts'); }} />}
          {page === 'txn'       && <Transactions onSuccess={msg => { notify(msg); setPage('balance'); }} />}
          {page === 'balance'   && <BalancePage />}
        </main>
        {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      </div>
    </>
  );
}
