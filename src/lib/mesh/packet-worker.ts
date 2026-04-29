import { parentPort, workerData } from 'node:worker_threads';
import { SecureCrypto } from './security-service.ts';
import protobuf from 'protobufjs';
import path from 'node:path';
import { WorkerTask, WorkerResult } from './worker-types';


/**
 * INDUSTRIAL PACKET WORKER (v2.0.0)
 * 
 * Offloads CPU-intensive decryption and Protobuf decoding to background threads.
 * Part of the Multi-Threaded Balancer architecture.
 */

let protoRoot: protobuf.Root | null = null;

async function initProto() {
  if (!protoRoot) {
    const protoPath = path.join(process.cwd(), 'src/lib/mesh/industrial_events.proto');
    protoRoot = await protobuf.load(protoPath);
  }
  return protoRoot;
}

parentPort?.on('message', async (task: WorkerTask) => {
  try {
    const { id, type, payload, secret } = task;
    let resultData: any = null;

    if (type === 'DECRYPT_JSON') {
      const encrypted = typeof payload === 'string' ? payload : (payload as Buffer).toString('utf8');
      // For backward compatibility, handle both colon-separated and base64
      let decrypted: string;
      if (encrypted.includes(':')) {
        // Old manual format handling if still needed, but SecureCrypto.decrypt handles Base64
        // We'll assume SecureCrypto.decrypt is updated to be the standard.
        decrypted = SecureCrypto.decrypt(encrypted, secret);
      } else {
        decrypted = SecureCrypto.decrypt(encrypted, secret);
      }
      resultData = JSON.parse(decrypted);

    } else if (type === 'DECRYPT_PROTO') {
      const root = await initProto();
      const IndustrialEvent = root.lookupType('goldshe.mesh.IndustrialEvent');
      
      const decryptedBuffer = SecureCrypto.decryptBinary(payload as Buffer, secret);
      const message = IndustrialEvent.decode(decryptedBuffer);
      resultData = IndustrialEvent.toObject(message, {
        enums: String,
        longs: Number,
        defaults: true,
        oneofs: true
      });
    }

    parentPort?.postMessage({
      id,
      success: true,
      data: resultData
    } as WorkerResult);

  } catch (err) {
    parentPort?.postMessage({
      id: task.id,
      success: false,
      error: (err as Error).message
    } as WorkerResult);
  }
});
