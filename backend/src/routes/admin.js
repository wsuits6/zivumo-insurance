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

  return router;
}

module.exports = createAdminRouter;
