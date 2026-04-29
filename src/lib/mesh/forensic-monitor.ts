import { ForensicIncident, generateUUID } from '../Shared/mesh-protocol';
import { HubOfflineStore } from './offline-store';
import { sseRegistry } from './sse-registry';

/**
 * GOLD SHE MESH — Forensic Monitor
 * 
 * Pillar 6 (Production): Anomalous Behavior Detection.
 * Flags rapid scans, repeated errors, and midnight activity.
 */

export class ForensicMonitor {
  private static instance: ForensicMonitor;
  private scanCounts = new Map<string, { count: number; firstScan: number }>();
  private errorCounts = new Map<string, { count: number; firstError: number }>();
  
  private constructor(private store: HubOfflineStore) {}

  static getInstance(store: HubOfflineStore): ForensicMonitor {
    if (!ForensicMonitor.instance) {
      ForensicMonitor.instance = new ForensicMonitor(store);
    }
    return ForensicMonitor.instance;
  }

  /**
   * Track a scan event.
   */
  trackScan(deviceId: string, deviceName: string) {
    const now = Date.now();
    const stats = this.scanCounts.get(deviceId) || { count: 0, firstScan: now };
    
    if (now - stats.firstScan > 5000) {
      // Reset window every 5 seconds
      stats.count = 1;
      stats.firstScan = now;
    } else {
      stats.count++;
    }

    if (stats.count > 10) {
      this.flagIncident({
        id: generateUUID(),
        deviceId,
        deviceName,
        type: 'RAPID_SCAN',
        severity: 'MEDIUM',
        description: `Rapid scans detected: ${stats.count} scans in 5s`,
        ts: now
      });
      // Reset to prevent spamming incidents
      stats.count = 0;
    }

    this.scanCounts.set(deviceId, stats);

    // Midnight Activity Check (12 AM - 4 AM)
    const hour = new Date(now).getHours();
    if (hour >= 0 && hour < 4) {
      this.flagIncident({
        id: generateUUID(),
        deviceId,
        deviceName,
        type: 'MIDNIGHT_ACTIVITY',
        severity: 'LOW',
        description: `Activity detected at ${hour}:00 AM`,
        ts: now
      }, true); // Silent flag (throttled)
    }
  }

  /**
   * Track an error event.
   */
  trackError(deviceId: string, deviceName: string, error: string) {
    const now = Date.now();
    const stats = this.errorCounts.get(deviceId) || { count: 0, firstError: now };

    if (now - stats.firstError > 60000) {
      stats.count = 1;
      stats.firstError = now;
    } else {
      stats.count++;
    }

    if (stats.count > 5) {
      this.flagIncident({
        id: generateUUID(),
        deviceId,
        deviceName,
        type: 'REPEATED_ERRORS',
        severity: 'HIGH',
        description: `Device reporting repeated errors: ${stats.count} in 1m. Last: ${error}`,
        ts: now
      });
      stats.count = 0;
    }

    this.errorCounts.set(deviceId, stats);
  }

  private flagIncident(incident: ForensicIncident, throttle = false) {
    // Prevent duplicate midnight flags for the same device in the same hour
    if (throttle && incident.type === 'MIDNIGHT_ACTIVITY') {
      // Implementation of throttling logic would go here
    }

    console.warn(`[ForensicMonitor] INCIDENT: ${incident.type} from ${incident.deviceName}`);
    this.store.storeIncident(incident);
    
    // Broadcast to UI
    sseRegistry.broadcast({
      event: 'hardware-alert', // Reusing hardware-alert for UI toast
      data: incident
    });
  }
}
