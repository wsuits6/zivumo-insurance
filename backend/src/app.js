const express = require('express');
const helmet = require('helmet');
const path = require('path');

const { loadEnv } = require('./config/env');
loadEnv();

const createAuthRouter = require('./routes/auth');
const createAdminRouter = require('./routes/admin');
const createPoliciesRouter = require('./routes/policies');
const createAccountRouter = require('./routes/account');
const createResourcesRouter = require('./routes/resources');
const createPaymentRouter = require('./routes/payment');
const createComplaintsRouter = require('./routes/complaints');

const app = express();

app.disable('x-powered-by');

app.use(helmet({ contentSecurityPolicy: false }));

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

app.use(express.json({ limit: '150kb' }));
app.use(express.urlencoded({ extended: false }));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, status: 'ok' });
});

app.use('/api', createAuthRouter());
app.use('/api/admin', createAdminRouter());
app.use('/api', createPoliciesRouter());
app.use('/api', createAccountRouter());
app.use('/api', createResourcesRouter());
app.use('/api', createPaymentRouter());
app.use('/api', createComplaintsRouter());

const ROOT_DIR = path.join(__dirname, '..', '..');

app.use('/assets', express.static(path.join(ROOT_DIR, 'assets')));
app.use('/pages', express.static(path.join(ROOT_DIR, 'pages')));

app.get('/', (_req, res) => {
  res.sendFile(path.join(ROOT_DIR, 'index.html'));
});
app.get('/index.html', (_req, res) => {
  res.sendFile(path.join(ROOT_DIR, 'index.html'));
});

const PAGE_LIST = [
  'policy-details', 'policy-renew', 'new-policy', 'policies', 'documents',
  'invoices', 'payment-methods', 'payments-methods', 'password-update', 'mfa-settings', 'sessions',
  'admin-login', 'admin-dashboard', 'login', 'signup', 'dashboard',
  'account-settings', 'contact-us', 'help-center', 'user-notifications', 'admin-notifications',
  'complaints', 'admin-complaints', 'payment-callback'
];

PAGE_LIST.forEach((page) => {
  app.get(`/pages/${page}.html`, (_req, res) => {
    res.sendFile(path.join(ROOT_DIR, 'pages', `${page}.html`));
  });
});

app.use((_req, res) => {
  res.status(404).json({ ok: false, message: 'Not found' });
});

app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ ok: false, message: 'Internal server error' });
});

module.exports = app;
