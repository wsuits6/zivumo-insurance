const jwt = require('jsonwebtoken');
const { getDb } = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'aves-jwt-dev-secret';

function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

function extractToken(req) {
  const auth = req.headers.authorization;
  if (auth && auth.startsWith('Bearer ')) return auth.slice(7);
  return null;
}

function requireAuth(req, res, next) {
  const token = extractToken(req);
  if (!token) {
    return res.status(401).json({ ok: false, message: 'Unauthorized' });
  }
  try {
    const decoded = verifyToken(token);
    const db = getDb();
    const user = db.users.find((u) => u.id === decoded.userId);
    if (!user) {
      return res.status(401).json({ ok: false, message: 'Unauthorized' });
    }
    req.user = user;
    req.db = db;
    return next();
  } catch {
    return res.status(401).json({ ok: false, message: 'Invalid token' });
  }
}

function requireAdmin(req, res, next) {
  const token = extractToken(req);
  if (!token) {
    return res.status(401).json({ ok: false, message: 'Unauthorized' });
  }
  try {
    const decoded = verifyToken(token);
    if (decoded.role !== 'admin') {
      return res.status(401).json({ ok: false, message: 'Unauthorized' });
    }
    return next();
  } catch {
    return res.status(401).json({ ok: false, message: 'Invalid token' });
  }
}

module.exports = { requireAuth, requireAdmin, signToken, verifyToken };
