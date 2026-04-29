import net from 'node:net';

const HUB_PORT = 7447;

async function testZombieAnnihilation() {
  console.log('[Test] Connecting zombie socket...');
  const socket = net.connect(HUB_PORT, '127.0.0.1');
  
  const start = Date.now();
  socket.on('close', () => {
    const duration = Date.now() - start;
    console.log(`[Test] Zombie socket closed after ${duration}ms`);
    if (duration >= 3000 && duration < 4000) {
      console.log('[Test] SUCCESS: Zombie annihilated within 3-4s window.');
    } else {
      console.log('[Test] FAILURE: Timing mismatch.');
    }
  });

  socket.on('error', (err) => {
    console.log('[Test] Socket error (expected if destroyed):', err.message);
  });
}

// Start the test after 2s (assuming server is booting)
setTimeout(testZombieAnnihilation, 2000);
