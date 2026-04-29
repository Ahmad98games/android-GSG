import { NextResponse } from 'next/server';
import { getHubServer } from '@/lib/mesh/node-server';
import { getSocketBridge } from '@/lib/mesh/socket-bridge';
import { healthRegistry } from '@/lib/mesh/sse-registry';
import os from 'node:os';

/**
 * SYSTEM DIAGNOSTIC API (v1.0.0)
 * 
 * Performs high-fidelity pre-flight checks on all core industrial modules.
 */

export async function GET() {
  try {
    const hub = getHubServer();
    const bridge = getSocketBridge();
    
    // 1. Database Check (Attempt to count devices)
    let dbStatus = 'OFFLINE';
    try {
      const count = hub.store.getMessageCount();
      dbStatus = count >= 0 ? 'ONLINE' : 'ERROR';
    } catch (err) {
      console.error('[Diagnostic] DB Check Failed:', err);
    }

    // 2. Socket Bridge Check
    const bridgeStatus = bridge.isReady() ? 'ONLINE' : 'OFFLINE';

    // 3. AI Engine Check
    const aiStatus = healthRegistry.healthStatus.pythonEngine === 'ONLINE' ? 'ONLINE' : 'OFFLINE';

    // 4. Resource Check
    const cpus = os.cpus();
    const load = os.loadavg();
    const cpuHealth = (load[0] / cpus.length) < 0.9 ? 'HEALTHY' : 'STRESSED';

    return NextResponse.json({
      status: 'OK',
      timestamp: Date.now(),
      modules: {
        database: { status: dbStatus, label: 'Sovereign Persistence Store' },
        bridge: { status: bridgeStatus, label: 'Secure WebSocket Bridge' },
        vision: { status: aiStatus, label: 'Neural Inference Engine' },
        hardware: { status: cpuHealth, label: 'Host PC Infrastructure' }
      },
      ready: dbStatus === 'ONLINE' && bridgeStatus === 'ONLINE' && aiStatus === 'ONLINE'
    });
  } catch (err) {
    return NextResponse.json({ 
      status: 'FATAL', 
      error: (err as Error).message,
      ready: false 
    }, { status: 500 });
  }
}
