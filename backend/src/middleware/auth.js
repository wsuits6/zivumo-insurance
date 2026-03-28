const { readDb } = require('../db');

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

module.exports = { requireAuth, requireAdmin };
