/**
 * NOXIS PULSE_ENGINE: HIGH-FREQUENCY TELEMETRY WORKER
 * Generates 100+ data points per second for industrial metrics.
 */

const METRICS = [
  'yarn_tension',
  'loom_speed',
  'power_draw',
  'vibration_index',
  'thermal_load'
];

let intervalId: any = null;

self.onmessage = (e) => {
  if (e.data === 'START') {
    if (intervalId) return;
    
    intervalId = setInterval(() => {
      const timestamp = Date.now();
      const payload = METRICS.map(metric => ({
        metric,
        value: generateMetricValue(metric),
        timestamp
      }));
      
      self.postMessage(payload);
    }, 10); // 100Hz frequency
  } else if (e.data === 'STOP') {
    clearInterval(intervalId);
    intervalId = null;
  }
};

function generateMetricValue(metric: string): number {
  const base = {
    yarn_tension: 45,
    loom_speed: 850,
    power_draw: 12.4,
    vibration_index: 0.2,
    thermal_load: 38
  }[metric] || 50;

  const volatility = {
    yarn_tension: 5,
    loom_speed: 20,
    power_draw: 0.5,
    vibration_index: 0.05,
    thermal_load: 0.2
  }[metric] || 1;

  // Simulate industrial noise
  return base + (Math.random() - 0.5) * volatility;
}
