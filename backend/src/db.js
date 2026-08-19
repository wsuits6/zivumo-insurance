const fs = require('fs');
const path = require('path');

const SEED_PATH = path.join(__dirname, '..', 'data', 'db.json');

let _db = null;

function getDb() {
  if (!_db) {
    try {
      const raw = fs.readFileSync(SEED_PATH, 'utf-8');
      _db = JSON.parse(raw);
    } catch {
      _db = { users: [], policies: [], notifications: [], documents: [], invoices: [], paymentMethods: [] };
    }
  }
  return _db;
}

function getNextId(items) {
  if (!items || items.length === 0) return 1;
  return Math.max(...items.map((item) => item.id || 0)) + 1;
}

module.exports = {
  getDb,
  getNextId
};
