"use strict";
/**
 * Gold She — Custom Next.js Server
 *
 * V2.0: Decoupled TCP Mesh Hub
 * Boots Next.js (HTTP/3000) + Gold She Mesh Hub (TCP/7447).
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const next_1 = __importDefault(require("next"));
const node_http_1 = require("node:http");
const node_server_1 = require("./src/lib/mesh/node-server");
const socket_bridge_1 = require("./src/lib/mesh/socket-bridge");
const mdns_service_1 = require("./src/lib/mesh/mdns-service");
const vision_manager_1 = require("./src/lib/mesh/vision-manager");
const audit_logger_1 = require("./src/lib/mesh/audit-logger");
const mesh_protocol_1 = require("./src/lib/Shared/mesh-protocol");
const backup_scheduler_1 = require("./src/lib/mesh/backup-scheduler");
const worker_pool_1 = require("./src/lib/mesh/worker-pool");
const config_manager_1 = require("./src/lib/mesh/config-manager");
const PORT = parseInt(process.env.PORT ?? '3000', 10);
const isDev = process.env.NODE_ENV !== 'production';
async function main() {
    const config = config_manager_1.configManager.getConfig();
    console.info(`\n[Bootstrap] OMNORA NOXIS v9.0 — Mode: ${config.tier}`);
    const app = (0, next_1.default)({ dev: isDev, dir: __dirname });
    const handle = app.getRequestHandler();
    console.info('[Bootstrap] Preparing Next.js Layer...');
    await app.prepare();
    const httpServer = (0, node_http_1.createServer)((req, res) => {
        handle(req, res);
    });
    // Boot the Pillar 1 TCP Mesh Hub
    const hub = (0, node_server_1.getHubServer)();
    await hub.start();
    // Boot the Secure Socket.io Bridge
    const bridge = (0, socket_bridge_1.getSocketBridge)();
    bridge.start(httpServer);
    // Broadcast Hub presence via mDNS
    const mdns = (0, mdns_service_1.getMDNSService)();
    mdns.start('Gold She Hub', mesh_protocol_1.HUB_PORT);
    // Boot the Industrial Vision Engine (Tier-Gated)
    const vision = (0, vision_manager_1.getVisionManager)();
    await vision.start();
    // Start Environmental Audit Logging
    audit_logger_1.EnvironmentalAudit.start();
    // Next.js HMR upgrade handler
    const nextUpgradeHandler = app.getUpgradeHandler();
    httpServer.on('upgrade', (req, socket, head) => {
        nextUpgradeHandler(req, socket, head);
    });
    // Start automated SQLite backup scheduler
    (0, backup_scheduler_1.startBackupScheduler)(hub.store.getDb());
    httpServer.listen(PORT, '0.0.0.0', () => {
        console.info(`\n  ╔══════════════════════════════════════════════╗`);
        console.info(`  ║   Omnora Noxis v9.0 — Pillar 1 Active        ║`);
        console.info(`  ║   Tier      → ${config.tier}                          ║`);
        console.info(`  ║   Web UI    → http://localhost:${PORT}          ║`);
        console.info(`  ╚══════════════════════════════════════════════╝\n`);
    });
    /** V9.0: Hardened Graceful Shutdown (Zombie Prevention) */
    for (const signal of ['SIGINT', 'SIGTERM']) {
        process.on(signal, () => {
            console.info(`\n[Bootstrap] ${signal} received — incinerating resources...`);
            (0, backup_scheduler_1.stopBackupScheduler)();
            (0, mdns_service_1.getMDNSService)().stop();
            (0, socket_bridge_1.getSocketBridge)().stop();
            (0, vision_manager_1.getVisionManager)().stop();
            audit_logger_1.EnvironmentalAudit.stop();
            worker_pool_1.hubWorkerPool.terminate();
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
