const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors({ origin: '*' }));

app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    gateway: 'Banking API Gateway',
    timestamp: new Date().toISOString(),
    services: {
      auth:        process.env.AUTH_SERVICE,
      account:     process.env.ACCOUNT_SERVICE,
      transaction: process.env.TRANSACTION_SERVICE,
      balance:     process.env.BALANCE_SERVICE,
    }
  });
});

const routes = [
  { path: '/api/auth',         target: process.env.AUTH_SERVICE },
  { path: '/api/accounts',     target: process.env.ACCOUNT_SERVICE },
  { path: '/api/transactions', target: process.env.TRANSACTION_SERVICE },
  { path: '/api/balance',      target: process.env.BALANCE_SERVICE },
];

routes.forEach(({ path, target }) => {
  app.use(path, createProxyMiddleware({
    target,
    changeOrigin: true,
    on: {
      error: (err, req, res) => {
        console.error(`[Gateway] Error routing ${path}:`, err.message);
        res.status(503).json({ error: `Service unavailable: ${path}` });
      }
    }
  }));
  console.log(`[Gateway] ${path} → ${target}`);
});

app.listen(PORT, () => console.log(`\n🏦 API Gateway running on port ${PORT}\n`));
