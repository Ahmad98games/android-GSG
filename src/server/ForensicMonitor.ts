import { forensicEvents } from '../db/schema';
import { v4 as uuidv4 } from 'uuid';
import { IndustryProfileService } from '../services/IndustryProfileService';
import pino from 'pino';
import { db as dbInstance } from '../db/index';


const logger = pino({ level: 'info' });

export class ForensicMonitor {
  private messageCounts = new Map<string, { count: number; start: number }>();
  private rttViolations = new Map<string, number>();

  constructor(private db: typeof dbInstance) {}


  async evaluate(nodeId: string, packet: Record<string, unknown>, rtt?: number) {

    // 1. Midnight activity check
    const hour = new Date().getHours();
    if (hour >= 0 && hour < 4) {
      await this.logForensic(nodeId, 'MIDNIGHT_ACTIVITY', 'low', 'Activity detected during off-hours.');
    }

    // 2. MESSAGE_FLOOD check
    if (packet.type === 'MESSAGE') {
      const now = Date.now();
      let stats = this.messageCounts.get(nodeId) || { count: 0, start: now };
      if (now - stats.start > 60000) {
        stats = { count: 1, start: now };
      } else {
        stats.count++;
      }
      this.messageCounts.set(nodeId, stats);

      if (stats.count > 50) {
        await this.logForensic(nodeId, 'MESSAGE_FLOOD', 'warn', `Node sent ${stats.count} messages in 60s.`);
      }
    }

    // 3. PROFILE_MISMATCH check
    if (packet.type === 'SCAN') {
      const manifest = IndustryProfileService.getUIManifest();
      const regex = new RegExp(manifest.barcodeRegex);
      if (!regex.test(packet.barcode as string)) {
        await this.logForensic(nodeId, 'PROFILE_MISMATCH', 'low', `Barcode ${packet.barcode as string} does not match profile regex ${manifest.barcodeRegex}`);
      }

    }

    // 4. LONG_RANGE_DEGRADATION check
    if (rtt !== undefined && rtt > 800) {
      const violations = (this.rttViolations.get(nodeId) || 0) + 1;
      this.rttViolations.set(nodeId, violations);
      if (violations >= 3) {
        await this.logForensic(nodeId, 'LONG_RANGE_DEGRADATION', 'warn', `RTT > 800ms for ${violations} consecutive heartbeats.`);
      }
    } else {
      this.rttViolations.set(nodeId, 0);
    }
  }

  private async logForensic(nodeId: string, type: string, severity: 'low' | 'warn' | 'critical', description: string) {
    logger.warn({ nodeId, type, severity }, description);
    await this.db.insert(forensicEvents).values({
      id: uuidv4(),
      nodeId,
      type,
      severity,
      description,
      timestamp: Date.now()
    });


  }
}

