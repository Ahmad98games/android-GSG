import { getHubServer } from '../src/lib/mesh/node-server';

async function boot() {
  const hub = getHubServer();
  await hub.start();
  console.log('[Boot] Hub is running.');
}

boot().catch(console.error);
