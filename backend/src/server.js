const express = require('express');
const session = require('express-session');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const { readDb, writeDb, getNextId } = require('./db');

const ENV_PATH = path.join(__dirname, '..', '..', '.env');
if (fs.existsSync(ENV_PATH)) {
  const contents = fs.readFileSync(ENV_PATH, 'utf8');
  contents.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const [key, ...rest] = trimmed.split('=');
    if (!key) return;
    const value = rest.join('=').trim();
    if (!Object.prototype.hasOwnProperty.call(process.env, key)) {
      process.env[key] = value;
    }
  });
}

const app = express();
const PORT = process.env.PORT || 8000;
const SESSION_SECRET = process.env.SESSION_SECRET || 'zivumo-dev-secret';
const ADMIN_PASSWORD_SEED = process.env.ADMIN_PASSWORD_SEED || '';
const ADMIN_PASSWORD_HASH = ADMIN_PASSWORD_SEED ? bcrypt.hashSync(ADMIN_PASSWORD_SEED, 10) : null;

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

function sanitizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function pickUser(user) {
  if (!user) return null;
  const { passwordHash, ...safe } = user;
  return safe;
}

async function requireAuth(req, res, next) {
  const userId = req.session.userId;
  if (!userId) {
    return res.status(401).json({ ok: false, message: 'Unauthorized' });
  }
  const db = await readDb();
  const user = db.users.find((u) => u.id === userId);
  if (!user) {
    return res.status(401).json({ ok: false, message: 'Unauthorized' });
  }
  req.user = user;
  req.db = db;
  return next();
}

function requireAdmin(req, res, next) {
  if (!req.session.isAdmin) {
    return res.status(401).json({ ok: false, message: 'Unauthorized' });
  }
  return next();
}

async function ensureSeedUser() {
  const db = await readDb();
  const demo = db.users.find((u) => u.email === 'demo@zivumo.com');
  if (demo && !demo.passwordHash) {
    demo.passwordHash = await bcrypt.hash('Zivumo123!', 10);
    await writeDb(db);
  }
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, status: 'ok' });
});

app.get('/', (_req, res) => {
  res.sendFile(path.join(ROOT_DIR, 'index.html'));
});

app.get('/index.html', (_req, res) => {
  res.sendFile(path.join(ROOT_DIR, 'index.html'));
});

app.post('/api/signup', async (req, res) => {
  const name = String(req.body.name || '').trim();
  const email = sanitizeEmail(req.body.email);
  const password = String(req.body.password || '');

  if (!name || !email || !password) {
    return res.status(422).json({ ok: false, message: 'Name, email, and password are required' });
  }
  if (!isValidEmail(email)) {
    return res.status(422).json({ ok: false, message: 'Invalid email address' });
  }
  if (password.length < 8) {
    return res.status(422).json({ ok: false, message: 'Password must be at least 8 characters' });
  }

  const db = await readDb();
  const exists = db.users.find((u) => u.email === email);
  if (exists) {
    return res.status(409).json({ ok: false, message: 'Email already exists' });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const newUser = {
    id: getNextId(db.users),
    name,
    email,
    passwordHash,
    phone: '',
    address: '',
    preferences: {
      renewals: true,
      claims: true,
      announcements: false
    }
  };

  db.users.push(newUser);
  await writeDb(db);

  return res.status(201).json({ ok: true, message: 'Account created' });
});

app.post('/api/login', loginLimiter, async (req, res) => {
  const email = sanitizeEmail(req.body.email);
  const password = String(req.body.password || '');

  if (!email || !password) {
    return res.status(422).json({ ok: false, message: 'Email and password are required' });
  }

  const db = await readDb();
  const user = db.users.find((u) => u.email === email);
  if (!user) {
    return res.status(401).json({ ok: false, message: 'Invalid credentials' });
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    return res.status(401).json({ ok: false, message: 'Invalid credentials' });
  }

  req.session.userId = user.id;
  return res.json({ ok: true, data: pickUser(user) });
});

app.post('/api/admin/login', loginLimiter, async (req, res) => {
  const password = String(req.body.password || '');

  if (!ADMIN_PASSWORD_SEED || !ADMIN_PASSWORD_HASH) {
    return res.status(500).json({ ok: false, message: 'Admin password seed not configured' });
  }
  if (!password) {
    return res.status(422).json({ ok: false, message: 'Admin password is required' });
  }

  const ok = await bcrypt.compare(password, ADMIN_PASSWORD_HASH);
  if (!ok) {
    return res.status(401).json({ ok: false, message: 'Invalid credentials' });
  }

  req.session.isAdmin = true;
  return res.json({ ok: true, message: 'Admin authenticated' });
});

app.post('/api/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ ok: true, message: 'Logged out' });
  });
});

app.post('/api/admin/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ ok: true, message: 'Logged out' });
  });
});

app.get('/api/me', requireAuth, (req, res) => {
  res.json({ ok: true, data: pickUser(req.user) });
});

app.get('/api/admin/me', requireAdmin, (_req, res) => {
  res.json({ ok: true, data: { role: 'admin' } });
});

app.get('/api/stats', requireAuth, async (req, res) => {
  const policies = req.db.policies.filter((p) => p.userId === req.user.id);
  const total = policies.length;
  const active = policies.filter((p) => p.status === 'active').length;
  const pendingRenewals = policies.filter((p) => p.status === 'pending_renewal').length;
  const notifications = req.db.notifications.filter((n) => n.userId === req.user.id && !n.read).length;
  res.json({
    ok: true,
    data: {
      totalPolicies: total,
      activePolicies: active,
      pendingRenewals,
      notifications
    }
  });
});

app.get('/api/admin/summary', requireAdmin, async (_req, res) => {
  const db = await readDb();
  const totalUsers = db.users.length;
  const totalPolicies = db.policies.length;
  const activePolicies = db.policies.filter((p) => p.status === 'active').length;
  const totalPremium = db.policies.reduce((sum, policy) => sum + (Number(policy.premium) || 0), 0);

  res.json({
    ok: true,
    data: {
      totalUsers,
      totalPolicies,
      activePolicies,
      totalPremium: totalPremium.toFixed(2)
    }
  });
});

app.get('/api/admin/users', requireAdmin, async (_req, res) => {
  const db = await readDb();
  const users = db.users.map((user) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    address: user.address,
    policies: db.policies.filter((p) => p.userId === user.id).length
  }));
  res.json({ ok: true, data: users });
});

app.get('/api/admin/policies', requireAdmin, async (_req, res) => {
  const db = await readDb();
  const policies = db.policies.map((policy) => {
    const owner = db.users.find((u) => u.id === policy.userId);
    return {
      ...policy,
      userName: owner ? owner.name : 'Unknown',
      userEmail: owner ? owner.email : 'Unknown'
    };
  });
  res.json({ ok: true, data: policies });
});

app.post('/api/admin/policies/:id/status', requireAdmin, async (req, res) => {
  const policyId = Number(req.params.id);
  const status = String(req.body.status || '').trim();
  const allowed = new Set(['active', 'pending_renewal', 'cancelled']);

  if (!allowed.has(status)) {
    return res.status(422).json({ ok: false, message: 'Invalid status' });
  }

  const db = await readDb();
  const policy = db.policies.find((p) => p.id === policyId);
  if (!policy) {
    return res.status(404).json({ ok: false, message: 'Policy not found' });
  }

  policy.status = status;
  await writeDb(db);
  return res.json({ ok: true, data: policy, message: 'Policy status updated' });
});

app.get('/api/policies', requireAuth, async (req, res) => {
  const policies = req.db.policies.filter((p) => p.userId === req.user.id);
  const today = new Date();
  const enriched = policies.map((policy) => {
    const endDate = new Date(policy.endDate);
    const totalDays = Math.max(1, Math.ceil((endDate - new Date(policy.startDate)) / 86400000));
    const remaining = Math.max(0, Math.ceil((endDate - today) / 86400000));
    return {
      ...policy,
      remainingDays: remaining,
      progress: Math.min(100, Math.max(0, Math.round(((totalDays - remaining) / totalDays) * 100)))
    };
  });
  res.json({ ok: true, data: enriched });
});

app.get('/api/policies/:id', requireAuth, async (req, res) => {
  const policyId = Number(req.params.id);
  const policy = req.db.policies.find((p) => p.id === policyId && p.userId === req.user.id);
  if (!policy) {
    return res.status(404).json({ ok: false, message: 'Policy not found' });
  }
  res.json({ ok: true, data: policy });
});

app.post('/api/policies', requireAuth, async (req, res) => {
  const type = String(req.body.type || '').trim();
  const coverage = String(req.body.coverage || '').trim();
  const startDate = String(req.body.startDate || '').trim();
  const endDate = String(req.body.endDate || '').trim();
  const premium = Number(req.body.premium || 0);
  const currency = String(req.body.currency || 'USD').trim().toUpperCase();

  if (!type || !coverage || !startDate || !endDate || !premium) {
    return res.status(422).json({ ok: false, message: 'Type, coverage, dates, and premium are required' });
  }
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (Number.isNaN(start.valueOf()) || Number.isNaN(end.valueOf()) || end <= start) {
    return res.status(422).json({ ok: false, message: 'Invalid policy date range' });
  }

  const id = getNextId(req.db.policies);
  const year = start.getFullYear() || new Date().getFullYear();
  const policyNumber = `${type.replace(/\s+/g, '').slice(0, 4).toUpperCase()}-${year}-${id}`;

  const policy = {
    id,
    userId: req.user.id,
    type,
    policyNumber,
    status: 'active',
    coverage,
    startDate,
    endDate,
    premium,
    currency
  };

  req.db.policies.push(policy);
  await writeDb(req.db);

  res.status(201).json({ ok: true, data: policy, message: 'Policy created' });
});

app.post('/api/policies/:id/renew', requireAuth, async (req, res) => {
  const policyId = Number(req.params.id);
  const policy = req.db.policies.find((p) => p.id === policyId && p.userId === req.user.id);
  if (!policy) {
    return res.status(404).json({ ok: false, message: 'Policy not found' });
  }

  const currentEnd = new Date(policy.endDate);
  const nextEnd = new Date(currentEnd);
  nextEnd.setFullYear(currentEnd.getFullYear() + 1);
  policy.endDate = nextEnd.toISOString().slice(0, 10);
  policy.status = 'active';

  req.db.notifications.push({
    id: getNextId(req.db.notifications),
    userId: req.user.id,
    type: 'renewal',
    message: `${policy.type} policy ${policy.policyNumber} renewed through ${policy.endDate}.`,
    date: new Date().toISOString().slice(0, 10),
    read: false
  });

  await writeDb(req.db);
  res.json({ ok: true, data: policy, message: 'Policy renewed' });
});

app.get('/api/notifications', requireAuth, (req, res) => {
  const items = req.db.notifications.filter((n) => n.userId === req.user.id);
  res.json({ ok: true, data: items });
});

app.get('/api/account', requireAuth, (req, res) => {
  res.json({
    ok: true,
    data: {
      name: req.user.name,
      email: req.user.email,
      phone: req.user.phone,
      address: req.user.address,
      preferences: req.user.preferences || {}
    }
  });
});

app.post('/api/account', requireAuth, async (req, res) => {
  const name = String(req.body.name || '').trim();
  const email = sanitizeEmail(req.body.email);
  const phone = String(req.body.phone || '').trim();
  const address = String(req.body.address || '').trim();

  if (!name || !email) {
    return res.status(422).json({ ok: false, message: 'Name and email are required' });
  }
  if (!isValidEmail(email)) {
    return res.status(422).json({ ok: false, message: 'Invalid email address' });
  }

  const emailExists = req.db.users.find((u) => u.email === email && u.id !== req.user.id);
  if (emailExists) {
    return res.status(409).json({ ok: false, message: 'Email already in use' });
  }

  req.user.name = name;
  req.user.email = email;
  req.user.phone = phone;
  req.user.address = address;

  await writeDb(req.db);

  res.json({ ok: true, message: 'Account settings updated' });
});

app.post('/api/preferences', requireAuth, async (req, res) => {
  req.user.preferences = {
    renewals: !!req.body.renewals,
    claims: !!req.body.claims,
    announcements: !!req.body.announcements
  };
  await writeDb(req.db);
  res.json({ ok: true, message: 'Preferences updated' });
});

app.get('/api/documents', requireAuth, (req, res) => {
  const docs = req.db.documents.filter((d) => d.userId === req.user.id);
  res.json({ ok: true, data: docs });
});

app.get('/api/invoices', requireAuth, (req, res) => {
  const invoices = req.db.invoices.filter((i) => i.userId === req.user.id);
  res.json({ ok: true, data: invoices });
});

app.get('/api/payment-methods', requireAuth, (req, res) => {
  const methods = req.db.paymentMethods.filter((m) => m.userId === req.user.id);
  res.json({ ok: true, data: methods });
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

ensureSeedUser()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Zivumo server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to start server', err);
    process.exit(1);
  });
