const express = require('express');
const bcrypt = require('bcryptjs');
const { getDb, getNextId } = require('../db');
const { sanitizeEmail, isValidEmail } = require('../utils/validation');
const { pickUser } = require('../utils/user');
const { requireAuth, signToken } = require('../middleware/auth');

function createAuthRouter() {
  const router = express.Router();

  router.post('/signup', async (req, res) => {
    try {
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

      const db = getDb();
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
        preferences: { renewals: true, claims: true, announcements: false }
      };

      db.users.push(newUser);

      return res.status(201).json({ ok: true, message: 'Account created' });
    } catch (err) {
      console.error('Signup error:', err);
      return res.status(500).json({ ok: false, message: 'Server error. Please try again later.' });
    }
  });

  router.post('/login', async (req, res) => {
    const email = sanitizeEmail(req.body.email);
    const password = String(req.body.password || '');

    if (!email || !password) {
      return res.status(422).json({ ok: false, message: 'Email and password are required' });
    }

    const db = getDb();
    const user = db.users.find((u) => u.email === email);
    if (!user) {
      return res.status(401).json({ ok: false, message: 'Invalid credentials' });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return res.status(401).json({ ok: false, message: 'Invalid credentials' });
    }

    const token = signToken({ userId: user.id, role: 'user' });
    return res.json({ ok: true, data: pickUser(user), token });
  });

  router.post('/logout', (_req, res) => {
    return res.json({ ok: true, message: 'Logged out' });
  });

  router.get('/me', requireAuth, (req, res) => {
    res.json({ ok: true, data: pickUser(req.user) });
  });

  return router;
}

module.exports = createAuthRouter;
