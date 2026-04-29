'use client';

import React from 'react';
import { Wifi, WifiOff, Radio, Zap, Smartphone, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useMeshStream, type DeviceStatus } from '@/lib/hooks/useMeshStream';

/**
 * DEVICE TELEMETRY PANEL (v9.5.1)
 *
 * Real-time device status grid connected to the Hub's SSE stream.
 * Each device indicator pulses green when online, dims to red/gray when offline.
 * Shows a live connection status badge in the header.
 */

// Predefined node slots — the factory uses N01..N04 by default.
// Actual device names from the mesh are mapped dynamically via deviceId.
const DEFAULT_NODES = [
  { slot: 1, label: 'N01' },
  { slot: 2, label: 'N02' },
  { slot: 3, label: 'N03' },
  { slot: 4, label: 'N04' },
];

function getStatusColor(status: DeviceStatus): string {
  switch (status) {
    case 'online':
      return 'bg-[#34D399] shadow-[0_0_8px_rgba(52,211,153,0.5)]';
    case 'offline':
      return 'bg-[#F87171] shadow-[0_0_6px_rgba(248,113,113,0.3)]';
    default:
      return 'bg-[#2D3441]';
  }
}

function getStatusGlow(status: DeviceStatus): string {
  switch (status) {
    case 'online':
      return 'border-[#34D399]/20 hover:border-[#34D399]/40';
    case 'offline':
      return 'border-[#F87171]/20 hover:border-[#F87171]/40';
    default:
      return 'border-[#2D3441] hover:border-[#60A5FA]/30';
  }
}

export default function DeviceTelemetry() {
  const { deviceStatuses, isConnected, reconnectAttempts } = useMeshStream();
  const [commanding, setCommanding] = useState<string | null>(null);

  const handleCommand = async (deviceId: string, command: string) => {
    setCommanding(`${deviceId}-${command}`);
    try {
      await fetch('/api/ecosystem/mesh/send', {
        method: 'POST',
        body: JSON.stringify({
          to: deviceId,
          text: `SYSTEM_COMMAND:${command}`,
          type: 'SYSTEM_COMMAND'
        })
      });
    } catch (err) {
      console.error('Failed to send system command:', err);
    } finally {
      setTimeout(() => setCommanding(null), 1000);
    }
  };

  // Map device events to the fixed slot grid
  // If we have real device data, overlay it; otherwise show defaults
  const deviceIds = Object.keys(deviceStatuses);

  return (
    <div className="bg-[#1C2028] border border-[#2D3441] p-6 rounded-[12px] shadow-xl">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-[10px] font-black text-[#94A3B8] uppercase tracking-widest">
          Device Telemetry
        </h3>
        <div className="flex items-center gap-2">
          {isConnected ? (
            <>
              <div className="w-1.5 h-1.5 rounded-full bg-[#34D399] animate-pulse" />
              <span className="text-[8px] font-black text-[#34D399] uppercase tracking-widest">
                Live
              </span>
            </>
          ) : (
            <>
              <div className="w-1.5 h-1.5 rounded-full bg-[#F87171]" />
              <span className="text-[8px] font-black text-[#F87171] uppercase tracking-widest">
                {reconnectAttempts > 0 ? `Retry_${reconnectAttempts}` : 'Offline'}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Device Grid */}
      <div className="grid grid-cols-2 gap-4">
        {DEFAULT_NODES.map((node, index) => {
          // Try to match a real device by index or by known deviceId
          const realDeviceId = deviceIds[index];
          const realDevice = realDeviceId ? deviceStatuses[realDeviceId] : null;
          const status: DeviceStatus = realDevice?.status ?? 'unknown';
          const displayName = realDevice?.name ?? node.label;

          return (
            <div
              key={node.slot}
              className={cn(
                'bg-[#121417] border p-3 rounded-[8px] flex justify-between items-center group transition-all duration-300',
                getStatusGlow(status)
              )}
            >
              <div className="flex items-center gap-2.5">
                {status === 'online' ? (
                  <Wifi size={12} className="text-[#34D399]" />
                ) : status === 'offline' ? (
                  <WifiOff size={12} className="text-[#F87171]" />
                ) : (
                  <Radio size={12} className="text-[#2D3441]" />
                )}
                <div>
                  <p
                    className={cn(
                      'text-[10px] font-black uppercase tracking-tight transition-colors',
                      status === 'online'
                        ? 'text-white'
                        : status === 'offline'
                          ? 'text-[#F87171]/80'
                          : 'text-[#94A3B8] group-hover:text-white'
                    )}
                  >
                    {displayName}
                  </p>
                  {realDevice && (
                    <p className="text-[7px] text-[#2D3441] font-black uppercase mt-0.5">
                      {status === 'online'
                        ? 'ACTIVE'
                        : `Last: ${new Date(realDevice.lastSeen).toLocaleTimeString()}`}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex flex-col items-end gap-2">
                <div className="relative">
                  <div
                    className={cn(
                      'w-2.5 h-2.5 rounded-full transition-all duration-500',
                      getStatusColor(status),
                      status === 'online' && 'animate-pulse'
                    )}
                  />
                  {/* Ripple ring for online devices */}
                  {status === 'online' && (
                    <div className="absolute inset-0 w-2.5 h-2.5 rounded-full bg-[#34D399]/30 animate-ping" />
                  )}
                </div>

                {status === 'online' && (
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => handleCommand(realDeviceId, 'FLASHLIGHT_ON')}
                      disabled={!!commanding}
                      className="p-1 hover:bg-[#60A5FA]/10 rounded text-[#60A5FA] transition-colors"
                      title="Toggle Flashlight"
                    >
                      <Zap size={10} className={cn(commanding === `${realDeviceId}-FLASHLIGHT_ON` && "animate-bounce")} />
                    </button>
                    <button 
                      onClick={() => handleCommand(realDeviceId, 'VIBRATE')}
                      disabled={!!commanding}
                      className="p-1 hover:bg-[#60A5FA]/10 rounded text-[#60A5FA] transition-colors"
                      title="Vibrate Node"
                    >
                      <Smartphone size={10} className={cn(commanding === `${realDeviceId}-VIBRATE` && "animate-shake")} />
                    </button>
                    <button 
                      onClick={() => handleCommand(realDeviceId, 'REBOOT_APP')}
                      disabled={!!commanding}
                      className="p-1 hover:bg-red-500/10 rounded text-red-500 transition-colors"
                      title="Remote Reboot"
                    >
                      <RefreshCw size={10} className={cn(commanding === `${realDeviceId}-REBOOT_APP` && "animate-spin")} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Mesh summary footer */}
      <div className="mt-4 pt-3 border-t border-[#2D3441]/50 flex justify-between items-center">
        <p className="text-[7px] text-[#2D3441] font-black uppercase tracking-widest">
          Mesh_Nodes: {deviceIds.length} / 4
        </p>
        <p className="text-[7px] text-[#2D3441] font-black uppercase tracking-widest">
          Protocol: WSS_E2EE
        </p>
      </div>
    </div>
  );
}
