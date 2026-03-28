const express = require('express');
const { writeDb } = require('../db');
const { requireAuth } = require('../middleware/auth');
const { sanitizeEmail, isValidEmail } = require('../utils/validation');

function createAccountRouter() {
  const router = express.Router();

  router.get('/stats', requireAuth, (req, res) => {
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

  router.get('/account', requireAuth, (req, res) => {
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

  router.post('/account', requireAuth, async (req, res) => {
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

  router.post('/preferences', requireAuth, async (req, res) => {
    req.user.preferences = {
      renewals: !!req.body.renewals,
      claims: !!req.body.claims,
      announcements: !!req.body.announcements
    };
    await writeDb(req.db);
    res.json({ ok: true, message: 'Preferences updated' });
  });

  return router;
}

module.exports = createAccountRouter;
