"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMDNSService = exports.MDNSService = void 0;
const bonjour_service_1 = require("bonjour-service");
/**
 * GOLD SHE MESH — mDNS Service (ZeroConf)
 * Ensures Hub is discoverable by mobile nodes without manual IP entry.
 */
class MDNSService {
    static instance;
    bonjour = null;
    constructor() { }
    static getInstance() {
        if (!MDNSService.instance) {
            MDNSService.instance = new MDNSService();
        }
        return MDNSService.instance;
    }
    /**
     * Start broadcasting the Hub's presence on the local network.
     */
    start(hubName, port) {
        try {
            if (!this.bonjour) {
                this.bonjour = new bonjour_service_1.Bonjour();
            }
            console.info(`[mDNS] Broadcasting Hub: "${hubName}" via _goldshehub._tcp on port ${port}`);
            this.bonjour.publish({
                name: hubName,
                type: 'goldshehub',
                protocol: 'tcp',
                port: port,
                txt: {
                    version: '2.0.0',
                    secure: 'true'
                }
            });
        }
        catch (err) {
            console.error('[mDNS] Failed to start broadcast:', err);
        }
    }
    /**
     * Stop broadcasting.
     */
    stop() {
        if (this.bonjour) {
            console.info('[mDNS] Stopping broadcast...');
            this.bonjour.unpublishAll(() => {
                this.bonjour?.destroy();
                this.bonjour = null;
            });
        }
    }
}
exports.MDNSService = MDNSService;
const getMDNSService = () => MDNSService.getInstance();
exports.getMDNSService = getMDNSService;
