import { Bonjour } from 'bonjour-service';

/**
 * GOLD SHE MESH — mDNS Service (ZeroConf)
 * Ensures Hub is discoverable by mobile nodes without manual IP entry.
 */

export class MDNSService {
  private static instance: MDNSService;
  private bonjour: Bonjour | null = null;

  private constructor() {}

  static getInstance(): MDNSService {
    if (!MDNSService.instance) {
      MDNSService.instance = new MDNSService();
    }
    return MDNSService.instance;
  }

  /**
   * Start broadcasting the Hub's presence on the local network.
   */
  start(hubName: string, port: number) {
    try {
      if (!this.bonjour) {
        this.bonjour = new Bonjour();
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
    } catch (err) {
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

export const getMDNSService = () => MDNSService.getInstance();
