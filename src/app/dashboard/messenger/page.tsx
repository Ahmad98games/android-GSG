'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Send, Paperclip, Mic,
  Terminal, ShieldAlert,
  Loader2,
  Settings,
  Zap, MessageSquare,
  Image as ImageIcon,
  Play,
  Smartphone,
  CheckCheck,
  Wifi,
  Clock,
  QrCode,
  Radio,
  Database,
  Activity,
  Copy,
  Check,
  X,
  Search,
  Server,
  Link2,
  Trash2,
} from 'lucide-react';
import { useToast } from '@/lib/hooks/useToast';

/**
 * INDUSTRIAL COMMAND MESSENGER v10.0
 * Full mesh hub integration — SSE real-time + local SQLite via API routes.
 * NO Supabase dependency — all data flows through the Gold She Mesh Hub.
 */

// ─── Types ──────────────────────────────────────────────────

interface HubStatus {
  status: string;
  hubDeviceId: string;
  uptime: number;
  uptimeFormatted: string;
  connectedCount: number;
  registeredCount: number;
  totalMessages: number;
  totalFileTransfers: number;
  sseClients: number;
  hasPairingCode: boolean;
  memoryUsageMB: number;
  connectedDevices: DeviceInfo[];
  allRegisteredDevices: DeviceInfo[];
}

interface DeviceInfo {
  deviceId: string;
  deviceName: string;
  deviceType: 'hub_pc' | 'node_mobile';
  registeredAt?: number;
  lastSeen: number;
  isOnline: boolean;
}

interface ConversationItem {
  conversationId: string;
  peerDeviceId: string;
  peerDeviceName: string;
  peerDeviceType: string;
  isOnline: boolean;
  lastMessagePreview: string;
  lastMessageType: string;
  lastMessageTs: number;
  unreadCount: number;
}

interface StoredMessage {
  packetId: string;
  type: string;
  fromDeviceId: string;
  toDeviceId: string;
  conversationId: string;
  payload: string;
  seq: number;
  senderTs: number;
  hubStoredAt: number;
  deliveredAt: number | null;
  readAt: number | null;
}

interface PairingResult {
  success: boolean;
  code: string;
  displayString: string;
  qrPayload: string;
  expiresAt: number;
  hubIp: string;
  expiresInSeconds: number;
}

// ─── Helpers ────────────────────────────────────────────────

function cn(...classes: (string | false | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
}

function formatDate(ts: number): string {
  const d = new Date(ts);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return 'Today';
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString();
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60_000) return 'just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

function parsePayloadText(payload: string): string {
  try {
    const p = JSON.parse(payload);
    return p.text || p.caption || '[Media]';
  } catch {
    return '[Message]';
  }
}

// ─── Component ──────────────────────────────────────────────

export default function MessengerPage() {
  const { addToast } = useToast();
  // Hub state
  const [hubStatus, setHubStatus] = useState<HubStatus | null>(null);
  const [hubError, setHubError] = useState(false);

  // Conversations & messages
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [activeConv, setActiveConv] = useState<ConversationItem | null>(null);
  const [messages, setMessages] = useState<StoredMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  // Input
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [recording] = useState(false);

  // Pairing
  const [showPairing, setShowPairing] = useState(false);
  const [pairingData, setPairingData] = useState<PairingResult | null>(null);
  const [pairingCountdown, setPairingCountdown] = useState(0);
  const [codeCopied, setCodeCopied] = useState(false);

  // Search
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Typing indicators
  const [typingDevices, setTypingDevices] = useState<Map<string, string>>(new Map());

  // Refs
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sseRef = useRef<EventSource | null>(null);

  // ─── Hub Status Polling ─────────────────────────────────────

  const fetchHubStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/ecosystem/mesh/status');
      if (!res.ok) throw new Error('Hub offline');
      const data = await res.json();
      setHubStatus(data);
      setHubError(false);
    } catch {
      setHubError(true);
    }
  }, []);

  useEffect(() => {
    fetchHubStatus();
    const interval = setInterval(fetchHubStatus, 10_000);
    return () => clearInterval(interval);
  }, [fetchHubStatus]);

  // ─── Conversation List ──────────────────────────────────────

  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch('/api/ecosystem/mesh/conversations');
      if (!res.ok) return;
      const data = await res.json();
      setConversations(data.conversations || []);
    } catch {
      // Silent fail — will retry on next poll
    }
  }, []);

  useEffect(() => {
    fetchConversations();
    const interval = setInterval(fetchConversations, 15_000);
    return () => clearInterval(interval);
  }, [fetchConversations]);

  // ─── SSE Stream ─────────────────────────────────────────────

  useEffect(() => {
    const es = new EventSource('/api/ecosystem/mesh/stream');
    sseRef.current = es;

    es.addEventListener('message', (e) => {
      try {
        const data = JSON.parse(e.data);

        if (data.type === 'TYPING_INDICATOR') {
          setTypingDevices((prev) => {
            const next = new Map(prev);
            if (data.isTyping) {
              next.set(data.from, data.fromName);
            } else {
              next.delete(data.from);
            }
            return next;
          });
          return;
        }

        // Incoming/outgoing message — refresh conversation list + messages if active
        fetchConversations();
        if (activeConv && (data.conversationId === activeConv.conversationId || data.to === 'broadcast')) {
          fetchMessages(activeConv.conversationId);
        }
      } catch { /* malformed event */ }
    });

    es.addEventListener('device-online', () => {
      fetchHubStatus();
      fetchConversations();
    });

    es.addEventListener('device-offline', () => {
      fetchHubStatus();
      fetchConversations();
    });

    es.addEventListener('pairing-complete', (e) => {
      try {
        const data = JSON.parse(e.data);
        addToast({
          type: 'SUCCESS',
          title: 'New Device Paired',
          message: `${data.deviceName} is now part of your mesh network.`
        });
        fetchHubStatus();
        fetchConversations();
        setShowPairing(false);

        // Auto-select the newly paired device if no conversation is active
        if (!activeConv) {
          setActiveConv({
            conversationId: [hubStatus?.hubDeviceId || '', data.deviceId].sort().join(':'),

            peerDeviceId: data.deviceId,
            peerDeviceName: data.deviceName,
            peerDeviceType: data.deviceType,
            isOnline: true,
            lastMessagePreview: '',
            lastMessageType: '',
            lastMessageTs: Date.now(),
            unreadCount: 0,
          });
        }
      } catch (err) {
        console.error('Pairing event parse failed:', err);
      }
    });

    es.onerror = () => {
      console.warn('[SSE] Connection error — reconnecting...');
    };

    return () => {
      es.close();
      sseRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeConv?.conversationId]);

  // ─── Messages ───────────────────────────────────────────────

  const fetchMessages = useCallback(async (conversationId: string) => {
    setLoadingMessages(true);
    try {
      const res = await fetch(`/api/ecosystem/mesh/messages?conversationId=${encodeURIComponent(conversationId)}&limit=100`);
      if (!res.ok) return;
      const data = await res.json();
      setMessages(data.messages || []);
      setTimeout(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }, 100);
    } catch {
      // silent
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  useEffect(() => {
    if (activeConv) {
      fetchMessages(activeConv.conversationId);
    }
  }, [activeConv, fetchMessages]);

  // ─── Send ───────────────────────────────────────────────────

  const sendMessage = async () => {
    const text = inputText.trim();
    if (!text || !activeConv || sending) return;

    setSending(true);
    setInputText('');

    try {
      const res = await fetch('/api/ecosystem/mesh/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: activeConv.peerDeviceId === 'broadcast' ? 'broadcast' : activeConv.peerDeviceId,
          text,
          type: 'TEXT_MESSAGE',
        }),
      });

      if (res.ok) {
        // Refresh messages to show the sent message
        await fetchMessages(activeConv.conversationId);
        await fetchConversations();
      }
    } catch (err) {
      console.error('Send failed:', err);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  // ─── Pairing ────────────────────────────────────────────────

  const generatePairingCode = async () => {
    try {
      const res = await fetch('/api/ecosystem/mesh/pairing/generate', { method: 'POST' });
      if (!res.ok) throw new Error('Failed to generate code');
      const data: PairingResult = await res.json();
      setPairingData(data);
      setPairingCountdown(data.expiresInSeconds);
      setShowPairing(true);
    } catch (err) {
      console.error('Pairing code generation failed:', err);
    }
  };

  // Countdown timer for pairing code
  useEffect(() => {
    if (!showPairing || pairingCountdown <= 0) return;
    const timer = setInterval(() => {
      setPairingCountdown((prev) => {
        if (prev <= 1) {
          setShowPairing(false);
          setPairingData(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [showPairing, pairingCountdown]);

  const copyCode = () => {
    if (pairingData) {
      navigator.clipboard.writeText(pairingData.code);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    }
  };

  // ─── Device Management ──────────────────────────────────────

  const kickDevice = async (deviceId: string) => {
    if (!confirm('Remove this device from the mesh?')) return;
    try {
      await fetch(`/api/ecosystem/mesh/devices?deviceId=${deviceId}`, { method: 'DELETE' });
      fetchHubStatus();
      fetchConversations();
    } catch (err) {
      console.error('Kick failed:', err);
    }
  };

  // ─── Render ─────────────────────────────────────────────────

  const isHubOnline = hubStatus?.status === 'running';

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-[#121417] font-[family-name:var(--font-body)] select-none">

      {/* ═══ SIDEBAR ═══ */}
      <aside className="w-[340px] bg-[#1C2028] border-r border-[#2D3441] flex flex-col">

        {/* Hub header */}
        <div className="px-6 pt-6 pb-4 border-b border-[#2D3441]">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-black uppercase tracking-tight">
              <span className="text-[#60A5FA]">Mesh</span> <span className="text-[#F1F5F9]">Hub</span>
            </h2>
            <div className="flex gap-2">
              <button
                onClick={() => setShowSearch(!showSearch)}
                className="p-2 text-[#94A3B8] hover:text-white transition-colors rounded-lg hover:bg-[#242933]"
              >
                <Search size={16} />
              </button>
              <button
                onClick={generatePairingCode}
                className="p-2 text-[#60A5FA] hover:bg-[#60A5FA]/10 transition-all rounded-lg"
                title="Pair new device"
              >
                <QrCode size={16} />
              </button>
            </div>
          </div>

          {/* Hub status badge */}
          <div className="flex items-center gap-3 p-3 bg-[#121417] border border-[#2D3441] rounded-xl">
            <div className={cn(
              "w-2 h-2 rounded-full",
              isHubOnline ? "bg-[#34D399] shadow-[0_0_8px_#34D399] animate-pulse" : "bg-[#F87171]"
            )} />
            <div className="flex-1 min-w-0">
              <div className="text-[9px] font-black text-[#94A3B8] uppercase tracking-widest">
                {isHubOnline ? `Online · ${hubStatus?.uptimeFormatted}` : hubError ? 'Hub Offline' : 'Connecting...'}
              </div>
              {isHubOnline && (
                <div className="flex items-center gap-3 mt-1 text-[8px] font-bold text-[#4B5563] uppercase tracking-widest">
                  <span className="flex items-center gap-1"><Radio size={8} className="text-[#60A5FA]" />{hubStatus?.connectedCount} live</span>
                  <span className="flex items-center gap-1"><Database size={8} />{hubStatus?.totalMessages} msgs</span>
                  <span className="flex items-center gap-1"><Activity size={8} />{hubStatus?.memoryUsageMB}MB</span>
                </div>
              )}
            </div>
          </div>

          {/* Search input */}
          {showSearch && (
            <div className="mt-3 relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4B5563]" />
              <input
                type="text"
                placeholder="Search messages..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#121417] border border-[#2D3441] rounded-xl pl-9 pr-4 py-2.5 text-xs text-[#F1F5F9] placeholder:text-[#4B5563] focus:outline-none focus:border-[#60A5FA]/40"
                autoFocus
              />
            </div>
          )}
        </div>

        {/* Connected Devices */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          <h3 className="px-3 text-[8px] font-black text-[#94A3B8] uppercase tracking-[0.3em] mb-3 flex items-center gap-2">
            <Link2 size={10} />
            Connected Nodes ({hubStatus?.connectedCount ?? 0})
          </h3>

          {hubStatus?.allRegisteredDevices
            ?.filter((d) => d.deviceType === 'node_mobile')
            .map((device) => {
              // Find matching conversation
              const conv = conversations.find((c) => c.peerDeviceId === device.deviceId);
              return (
                <button
                  key={device.deviceId}
                  onClick={() => {
                    if (conv) {
                      setActiveConv(conv);
                    } else {
                      // Create a synthetic conversation entry for DM
                      setActiveConv({
                        conversationId: [hubStatus!.hubDeviceId, device.deviceId].sort().join(':'),
                        peerDeviceId: device.deviceId,
                        peerDeviceName: device.deviceName,
                        peerDeviceType: device.deviceType,
                        isOnline: device.isOnline,
                        lastMessagePreview: '',
                        lastMessageType: '',
                        lastMessageTs: 0,
                        unreadCount: 0,
                      });
                    }
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all group",
                    activeConv?.peerDeviceId === device.deviceId
                      ? "bg-[#60A5FA]/10 border border-[#60A5FA]/20"
                      : "border border-transparent hover:bg-[#242933]"
                  )}
                >
                  <div className="relative">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
                      activeConv?.peerDeviceId === device.deviceId
                        ? "bg-[#60A5FA] text-[#121417]" : "bg-[#121417] text-[#4B5563]"
                    )}>
                      <Smartphone size={18} />
                    </div>
                    <div className={cn(
                      "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#1C2028]",
                      device.isOnline ? "bg-[#34D399]" : "bg-[#2D3441]"
                    )} />
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <div className="text-[11px] font-black text-[#F1F5F9] uppercase tracking-tight truncate">
                      {device.deviceName}
                    </div>
                    {conv?.lastMessagePreview ? (
                      <div className="text-[9px] text-[#4B5563] font-bold truncate mt-0.5">
                        {conv.lastMessagePreview}
                      </div>
                    ) : (
                      <div className="text-[8px] text-[#4B5563] uppercase tracking-widest mt-0.5">
                        {device.isOnline ? 'Online' : `Last seen ${timeAgo(device.lastSeen)}`}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    {conv?.lastMessageTs ? (
                      <span className="text-[8px] font-bold text-[#4B5563] tabular-nums">{formatTime(conv.lastMessageTs)}</span>
                    ) : null}
                    {conv && conv.unreadCount > 0 && (
                      <span className="min-w-[18px] h-[18px] flex items-center justify-center bg-[#60A5FA] text-[#121417] text-[8px] font-black rounded-full px-1">
                        {conv.unreadCount}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}

          {(!hubStatus?.allRegisteredDevices?.some((d) => d.deviceType === 'node_mobile')) && (
            <div className="px-3 py-8 text-center">
              <Smartphone size={32} className="mx-auto text-[#2D3441] mb-3" />
              <p className="text-[10px] text-[#4B5563] font-bold uppercase tracking-widest">No devices paired</p>
              <button
                onClick={generatePairingCode}
                className="mt-3 px-4 py-2 bg-[#60A5FA]/10 text-[#60A5FA] rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-[#60A5FA]/20 transition-all"
              >
                + Pair Device
              </button>
            </div>
          )}
        </div>

        {/* Footer: Hub identity */}
        <div className="p-4 border-t border-[#2D3441]">
          <div className="flex items-center gap-3 p-3 bg-[#121417] border border-[#2D3441] rounded-xl">
            <div className="w-10 h-10 bg-[#1C2028] border border-[#2D3441] rounded-xl flex items-center justify-center text-[#60A5FA]">
              <Server size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-black text-[#F1F5F9] uppercase truncate">Hub PC</p>
              <p className="text-[8px] text-[#34D399] uppercase font-black flex items-center gap-1">
                <Zap size={8} fill="currentColor" /> {isHubOnline ? 'Mesh Active' : 'Offline'}
              </p>
            </div>
            <button className="p-1.5 text-[#2D3441] hover:text-[#60A5FA] transition-colors">
              <Settings size={14} />
            </button>
          </div>
        </div>
      </aside>

      {/* ═══ MAIN CHAT AREA ═══ */}
      <main className="flex-1 flex flex-col relative bg-[#121417]">
        {activeConv ? (
          <>
            {/* Chat header */}
            <header className="px-6 py-4 border-b border-[#2D3441] flex justify-between items-center bg-[#1C2028]/95 backdrop-blur-md">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="w-10 h-10 bg-[#121417] border border-[#2D3441] rounded-xl flex items-center justify-center text-[#60A5FA]">
                    <Smartphone size={18} />
                  </div>
                  <div className={cn(
                    "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#1C2028]",
                    activeConv.isOnline ? "bg-[#34D399]" : "bg-[#2D3441]"
                  )} />
                </div>
                <div>
                  <h2 className="text-sm font-black text-[#F1F5F9] uppercase tracking-tight">
                    {activeConv.peerDeviceName}
                  </h2>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-[8px] font-bold text-[#4B5563] uppercase tracking-widest">
                      {activeConv.isOnline ? 'Online' : 'Offline'}
                    </span>
                    <span className="text-[8px] text-[#2D3441] font-bold uppercase tracking-widest px-2 py-0.5 border border-[#2D3441] rounded-full">
                      E2EE · LAN
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-[#121417] border border-[#2D3441] rounded-lg">
                  <ShieldAlert size={12} className="text-[#34D399]" />
                  <span className="text-[8px] font-black text-[#34D399] uppercase tracking-widest">Encrypted</span>
                </div>
                <button
                  onClick={() => kickDevice(activeConv.peerDeviceId)}
                  className="p-2 text-[#94A3B8] hover:text-[#F87171] transition-all rounded-lg border border-[#2D3441] hover:border-[#F87171]/30"
                  title="Remove device"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </header>

            {/* Typing indicator */}
            {typingDevices.has(activeConv.peerDeviceId) && (
              <div className="px-6 py-2 bg-[#1C2028]/50 border-b border-[#2D3441]">
                <span className="text-[10px] text-[#60A5FA] font-bold italic animate-pulse">
                  {typingDevices.get(activeConv.peerDeviceId)} is typing...
                </span>
              </div>
            )}

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-8 py-6 space-y-1">
              {loadingMessages ? (
                <div className="h-full flex flex-col items-center justify-center space-y-4">
                  <Loader2 className="animate-spin text-[#60A5FA]" size={36} strokeWidth={2.5} />
                  <p className="text-[9px] uppercase font-black text-[#60A5FA] tracking-[0.4em] animate-pulse">Loading Messages...</p>
                </div>
              ) : messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center opacity-10">
                  <MessageSquare size={80} strokeWidth={1} className="text-[#F1F5F9]" />
                  <p className="text-lg uppercase font-black tracking-[0.5em] text-[#F1F5F9] mt-6">No messages yet</p>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {messages.reduce((acc: React.ReactNode[], msg, idx) => {
                    const currentDate = formatDate(msg.senderTs);
                    const prevDate = idx > 0 ? formatDate(messages[idx - 1].senderTs) : null;

                    if (currentDate !== prevDate) {
                      acc.push(
                        <div key={`date-${msg.senderTs}`} className="flex justify-center my-6">
                          <div className="px-4 py-1.5 bg-[#1C2028] border border-[#2D3441] rounded-full text-[8px] font-black text-[#94A3B8] uppercase tracking-widest">
                            {currentDate}
                          </div>
                        </div>
                      );
                    }

                    const isMe = msg.fromDeviceId === hubStatus?.hubDeviceId;
                    const text = parsePayloadText(msg.payload);

                    acc.push(
                      <div key={msg.packetId} className={cn(
                        "flex w-full group",
                        isMe ? "justify-end" : "justify-start"
                      )}>
                        {!isMe && (
                          <div className="w-8 h-8 rounded-lg bg-[#1C2028] border border-[#2D3441] flex items-center justify-center mr-2 mt-auto mb-1 text-[#60A5FA] shrink-0">
                            <Smartphone size={14} />
                          </div>
                        )}
                        <div className={cn("max-w-[65%] flex flex-col", isMe ? "items-end" : "items-start")}>
                          <div className={cn(
                            "px-4 py-2.5 rounded-2xl relative",
                            isMe
                              ? "bg-[#1C2028] border border-[#60A5FA]/20 rounded-br-md"
                              : "bg-[#121417] border border-[#2D3441] rounded-bl-md"
                          )}>
                            {msg.type === 'PHOTO_MESSAGE' && (
                              <div className="flex items-center gap-2 text-[#60A5FA] mb-1">
                                <ImageIcon size={12} />
                                <span className="text-[9px] font-black uppercase">Photo</span>
                              </div>
                            )}
                            {msg.type === 'VOICE_NOTE' && (
                              <div className="flex items-center gap-3 py-1">
                                <button className="w-8 h-8 bg-[#60A5FA] text-[#121417] rounded-full flex items-center justify-center">
                                  <Play size={14} fill="currentColor" className="ml-0.5" />
                                </button>
                                <div className="flex gap-0.5 h-4 items-center flex-1">
                                  {[...Array(16)].map((_, w) => (
                                    <div key={w} className="flex-1 bg-[#2D3441] rounded-full" style={{ height: `${25 + Math.random() * 75}%` }} />
                                  ))}
                                </div>
                              </div>
                            )}
                            <p className="text-[13px] leading-relaxed break-words text-[#F1F5F9]">{text}</p>
                          </div>
                          <div className={cn("flex items-center gap-2 mt-1 px-1", isMe ? "justify-end" : "justify-start")}>
                            <span className="text-[8px] font-bold text-[#4B5563] tabular-nums">{formatTime(msg.senderTs)}</span>
                            {isMe && (
                              <CheckCheck size={12} className={cn(
                                msg.readAt ? "text-[#60A5FA]" : msg.deliveredAt ? "text-[#94A3B8]" : "text-[#2D3441]"
                              )} />
                            )}
                          </div>
                        </div>
                      </div>
                    );
                    return acc;
                  }, [])}
                </div>
              )}
            </div>

            {/* Input bar */}
            <div className="p-4 border-t border-[#2D3441] bg-[#1C2028]/80 backdrop-blur-xl">
              <div className="bg-[#121417] border border-[#2D3441] rounded-2xl p-2 flex items-end gap-2 focus-within:border-[#60A5FA]/30 transition-all">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="p-3 text-[#2D3441] hover:text-[#60A5FA] transition-colors mb-0.5"
                >
                  <Paperclip size={18} />
                </button>
                <textarea
                  ref={inputRef}
                  rows={1}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  placeholder="Type a message..."
                  className="flex-1 bg-transparent text-sm py-3 focus:outline-none placeholder:text-[#2D3441] text-[#F1F5F9] resize-none max-h-36"
                />
                <div className="flex items-center gap-1 mb-0.5">
                  {!inputText && (
                    <button
                      className={cn(
                        "p-3 rounded-xl transition-all",
                        recording ? "bg-[#F87171] text-[#121417] animate-pulse" : "text-[#94A3B8] hover:text-white"
                      )}
                    >
                      <Mic size={18} />
                    </button>
                  )}
                  <button
                    onClick={sendMessage}
                    disabled={!inputText.trim() || sending}
                    className={cn(
                      "p-3 rounded-xl transition-all",
                      inputText.trim()
                        ? "bg-[#60A5FA] text-[#121417] hover:bg-[#3B82F6] shadow-[0_0_20px_rgba(96,165,250,0.3)] active:scale-95"
                        : "bg-[#1C2028] text-[#2D3441]"
                    )}
                  >
                    {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} strokeWidth={2.5} />}
                  </button>
                </div>
                <input type="file" ref={fileInputRef} className="hidden" />
              </div>

              {/* Status bar */}
              <div className="flex justify-between items-center mt-2 px-2">
                <div className="flex items-center gap-2 text-[8px] font-bold text-[#2D3441] uppercase tracking-widest">
                  <Terminal size={10} /> Mesh Protocol v1.0
                </div>
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1.5 text-[8px] font-bold text-[#34D399] uppercase tracking-widest">
                    <ShieldAlert size={10} /> E2EE
                  </span>
                  {hubStatus && (
                    <span className="flex items-center gap-1.5 text-[8px] font-bold text-[#60A5FA] uppercase tracking-widest">
                      <Wifi size={10} /> LAN
                    </span>
                  )}
                </div>
              </div>
            </div>
          </>
        ) : (
          /* ═══ EMPTY STATE ═══ */
          <div className="flex-1 flex flex-col items-center justify-center p-20 text-center">
            <div className="max-w-xl space-y-10">
              <div className="relative">
                <div className="w-28 h-28 bg-[#60A5FA]/5 border-2 border-[#60A5FA]/20 rounded-full flex items-center justify-center mx-auto">
                  <MessageSquare size={44} className="text-[#60A5FA]" strokeWidth={1.5} />
                </div>
                {isHubOnline && <div className="absolute top-0 right-1/3 w-3 h-3 bg-[#34D399] rounded-full animate-ping" />}
              </div>

              <div className="space-y-4">
                <h2 className="text-4xl font-black text-[#F1F5F9] uppercase tracking-tighter">
                  Gold She<br/>Mesh Hub
                </h2>
                <p className="text-xs text-[#94A3B8] uppercase tracking-widest leading-relaxed max-w-sm mx-auto">
                  {isHubOnline
                    ? `Hub active · ${hubStatus?.connectedCount} device${hubStatus?.connectedCount !== 1 ? 's' : ''} connected · Select a device to start messaging`
                    : 'Hub is starting up...'}
                </p>
              </div>

              {(hubStatus?.connectedCount ?? 0) === 0 && (
                <button
                  onClick={generatePairingCode}
                  className="px-6 py-3 bg-[#60A5FA] text-[#121417] rounded-xl font-black uppercase tracking-widest text-xs hover:bg-[#3B82F6] transition-all shadow-[0_0_30px_rgba(96,165,250,0.3)] active:scale-95"
                >
                  <QrCode size={16} className="inline mr-2" /> Pair First Device
                </button>
              )}

              {/* Quick stats */}
              {isHubOnline && (
                <div className="grid grid-cols-3 gap-4 max-w-md mx-auto">
                  <div className="p-4 bg-[#1C2028] border border-[#2D3441] rounded-xl text-center">
                    <div className="text-xs font-black text-[#60A5FA] tabular-nums">{hubStatus?.connectedCount ?? 0}</div>
                    <div className="text-[7px] text-[#4B5563] uppercase font-black mt-1 tracking-widest">Devices</div>
                  </div>
                  <div className="p-4 bg-[#1C2028] border border-[#2D3441] rounded-xl text-center">
                    <div className="text-xs font-black text-[#34D399] tabular-nums">{hubStatus?.totalMessages ?? 0}</div>
                    <div className="text-[7px] text-[#4B5563] uppercase font-black mt-1 tracking-widest">Messages</div>
                  </div>
                  <div className="p-4 bg-[#1C2028] border border-[#2D3441] rounded-xl text-center">
                    <div className="text-xs font-black text-[#F1F5F9] tabular-nums">{hubStatus?.uptimeFormatted ?? '—'}</div>
                    <div className="text-[7px] text-[#4B5563] uppercase font-black mt-1 tracking-widest">Uptime</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* ═══ PAIRING MODAL ═══ */}
      {showPairing && pairingData && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowPairing(false)}>
          <div
            className="bg-[#1C2028] border border-[#2D3441] rounded-3xl p-8 w-[420px] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-black text-[#F1F5F9] uppercase tracking-tight">Pair Device</h3>
              <button onClick={() => setShowPairing(false)} className="p-2 text-[#94A3B8] hover:text-white transition-colors rounded-lg">
                <X size={18} />
              </button>
            </div>

            {/* QR Code area */}
            <div className="bg-white rounded-2xl p-6 mx-auto w-fit mb-6">
              <div className="w-[200px] h-[200px] bg-[#F1F5F9] rounded-xl flex items-center justify-center">
                <div className="text-center">
                  <QrCode size={80} className="text-[#121417] mx-auto mb-2" />
                  <p className="text-[8px] text-[#94A3B8] uppercase font-bold">Scan with mobile app</p>
                </div>
              </div>
            </div>

            {/* Code display */}
            <div className="bg-[#121417] border border-[#2D3441] rounded-xl p-4 mb-4">
              <div className="text-center">
                <p className="text-[8px] text-[#4B5563] uppercase font-black tracking-widest mb-2">Manual Code</p>
                <div className="flex items-center justify-center gap-3">
                  <span className="text-2xl font-black text-[#60A5FA] tracking-[0.3em] font-[family-name:var(--font-data)]">
                    {pairingData.displayString}
                  </span>
                  <button
                    onClick={copyCode}
                    className="p-2 text-[#94A3B8] hover:text-[#60A5FA] transition-colors rounded-lg"
                  >
                    {codeCopied ? <Check size={16} className="text-[#34D399]" /> : <Copy size={16} />}
                  </button>
                </div>
              </div>
            </div>

            {/* Hub IP */}
            <div className="flex items-center justify-between text-[9px] text-[#4B5563] font-bold uppercase tracking-widest mb-4 px-1">
              <span className="flex items-center gap-1.5"><Wifi size={10} /> Hub: {pairingData.hubIp}</span>
              <span>Port: 3000</span>
            </div>

            {/* Countdown */}
            <div className="flex items-center justify-center gap-2">
              <Clock size={14} className={cn(pairingCountdown < 60 ? "text-[#F87171] animate-pulse" : "text-[#94A3B8]")} />
              <span className={cn(
                "text-xs font-black tabular-nums uppercase",
                pairingCountdown < 60 ? "text-[#F87171]" : "text-[#94A3B8]"
              )}>
                Expires in {Math.floor(pairingCountdown / 60)}:{(pairingCountdown % 60).toString().padStart(2, '0')}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
