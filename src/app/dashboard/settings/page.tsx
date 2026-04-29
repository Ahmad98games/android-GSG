'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { withTimeout } from '@/lib/with-timeout';
import { Save, Loader2, ShieldCheck, RotateCcw, Server, AlertTriangle, Package } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSettingsStore } from '@/lib/stores/useSettingsStore';
import { Activity, Zap } from 'lucide-react';

interface SystemSetting {
  key: string;
  value: string;
  description: string | null;
  updated_at: string;
}

interface HardwareReport {
  cpu: string;
  ram: string;
  disk: string;
  latency: string;
  lastAudit: string;
}

const SETTING_GROUPS: Record<string, { label: string; color: string; keys: string[] }> = {
  chori: {
    label: 'Wastage Controls',
    color: '#F87171',
    keys: ['chori_guard_wastage_pct', 'chori_guard_shrinkage_pct', 'chori_guard_tolerance_gaz']
  },
  stock: {
    label: 'Stock & Inventory',
    color: '#FBBF24',
    keys: ['low_stock_threshold_sets']
  },
  pricing: {
    label: 'Pricing & Discounts',
    color: '#C5A059',
    keys: ['wholesale_discount_pct', 'wholesale_min_sets']
  },
  whatsapp: {
    label: 'WhatsApp Configuration',
    color: '#25D366',
    keys: ['whatsapp_phone_number_id', 'whatsapp_access_token', 'whatsapp_signature']
  }
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<'general' | 'hardware' | 'developer' | 'updates'>('general');
  const initialized = useRef(false);

  const [errorStatus, setErrorStatus] = useState<string | null>(null);

  const fetchSettings = useCallback(async (isInitial: boolean = false) => {
    if (isInitial) setLoading(true);
    setErrorStatus(null);
    try {
      const { data, error } = await withTimeout(
        Promise.resolve(supabase.from('system_settings').select('*').order('key')),
        8000
      ) as { data: SystemSetting[] | null; error: { message: string } | null };

      if (error) {
        if (error.message.includes('relation "public.system_settings" does not exist') || 
            error.message.includes('schema cache')) {
          setErrorStatus('SCHEMA_MISSING');
        } else {
          setErrorStatus('CONNECTION_FAILED');
        }
        throw error;
      }
      setSettings(data || []);
    } catch (e: unknown) {
      const err = e as { message?: string };
      console.error('❌ SETTINGS_FETCH_FAILURE:', err.message || e);
      setErrorStatus(prev => prev || 'CONNECTION_FAILED');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      void fetchSettings(true);
    }
  }, [fetchSettings]);

  const handleChange = (key: string, value: string) => {
    setDirty(prev => ({ ...prev, [key]: value }));
  };

  const getValue = (key: string) => {
    return dirty[key] ?? settings.find(s => s.key === key)?.value ?? '';
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const [key, value] of Object.entries(dirty)) {
        const { error } = await supabase
          .from('system_settings')
          .update({ value, updated_at: new Date().toISOString() })
          .eq('key', key);
        if (error) throw error;
      }
      setDirty({});
      void fetchSettings();
    } catch (e) {
      console.error('❌ SETTINGS_SAVE_FAILURE:', e);
      alert('Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  const hasDirtyChanges = Object.keys(dirty).length > 0;

  return (
    <div className="p-8 space-y-8 bg-[#121417] min-h-screen text-[#F1F5F9] font-mono select-none selection:bg-[#60A5FA] selection:text-white">
      <div className="flex justify-between items-end border-b border-[#2D3441] pb-8">
        <div>
          <h1 className="text-4xl font-black tracking-tighter uppercase">
            <span className="text-[#60A5FA]">System</span> <span className="text-[#60A5FA]">Settings</span>
          </h1>
          <p className="text-[10px] text-[#94A3B8] tracking-[0.2em] mt-2 uppercase">Global Configuration and Quality Controls</p>
        </div>
        <div className="flex gap-4">
          {hasDirtyChanges && (
            <button
              onClick={() => setDirty({})}
              className="px-6 py-3 bg-[#1C2028] border border-[#2D3441] text-[10px] font-black uppercase text-[#94A3B8] hover:text-[#F1F5F9] transition-all flex items-center gap-2 rounded-[8px]"
            >
              <RotateCcw size={14} /> Discard
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={!hasDirtyChanges || saving}
            className={cn(
              "px-8 py-3 rounded-[8px] text-[10px] font-black uppercase flex items-center gap-2 transition-all shadow-xl",
              hasDirtyChanges
                ? "bg-[#60A5FA] text-[#121417] hover:bg-[#3B82F6]"
                : "bg-[#121417] text-[#2D3441] cursor-not-allowed border border-[#2D3441]"
            )}
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {saving ? 'Persisting...' : 'Save Changes'}
          </button>
        </div>
      </div>

      <div className="flex gap-1 bg-[#1C2028] p-1 rounded-[10px] w-fit border border-[#2D3441]">
        <button
          onClick={() => setActiveTab('general')}
          className={cn(
            "px-8 py-2 text-[10px] font-black uppercase transition-all rounded-[8px]",
            activeTab === 'general' ? "bg-[#60A5FA] text-[#121417]" : "text-[#94A3B8] hover:text-white"
          )}
        >
          General Configuration
        </button>
        <button
          onClick={() => setActiveTab('hardware')}
          className={cn(
            "px-8 py-2 text-[10px] font-black uppercase transition-all rounded-[8px]",
            activeTab === 'hardware' ? "bg-[#FBBF24] text-[#121417]" : "text-[#94A3B8] hover:text-white"
          )}
        >
          Hardware Status
        </button>
        <button
          onClick={() => setActiveTab('developer')}
          className={cn(
            "px-8 py-2 text-[10px] font-black uppercase transition-all rounded-[8px]",
            activeTab === 'developer' ? "bg-[#60A5FA] text-[#121417] shadow-[0_0_15px_rgba(96,165,250,0.3)]" : "text-[#94A3B8] hover:text-white"
          )}
        >
          Developer Console
        </button>
        <button
          onClick={() => setActiveTab('updates')}
          className={cn(
            "px-8 py-2 text-[10px] font-black uppercase transition-all rounded-[8px]",
            activeTab === 'updates' ? "bg-[#34D399] text-[#121417] shadow-[0_0_15px_rgba(52,211,153,0.3)]" : "text-[#94A3B8] hover:text-white"
          )}
        >
          OTA Updates
        </button>
      </div>

      {activeTab === 'general' ? (
        <>
          {errorStatus === 'SCHEMA_MISSING' && (
            <div className="bg-[#60A5FA]/10 border border-[#60A5FA]/30 p-8 rounded-[8px] space-y-4">
              <div className="flex items-center gap-3 text-[#60A5FA]">
                <RotateCcw size={20} />
                <p className="text-sm font-black uppercase tracking-tighter">Emergency Schema Restoration Required</p>
              </div>
              <p className="text-xs text-[#94A3B8] font-mono leading-relaxed">
                The industrial settings engine detected a missing <code className="text-[#F1F5F9]">public.system_settings</code> table. 
                Run the following SQL in your Supabase SQL Editor to restore functionality:
              </p>
              <pre className="bg-[#121417]/50 p-6 text-[10px] text-[#94A3B8] overflow-x-auto border border-[#2D3441] font-mono select-all rounded-[8px]">
    {`CREATE TABLE public.system_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        description TEXT,
        updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    INSERT INTO public.system_settings (key, value, description) 
    VALUES ('chori_guard_wastage_pct', '4.0', 'Industrial wastage control');`}
              </pre>
              <button 
                onClick={() => void fetchSettings(true)}
                className="text-[10px] font-black text-[#60A5FA] uppercase hover:text-white transition-all underline underline-offset-4"
              >
                Retry Connection
              </button>
            </div>
          )}

      {errorStatus === 'CONNECTION_FAILED' && (
        <div className="bg-[#C5A059]/10 border border-[#C5A059]/30 p-8 rounded-[8px] space-y-4">
          <div className="flex items-center gap-3 text-[#C5A059]">
            <Activity size={20} className="animate-pulse" />
            <p className="text-sm font-black uppercase tracking-tighter">Searching for Local Nodes...</p>
          </div>
          <p className="text-xs text-[#94A3B8] font-mono leading-relaxed uppercase">
            The Hub is operating in 100% Offline Mode. Searching for local mobile nodes on the mesh network. 
            Internet connectivity is not required for industrial operations.
          </p>
          <button 
            onClick={() => void fetchSettings(true)}
            className="px-6 py-3 bg-[#1C2028] border border-[#2D3441] rounded-[8px] text-[10px] font-black uppercase text-[#C5A059] hover:bg-[#C5A059] hover:text-white transition-all flex items-center gap-2"
          >
            <RotateCcw size={14} /> Refresh Mesh
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-32">
          <Loader2 className="animate-spin text-[#60A5FA]" size={32} />
        </div>
      ) : (
        <div className="space-y-10">
          {Object.entries(SETTING_GROUPS).map(([groupKey, group]) => (
            <div key={groupKey} className="bg-[#1C2028] border border-[#2D3441] rounded-[12px] overflow-hidden shadow-xl">
              <div className="p-6 border-b border-[#2D3441] flex items-center gap-3">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: group.color }} />
                <h3 className="text-[10px] font-black text-[#F1F5F9] uppercase tracking-widest">{group.label}</h3>
              </div>
              <div className="divide-y divide-white/5">
                {group.keys.map(key => {
                  const setting = settings.find(s => s.key === key);
                  if (!setting) return null;
                  const isDirty = dirty[key] !== undefined;
                  const isSecret = key.includes('token') || key.includes('password');
                  return (
                    <div key={key} className="p-6 flex items-center justify-between gap-8">
                      <div className="flex-1">
                        <p className="text-[10px] font-bold text-zinc-300 uppercase tracking-widest mb-1">{key.replace(/_/g, ' ')}</p>
                        <p className="text-[9px] text-zinc-500 font-medium">{setting.description}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <input
                          type={isSecret ? "password" : "text"}
                          value={getValue(key)}
                          onChange={e => handleChange(key, e.target.value)}
                          className={cn(
                            "w-32 bg-black border p-3 text-right text-sm font-black text-white outline-none transition-all rounded-[8px]",
                            isDirty ? "border-[#60A5FA]" : "border-[#2D3441] focus:border-[#60A5FA]/50"
                          )}
                        />
                        {isDirty && (
                          <div className="w-2 h-2 rounded-full bg-[#60A5FA] animate-pulse" />
                        )}
                      </div>
                    </div>
                  );
                })}
                {groupKey === 'whatsapp' && (
                  <div className="p-6 bg-[#242933]/50 border-t border-[#2D3441] flex justify-end">
                    <button
                      onClick={async () => {
                        const token = getValue('whatsapp_access_token');
                        const phoneId = getValue('whatsapp_phone_number_id');
                        if (!token || !phoneId) return alert('Enter ID and Token first');
                        
                        try {
                          const { error } = await supabase.functions.invoke('whatsapp-notify', {
                            body: { 
                              test: true,
                              token, 
                              phoneId,
                              phone: prompt('Enter recipient phone (+92...)', '+923334355475') 
                            }
                          });
                          if (error) throw error;
                          alert('Test sent! Check your phone.');
                        } catch (err) {
                          alert('Failed to send test: ' + (err as Error).message);
                        }
                      }}
                      className="px-6 py-2 bg-[#1C2028] border border-[#2D3441] text-[10px] font-black uppercase text-[#60A5FA] hover:bg-[#60A5FA] hover:text-[#121417] transition-all rounded-[8px]"
                    >
                      Process Test Message
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Ungrouped settings */}
          {settings.filter(s => !Object.values(SETTING_GROUPS).flatMap(g => g.keys).includes(s.key)).length > 0 && (
            <div className="bg-[#1C2028] border border-[#2D3441] rounded-[12px] overflow-hidden shadow-xl">
              <div className="p-6 border-b border-[#2D3441]">
                <h3 className="text-[10px] font-black text-[#94A3B8] uppercase tracking-widest">Other Settings</h3>
              </div>
              <div className="divide-y divide-[#2D3441]">
                {settings.filter(s => !Object.values(SETTING_GROUPS).flatMap(g => g.keys).includes(s.key)).map(setting => (
                  <div key={setting.key} className="p-6 flex items-center justify-between gap-8">
                    <div className="flex-1">
                      <p className="text-[10px] font-black text-[#F1F5F9] uppercase tracking-widest mb-1">{setting.key.replace(/_/g, ' ')}</p>
                      <p className="text-[9px] text-[#94A3B8]">{setting.description}</p>
                    </div>
                    <input
                      type="text"
                      value={getValue(setting.key)}
                      onChange={e => handleChange(setting.key, e.target.value)}
                      className="w-32 bg-[#121417] border border-[#2D3441] p-3 text-right text-sm font-black text-[#F1F5F9] outline-none focus:border-[#60A5FA]/50 rounded-[8px]"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      </>
      ) : activeTab === 'hardware' ? (
        <HardwareStatusTab />
      ) : activeTab === 'developer' ? (
        <DeveloperTab />
      ) : (
        <UpdateManagerTab />
      )}

      <div className="flex items-center gap-4 bg-[#1C2028] p-6 border border-[#2D3441] rounded-[12px] shadow-lg">
        <ShieldCheck size={20} className="text-[#34D399]" />
        <div>
          <p className="text-[10px] font-black text-[#F1F5F9] uppercase tracking-widest leading-none mb-1">Settings are system-wide</p>
          <p className="text-[8px] text-[#94A3B8] uppercase font-black">Changes affect Chori Guard, stock alerts, and pricing calculations across all modules.</p>
        </div>
      </div>
    </div>
  );
}

function HardwareStatusTab() {
  const [report, setReport] = useState<HardwareReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/system/hardware-status')
      .then(res => res.json())
      .then(data => {
        setReport(data);
        setLoading(false);
      });
  }, []);

  if (loading) return (
    <div className="flex justify-center py-32 bg-[#1C2028] border border-[#2D3441] rounded-[12px]">
      <Loader2 className="animate-spin text-[#FBBF24]" size={32} />
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="bg-[#1C2028] border border-[#2D3441] rounded-[12px] p-8 shadow-xl">
        <div className="flex justify-between items-start mb-10">
          <div>
            <h3 className="text-2xl font-black text-[#F1F5F9] uppercase flex items-center gap-3">
              <Server size={24} className="text-[#FBBF24]" />
              Host Integrity Audit
            </h3>
            <p className="text-[10px] text-[#94A3B8] uppercase mt-1 tracking-widest">Real-time hardware performance monitoring</p>
          </div>
          <div className="px-4 py-2 bg-[#FBBF24]/10 border border-[#FBBF24]/30 rounded-[4px]">
            <p className="text-[8px] font-black text-[#FBBF24] uppercase">Last Audit: {report?.lastAudit}</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <StatusCard label="CPU Compute" status={report?.cpu || 'N/A'} description="Real-time AI inference load" />
          <StatusCard label="Memory (RAM)" status={report?.ram || 'N/A'} description="System buffer & cache headroom" />
          <StatusCard label="Storage (IO)" status={report?.disk || 'N/A'} description="Forensic snippet write stability" />
          <StatusCard label="Network Mesh" status={report?.latency || 'N/A'} description="P2P Synchronization latency" />
        </div>

        <div className="mt-10 p-6 bg-[#F87171]/5 border border-[#F87171]/20 rounded-[8px]">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={16} className="text-[#F87171]" />
            <p className="text-[10px] font-black text-[#F87171] uppercase">Liability Protection Protocol</p>
          </div>
          <p className="text-[11px] text-[#94A3B8] leading-relaxed uppercase font-medium">
            Performance states labeled as Bottlenecked or Full indicate host-side hardware failures. 
            Gold She Industrial AI is throttled by host infrastructure limitations. 
            Audit logs are cryptographically sealed to ensure forensic integrity during liability disputes.
          </p>
        </div>
      </div>
    </div>
  );
}

interface VersionData {
  latest_version: string;
  release_notes: string;
  download_url: string | null;
  sha256: string | null;
  updated_at?: string;
}

function UpdateManagerTab() {
  const [file, setFile] = useState<File | null>(null);
  const [version, setVersion] = useState('');
  const [notes, setNotes] = useState('');
  const [deploying, setDeploying] = useState(false);
  const [currentVersion, setCurrentVersion] = useState<VersionData | null>(null);

  useEffect(() => {
    fetch('/api/system/update-check')
      .then(res => res.json())
      .then(data => setCurrentVersion(data));
  }, []);

  const handleDeploy = async () => {
    if (!file || !version) return alert('Please select APK and enter version');
    
    setDeploying(true);
    const formData = new FormData();
    formData.append('apk', file);
    formData.append('version', version);
    formData.append('notes', notes);

    try {
      const res = await fetch('/api/system/deploy', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (data.success) {
        alert('OTA Update Deployed Successfully!');
        setCurrentVersion(data.version);
        setFile(null);
        setVersion('');
        setNotes('');
      } else {
        throw new Error(data.error);
      }
    } catch (err) {
      alert('Deployment failed: ' + (err as Error).message);
    } finally {
      setDeploying(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-[#1C2028] border border-[#2D3441] rounded-[12px] p-8 shadow-xl">
        <div className="flex justify-between items-start mb-10">
          <div>
            <h3 className="text-2xl font-black text-[#F1F5F9] uppercase flex items-center gap-3">
              <Package size={24} className="text-[#34D399]" />
              OTA Update Manager
            </h3>
            <p className="text-[10px] text-[#94A3B8] uppercase mt-1 tracking-widest">Deploy new Android APKs to mobile nodes</p>
          </div>
          {currentVersion && (
            <div className="text-right">
              <p className="text-[10px] font-black text-[#34D399] uppercase">Current Live: v{currentVersion.latest_version}</p>
              <p className="text-[8px] text-[#94A3B8] uppercase mt-1">Hash: {currentVersion.sha256?.slice(0, 16)}...</p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div>
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-2">Select APK File</label>
              <div className="relative group">
                <input 
                  type="file" 
                  accept=".apk"
                  onChange={e => setFile(e.target.files?.[0] || null)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <div className="bg-[#121417] border border-[#2D3441] p-6 rounded-xl text-center group-hover:border-[#34D399]/50 transition-all">
                  <Package className="mx-auto mb-3 text-zinc-600 group-hover:text-[#34D399]" size={24} />
                  <p className="text-[11px] font-bold text-zinc-400 uppercase">
                    {file ? file.name : 'Click or Drag APK'}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-2">Version String</label>
                <input 
                  type="text" 
                  placeholder="e.g. 1.2.5"
                  value={version}
                  onChange={e => setVersion(e.target.value)}
                  className="w-full bg-[#121417] border border-[#2D3441] p-3 text-sm font-black text-white outline-none rounded-[8px] focus:border-[#34D399]/50"
                />
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-2">Release Notes</label>
              <textarea 
                placeholder="What's new in this build?"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="w-full h-32 bg-[#121417] border border-[#2D3441] p-4 text-sm font-medium text-white outline-none rounded-[8px] focus:border-[#34D399]/50 resize-none"
              />
            </div>

            <button
              onClick={handleDeploy}
              disabled={deploying || !file || !version}
              className={cn(
                "w-full py-4 rounded-[8px] text-[10px] font-black uppercase flex items-center justify-center gap-2 transition-all",
                deploying || !file || !version 
                  ? "bg-[#121417] text-[#2D3441] border border-[#2D3441] cursor-not-allowed" 
                  : "bg-[#34D399] text-[#121417] hover:bg-[#10B981] shadow-xl"
              )}
            >
              {deploying ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {deploying ? 'Deploying to Nodes...' : 'Sign & Deploy APK'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function DeveloperTab() {
  const { developerMode, setDeveloperMode } = useSettingsStore();

  return (
    <div className="space-y-6">
      <div className="bg-[#1C2028] border border-[#2D3441] rounded-[12px] p-8 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5">
          <Activity size={120} className="text-[#60A5FA]" />
        </div>
        
        <div className="flex justify-between items-start mb-10 relative z-10">
          <div>
            <h3 className="text-2xl font-black text-[#F1F5F9] uppercase flex items-center gap-3">
              <Zap size={24} className="text-[#60A5FA]" />
              Ahmad Developer Override
            </h3>
            <p className="text-[10px] text-[#94A3B8] uppercase mt-1 tracking-widest">Internal performance monitoring and system debugging</p>
          </div>
        </div>

        <div className="space-y-8 relative z-10">
          <div className="p-6 border border-[#2D3441] rounded-[10px] bg-[#121417]/40 flex items-center justify-between group">
            <div>
              <p className="text-[11px] font-black text-[#F1F5F9] uppercase tracking-widest group-hover:text-[#60A5FA] transition-colors">Performance Monitor HUD</p>
              <p className="text-[10px] text-[#94A3B8] uppercase font-bold tracking-tight mt-1">Enable floating telemetry overlay for real-time debugging</p>
            </div>
            <button
              onClick={() => setDeveloperMode(!developerMode)}
              className={cn(
                "px-6 py-2 rounded-[8px] text-[10px] font-black uppercase transition-all border",
                developerMode 
                  ? "bg-[#60A5FA]/10 border-[#60A5FA]/50 text-[#60A5FA]" 
                  : "bg-white/5 border-white/10 text-zinc-500 hover:border-white/20"
              )}
            >
              {developerMode ? 'Enabled' : 'Disabled'}
            </button>
          </div>

          <div className="p-6 bg-red-500/5 border border-red-500/20 rounded-[8px]">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle size={16} className="text-red-500" />
              <p className="text-[10px] font-black text-red-500 uppercase">Warning: Developer Mode</p>
            </div>
            <p className="text-[11px] text-[#94A3B8] leading-relaxed uppercase font-medium">
              Activating these overrides may expose sensitive system vitals and impact dashboard performance. 
              Only active when explicitly requested by authorized Omnora Engineers (Ahmad).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusCard({ label, status, description }: {label:string, status:string, description:string}) {
  const isHealthy = status === 'Healthy' || status === 'Optimal' || status === 'Low (Local Mesh)';
  return (
    <div className="p-6 border border-[#2D3441] rounded-[10px] bg-[#121417]/40 hover:border-[#FBBF24]/30 transition-all group">
      <div className="flex justify-between items-start mb-4">
        <p className="text-[11px] font-black text-[#F1F5F9] uppercase tracking-widest group-hover:text-[#FBBF24] transition-colors">{label}</p>
        <span className={cn(
          "px-3 py-1 rounded-[4px] text-[9px] font-black uppercase tracking-tighter shadow-sm",
          isHealthy ? "bg-[#34D399]/10 text-[#34D399] border border-[#34D399]/20" : "bg-[#F87171]/10 text-[#F87171] border border-[#F87171]/20"
        )}>
          {status}
        </span>
      </div>
      <p className="text-[10px] text-[#94A3B8] uppercase font-bold tracking-tight">{description}</p>
    </div>
  );
}
