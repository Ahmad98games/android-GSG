import { parentPort } from 'node:worker_threads';
import { SecureCrypto } from '../lib/SecureCrypto';
import protobuf from 'protobufjs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { fileURLToPath } from 'node:url';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);



// Initialize DB connection in each worker
const db = new Database('dev.db'); 

const root = protobuf.loadSync(path.join(__dirname, '../../proto/shared.proto'));
const IndustrialEvent = root.lookupType("goldshe.mesh.IndustrialEvent");

parentPort.on('message', (task) => {
  try {
    if (task.type === 'DB_WRITE') {
      handleDbWrite(task.data, task.nodeId);
      parentPort.postMessage({ id: task.id, status: 'written' });
      return;
    }

    const decrypted = SecureCrypto.decrypt(task.payload, task.key);
    const message = IndustrialEvent.decode(decrypted);
    parentPort.postMessage({ id: task.id, data: IndustrialEvent.toObject(message) });
  } catch (err) {
    parentPort.postMessage({ id: task.id, error: err.message });
  }
});

function handleDbWrite(event, nodeId) {
  if (event.type === 'SCAN') {
    const stmt = db.prepare('INSERT INTO scan_events (id, node_id, worker_id, barcode, location_id, timestamp) VALUES (?, ?, ?, ?, ?, ?)');
    stmt.run(event.id, nodeId, event.scan.worker_id, event.scan.barcode, event.scan.location_id, event.timestamp);
  } else if (event.type === 'KHATA') {
    const stmt = db.prepare('INSERT INTO khata_entries (id, debit_account, credit_account, amount, node_id, worker_id, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)');
    stmt.run(event.id, 'N/A', 'N/A', event.khata.amount_pkr, nodeId, event.khata.worker_id, event.timestamp);
  }
  // Add other event types as needed
}

