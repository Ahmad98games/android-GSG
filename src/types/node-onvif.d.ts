declare module 'node-onvif' {
  export interface OnvifDeviceConfig {
    xaddr: string;
    user: string;
    pass: string;
  }

  export class OnvifDevice {
    constructor(config: OnvifDeviceConfig);
    init(): Promise<void>;
    getInformation(): { model: string };
    getUdpStreamUrl(): string;
  }

  export interface ProbeDevice {
    xaddrs: string[];
    address: string;
  }

  export function startProbe(): Promise<ProbeDevice[]>;

  const onvif: {
    OnvifDevice: typeof OnvifDevice;
    startProbe: typeof startProbe;
  };

  export default onvif;
}
