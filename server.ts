/**
 * Gold She — Custom Next.js Server
 * 
 * V2.0: Decoupled TCP Mesh Hub
 * Boots Next.js (HTTP/3000) + Gold She Mesh Hub (TCP/7447).
 */

import 'dotenv/config';
import next from 'next';
import { createServer } from 'node:http';
import { getHubServer } from './src/lib/mesh/node-server';
import { getSocketBridge } from './src/lib/mesh/socket-bridge';
import { getMDNSService } from './src/lib/mesh/mdns-service';
import { getVisionManager } from './src/lib/mesh/vision-manager';
import { EnvironmentalAudit } from './src/lib/mesh/audit-logger';
import { HUB_PORT } from './src/lib/Shared/mesh-protocol';
import { startBackupScheduler, stopBackupScheduler } from './src/lib/mesh/backup-scheduler';
import { hubWorkerPool } from './src/lib/mesh/worker-pool';

import { configManager } from './src/lib/mesh/config-manager';

const PORT = parseInt(process.env.PORT ?? '3000', 10);
const isDev = process.env.NODE_ENV !== 'production';

async function main(): Promise<void> {
  const config = configManager.getConfig();
  console.info(`\n[Bootstrap] OMNORA NOXIS v9.0 — Mode: ${config.tier}`);
  
  const app = next({ dev: isDev, dir: __dirname });
  const handle = app.getRequestHandler();

  console.info('[Bootstrap] Preparing Next.js Layer...');
  await app.prepare();

  const httpServer = createServer((req, res) => {
    handle(req, res);
  });

  // Boot the Pillar 1 TCP Mesh Hub
  const hub = getHubServer();
  await hub.start();

  // Boot the Secure Socket.io Bridge
  const bridge = getSocketBridge();
  bridge.start(httpServer);

  // Broadcast Hub presence via mDNS
  const mdns = getMDNSService();
  mdns.start('Gold She Hub', HUB_PORT);

  // Boot the Industrial Vision Engine (Tier-Gated)
  const vision = getVisionManager();
  await vision.start();

  // Start Environmental Audit Logging
  EnvironmentalAudit.start();

  // Next.js HMR upgrade handler
  const nextUpgradeHandler = app.getUpgradeHandler();
  httpServer.on('upgrade', (req, socket, head) => {
    nextUpgradeHandler(req, socket, head);
  });

  // Start automated SQLite backup scheduler
  startBackupScheduler(hub.store.getDb());

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.info(`\n  ╔══════════════════════════════════════════════╗`);
    console.info(`  ║   Omnora Noxis v9.0 — Pillar 1 Active        ║`);
    console.info(`  ║   Tier      → ${config.tier}                          ║`);
    console.info(`  ║   Web UI    → http://localhost:${PORT}          ║`);
    console.info(`  ╚══════════════════════════════════════════════╝\n`);
  });

  /** V9.0: Hardened Graceful Shutdown (Zombie Prevention) */
  for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.on(signal, () => {
      console.info(`\n[Bootstrap] ${signal} received — incinerating resources...`);
      stopBackupScheduler();
      getMDNSService().stop();
      getSocketBridge().stop();
      getVisionManager().stop();
      EnvironmentalAudit.stop();
      hubWorkerPool.terminate();
      hub.stop();
      httpServer.close(() => {
        console.info('[Bootstrap] System incineration complete. Terminating process.');
        process.exit(0);
      });
    });
  }
}

main().catch((err) => {
  console.error('[Bootstrap] Fatal startup fault:', err);
  process.exit(1);
});