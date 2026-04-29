import Database from 'better-sqlite3';
import path from 'node:path';

async function backup() {
  const db = new Database('hub.db');
  await db.backup(path.join('backups', `hub-${Date.now()}.db`));
  db.close();
}
backup();
