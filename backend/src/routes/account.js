const express = require('express');
const bcrypt = require('bcryptjs');
const { requireAuth } = require('../middleware/auth');
const { sanitizeEmail, isValidEmail } = require('../utils/validation');

function createAccountRouter() {
  const router = express.Router();

  router.get('/stats', requireAuth, (req, res) => {
    const policies = req.db.policies.filter((p) => p.userId === req.user.id);
    res.json({
      ok: true,
      data: {
        totalPolicies: policies.length,
        activePolicies: policies.filter((p) => p.status === 'active').length,
        pendingRenewals: policies.filter((p) => p.status === 'pending_renewal').length,
        notifications: req.db.notifications.filter((n) => n.userId === req.user.id && !n.read).length
      }
    });
  });

  router.get('/account', requireAuth, (req, res) => {
    res.json({
      ok: true,
      data: { name: req.user.name, email: req.user.email, phone: req.user.phone, address: req.user.address, preferences: req.user.preferences || {} }
    });
  });

  router.post('/account', requireAuth, (req, res) => {
    const name = String(req.body.name || '').trim();
    const email = sanitizeEmail(req.body.email);
    const phone = String(req.body.phone || '').trim();
    const address = String(req.body.address || '').trim();

    if (!name || !email) return res.status(422).json({ ok: false, message: 'Name and email are required' });
    if (!isValidEmail(email)) return res.status(422).json({ ok: false, message: 'Invalid email address' });
    if (req.db.users.find((u) => u.email === email && u.id !== req.user.id)) {
      return res.status(409).json({ ok: false, message: 'Email already in use' });
    }

    req.user.name = name;
    req.user.email = email;
    req.user.phone = phone;
    req.user.address = address;
    res.json({ ok: true, message: 'Account settings updated' });
  });

  router.post('/preferences', requireAuth, (req, res) => {
    req.user.preferences = { renewals: !!req.body.renewals, claims: !!req.body.claims, announcements: !!req.body.announcements };
    res.json({ ok: true, message: 'Preferences updated' });
  });

  router.post('/account/password', requireAuth, async (req, res) => {
    const currentPassword = String(req.body.currentPassword || '');
    const newPassword = String(req.body.newPassword || '');

    if (!currentPassword || !newPassword) return res.status(422).json({ ok: false, message: 'Current and new password are required' });
    if (newPassword.length < 8) return res.status(422).json({ ok: false, message: 'New password must be at least 8 characters' });

    const match = await bcrypt.compare(currentPassword, req.user.passwordHash);
    if (!match) return res.status(400).json({ ok: false, message: "password doesn't match" });

    req.user.passwordHash = await bcrypt.hash(newPassword, 10);
    return res.json({ ok: true, message: 'password changed' });
  });

  return router;
}

module.exports = createAccountRouter;
