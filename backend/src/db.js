const fs = require('fs');
const path = require('path');

const SEED_PATH = path.join(__dirname, '..', 'data', 'db.json');

let _db = null;
let _lastSnapshot = null;

function getDb() {
  if (!_db) {
    try {
      const raw = fs.readFileSync(SEED_PATH, 'utf-8');
      _db = JSON.parse(raw);
    } catch {
      _db = { users: [], policies: [], notifications: [], documents: [], invoices: [], paymentMethods: [], payments: [], complaints: [] };
    }
    _lastSnapshot = JSON.stringify(_db);
  }
  return _db;
}

function getNextId(items) {
  if (!items || items.length === 0) return 1;
  return Math.max(...items.map((item) => item.id || 0)) + 1;
}

function saveDb() {
  if (!_db) return false;
  const snapshot = JSON.stringify(_db, null, 2);
  if (snapshot === _lastSnapshot) return false;
  try {
    fs.mkdirSync(path.dirname(SEED_PATH), { recursive: true });
    fs.writeFileSync(SEED_PATH, snapshot, 'utf-8');
    _lastSnapshot = snapshot;
    return true;
  } catch (err) {
    console.error('Failed to persist database:', err);
    return false;
  }
}

module.exports = {
  getDb,
  saveDb,
  getNextId
};
