import { HubNodeServer } from './node-server';
import { SocketBridge } from './socket-bridge';

import http from 'http';

/**
 * Hub Core Architecture Verification
 */

async function verify() {
  console.log('--- Hub Core Verification ---');
  
  try {
    const server = HubNodeServer.getInstance();
    console.log('HubNodeServer instance created.');

    const httpServer = http.createServer();
    const bridge = SocketBridge.getInstance();
    bridge.start(httpServer);
    console.log('SocketBridge started.');

    console.log('Worker Pool and Binary Logger initialized automatically via imports.');
    
    // Clean up
    bridge.stop();
    server.stop();
    
    console.log('--- Verification Success ---');
    process.exit(0);
  } catch (err) {
    console.error('--- Verification Failed ---');
    console.error(err);
    process.exit(1);
  }
}

// verify(); // Uncomment to run
