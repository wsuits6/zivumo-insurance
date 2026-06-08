const express = require('express');
const bcrypt = require('bcryptjs');
const { readDb, writeDb } = require('../db');
const { requireAdmin } = require('../middleware/auth');

const ADMIN_PASSWORD_SEED = process.env.ADMIN_PASSWORD_SEED || '';
const ADMIN_PASSWORD_HASH = ADMIN_PASSWORD_SEED ? bcrypt.hashSync(ADMIN_PASSWORD_SEED, 10) : null;

function createAdminRouter({ loginLimiter }) {
  const router = express.Router();

  router.post('/login', loginLimiter, async (req, res) => {
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

  router.post('/logout', (req, res) => {
    req.session.destroy(() => {
      res.json({ ok: true, message: 'Logged out' });
    });
  });

  router.get('/me', requireAdmin, (_req, res) => {
    res.json({ ok: true, data: { role: 'admin' } });
  });

  router.get('/summary', requireAdmin, async (_req, res) => {
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

  router.get('/users', requireAdmin, async (_req, res) => {
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

  router.get('/policies', requireAdmin, async (_req, res) => {
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

  router.post('/policies/:id/status', requireAdmin, async (req, res) => {
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

  router.post('/users', requireAdmin, async (req, res) => {
    const name = String(req.body.name || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || 'ChangeMe123!'); // Default password

    if (!name || !email) {
      return res.status(422).json({ ok: false, message: 'Name and email are required' });
    }

    const db = await readDb();
    if (db.users.find((u) => u.email === email)) {
      return res.status(409).json({ ok: false, message: 'User already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const newUser = {
      id: getNextId(db.users),
      name,
      email,
      passwordHash,
      phone: '',
      address: '',
      preferences: { renewals: true, claims: true, announcements: false }
    };

    db.users.push(newUser);
    await writeDb(db);
    return res.status(201).json({ ok: true, data: { id: newUser.id, name, email }, message: 'User created successfully' });
  });

  router.post('/assign-policy', requireAdmin, async (req, res) => {
    const { userId, type, coverage, startDate, endDate, premium } = req.body;

    if (!userId || !type || !coverage || !startDate || !endDate || !premium) {
      return res.status(422).json({ ok: false, message: 'Missing required policy fields' });
    }

    const db = await readDb();
    const user = db.users.find((u) => u.id === Number(userId));
    if (!user) {
      return res.status(404).json({ ok: false, message: 'User not found' });
    }

    const id = getNextId(db.policies);
    const year = new Date(startDate).getFullYear();
    const policyNumber = `${type.replace(/\s+/g, '').slice(0, 4).toUpperCase()}-${year}-${id}`;

    const policy = {
      id,
      userId: Number(userId),
      type,
      policyNumber,
      status: 'active',
      coverage,
      startDate,
      endDate,
      premium: Number(premium),
      currency: 'GHS'
    };

    db.policies.push(policy);
    await writeDb(db);
    return res.status(201).json({ ok: true, data: policy, message: 'Policy assigned successfully' });
  });

  return router;
}

module.exports = createAdminRouter;
