const express = require('express');
const session = require('express-session');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

const { loadEnv } = require('./config/env');

loadEnv();
const createAuthRouter = require('./routes/auth');
const createAdminRouter = require('./routes/admin');
const createPoliciesRouter = require('./routes/policies');
const createAccountRouter = require('./routes/account');
const createResourcesRouter = require('./routes/resources');

const app = express();
const SESSION_SECRET = process.env.SESSION_SECRET || 'zivumo-dev-secret';

app.disable('x-powered-by');

app.use(helmet({
  contentSecurityPolicy: false
}));

app.use(express.json({ limit: '150kb' }));
app.use(express.urlencoded({ extended: false }));

app.use(session({
  name: 'zivumo.sid',
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production'
  }
}));

const loginLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false
});

const ROOT_DIR = path.join(__dirname, '..', '..');

app.use('/assets', express.static(path.join(ROOT_DIR, 'assets')));
app.use('/pages', express.static(path.join(ROOT_DIR, 'pages')));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, status: 'ok' });
});

app.get('/', (_req, res) => {
  res.sendFile(path.join(ROOT_DIR, 'index.html'));
});

app.get('/index.html', (_req, res) => {
  res.sendFile(path.join(ROOT_DIR, 'index.html'));
});

app.get('/pages/policy-details.html', (_req, res) => {
  res.sendFile(path.join(ROOT_DIR, 'pages', 'policy-details.html'));
});

app.get('/pages/policy-renew.html', (_req, res) => {
  res.sendFile(path.join(ROOT_DIR, 'pages', 'policy-renew.html'));
});

app.get('/pages/new-policy.html', (_req, res) => {
  res.sendFile(path.join(ROOT_DIR, 'pages', 'new-policy.html'));
});

app.get('/pages/policies.html', (_req, res) => {
  res.sendFile(path.join(ROOT_DIR, 'pages', 'policies.html'));
});

app.get('/pages/documents.html', (_req, res) => {
  res.sendFile(path.join(ROOT_DIR, 'pages', 'documents.html'));
});

app.get('/pages/invoices.html', (_req, res) => {
  res.sendFile(path.join(ROOT_DIR, 'pages', 'invoices.html'));
});

app.get('/pages/payment-methods.html', (_req, res) => {
  res.sendFile(path.join(ROOT_DIR, 'pages', 'payment-methods.html'));
});

app.get('/pages/password-update.html', (_req, res) => {
  res.sendFile(path.join(ROOT_DIR, 'pages', 'password-update.html'));
});

app.get('/pages/mfa-settings.html', (_req, res) => {
  res.sendFile(path.join(ROOT_DIR, 'pages', 'mfa-settings.html'));
});

app.get('/pages/sessions.html', (_req, res) => {
  res.sendFile(path.join(ROOT_DIR, 'pages', 'sessions.html'));
});

app.use('/api', createAuthRouter({ loginLimiter }));
app.use('/api/admin', createAdminRouter({ loginLimiter }));
app.use('/api', createPoliciesRouter());
app.use('/api', createAccountRouter());
app.use('/api', createResourcesRouter());

module.exports = app;
