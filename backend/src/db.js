const fs = require('fs/promises');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'data', 'db.json');

async function readDb() {
  const raw = await fs.readFile(DB_PATH, 'utf-8');
  return JSON.parse(raw);
}

async function writeDb(data) {
  const tempPath = `${DB_PATH}.tmp`;
  await fs.writeFile(tempPath, JSON.stringify(data, null, 2), 'utf-8');
  await fs.rename(tempPath, DB_PATH);
}

function getNextId(items) {
  if (!items || items.length === 0) return 1;
  return Math.max(...items.map((item) => item.id || 0)) + 1;
}

module.exports = {
  readDb,
  writeDb,
  getNextId,
  DB_PATH
};
