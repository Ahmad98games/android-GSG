import onvif from 'node-onvif';
import pino from 'pino';

const logger = pino({ level: 'info' });

export interface CameraDiscoveryResult {
  model: string;
  ip: string;
  rtspUrl: string;
}

export class DiscoveryService {
  /**
   * Scan the LAN for ONVIF-compliant cameras and return their RTSP paths.
   */
  public static async discoverCameras(): Promise<CameraDiscoveryResult[]> {
    logger.info('[DiscoveryService] Starting LAN scan for industrial cameras...');
    
    try {
      const devices = await onvif.startProbe();
      const results: CameraDiscoveryResult[] = [];

      for (const device of devices) {
        const cam = new onvif.OnvifDevice({
          xaddr: device.xaddrs[0],
          user: 'admin', // Default industrial credentials
          pass: 'admin'
        });

        try {
          await cam.init();
          const info = cam.getInformation();
          const streamUrl = cam.getUdpStreamUrl();

          results.push({
            model: info.model || 'Unknown',
            ip: device.address,
            rtspUrl: streamUrl
          });

          logger.info({ model: info.model, ip: device.address }, '[DiscoveryService] Camera detected.');
        } catch {
          logger.warn({ ip: device.address }, '[DiscoveryService] Failed to initialize camera. Might require custom credentials.');
        }

      }

      return results;
    } catch (err) {
      logger.error({ error: (err as Error).message }, '[DiscoveryService] Discovery probe failed.');
      return [];
    }
  }
}
