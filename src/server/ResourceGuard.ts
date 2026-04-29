import os from 'node:os';

export class ResourceGuard {
  getSystemStatus() {
    return {
      cpu: (os.loadavg()[0] / os.cpus().length) * 100,
      mem: (process.memoryUsage().heapUsed / process.memoryUsage().heapTotal) * 100,
    };
  }
}
export const resourceGuard = new ResourceGuard();
