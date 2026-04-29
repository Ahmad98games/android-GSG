'use client';

import React, { useState } from 'react';
import { 
  ShieldAlert, 
  Trash2, 
  RotateCcw, 
  Lock, 
  Unlock, 
  AlertTriangle,
  Loader2,
  UploadCloud,
  CheckCircle2,
  Smartphone,
} from 'lucide-react';
import { cn } from '@/lib/utils';
// import { verifyMasterPassword } from '@/lib/actions/settings';
// import { hardResetSystem, softResetShift } from '@/lib/actions/system';
import { Capacitor } from '@capacitor/core';

// Mock/Replacement for Static Export
const verifyMasterPassword = async (p: string) => {
  if (Capacitor.isNativePlatform()) {
     return p === (localStorage.getItem('MASTER_PASSWORD') || '1234');
  }
  // In web dev, it will fail anyway if server is not there
  return false;
};

const softResetShift = async (p: string) => ({ success: true });
const hardResetSystem = async (p: string) => ({ success: true });

/**
 * HUB_OS — System Control Panel
 * Nuclear Launch Protocol UI (v2.0)
 * 
 * Aesthetic: Safety Crimson (#EF4444), High Friction UI.
 */
export function SystemControl() {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [password, setPassword] = useState('');
  const [activePassword, setActivePassword] = useState('');
  const [verifying, setVerifying] = useState(false);
  
  const [showHardResetModal, setShowHardResetModal] = useState(false);
  const [showSoftResetModal, setShowSoftResetModal] = useState(false);
  
  const [verificationCode, setVerificationCode] = useState('');
  const [userCode, setUserCode] = useState('');
  const [processing, setProcessing] = useState(false);

  // OTA Deployment State
  const [showDeployModal, setShowDeployModal] = useState(false);
  const [apkFile, setApkFile] = useState<File | null>(null);
  const [versionString, setVersionString] = useState('');
  const [uploadProgress, setUploadProgress] = useState(false);
  const [uploadResult, setUploadResult] = useState<{success: boolean, hash?: string, error?: string} | null>(null);

  // Generate 6-digit code for Hard Reset
  const generateCode = () => {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setVerificationCode(code);
    setUserCode('');
  };

  const handleUnlock = async () => {
    setVerifying(true);
    const valid = await verifyMasterPassword(password);
    if (valid) {
      setIsUnlocked(true);
      setActivePassword(password);
      setShowPasswordModal(false);
    } else {
      alert('INVALID_MASTER_PASSWORD // ACCESS_DENIED');
    }
    setVerifying(false);
    setPassword('');
  };

  const handleSoftReset = async () => {
    setProcessing(true);
    const res = await softResetShift(activePassword);
    if (res.success) {
      window.location.reload();
    }
    setProcessing(false);
  };

  const handleHardReset = async () => {
    if (userCode !== verificationCode) return;
    setProcessing(true);
    const res = await hardResetSystem(activePassword);
    if (res.success) {
      window.location.href = '/'; // Back to onboarding
    }
    setProcessing(false);
  };

  const handleDeployUpload = async () => {
    if (!apkFile || !versionString || !activePassword) return;
    
    setUploadProgress(true);
    setUploadResult(null);
    
    try {
      const formData = new FormData();
      formData.append('apk', apkFile);
      formData.append('version', versionString);
      formData.append('password', activePassword);
      
      const res = await fetch('/api/deploy/upload-apk', {
        method: 'POST',
        body: formData,
      });
      
      const data = await res.json();
      
      if (res.ok && data.success) {
        setUploadResult({ success: true, hash: data.versionData.checksum });
        setApkFile(null);
        setVersionString('');
      } else {
        setUploadResult({ success: false, error: data.error || 'Upload failed' });
      }
    } catch (err: any) {
      setUploadResult({ success: false, error: err.message });
    } finally {
      setUploadProgress(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Danger Zone Header */}
      <div className="flex items-center justify-between p-6 bg-[#EF4444]/5 border border-[#EF4444]/20 rounded-2xl">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-[#EF4444]/10 rounded-xl flex items-center justify-center text-[#EF4444]">
            <ShieldAlert size={24} />
          </div>
          <div>
            <h2 className="text-sm font-black uppercase tracking-[0.2em] text-[#EF4444]">Nuclear Launch Protocol</h2>
            <p className="text-[10px] font-bold text-zinc-500 uppercase">System Maintenance & Destructive Resets</p>
          </div>
        </div>
        
        <button 
          onClick={() => isUnlocked ? setIsUnlocked(false) : setShowPasswordModal(true)}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg font-black uppercase text-[10px] tracking-widest transition-all",
            isUnlocked 
              ? "bg-[#EF4444] text-white shadow-[0_0_20px_rgba(239,68,68,0.3)]" 
              : "bg-white/5 text-zinc-500 hover:bg-white/10"
          )}
        >
          {isUnlocked ? <Unlock size={14} /> : <Lock size={14} />}
          {isUnlocked ? 'Protocol Unlocked' : 'Unlock Controls'}
        </button>
      </div>

      <div className={cn("grid grid-cols-1 md:grid-cols-3 gap-6 transition-all", !isUnlocked && "opacity-20 pointer-events-none grayscale")}>
        
        {/* OTA Deploy Card */}
        <div className="p-8 bg-[#1C2028] border border-white/5 rounded-3xl space-y-6 relative overflow-hidden group">
           <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity text-blue-500">
              <Smartphone size={80} />
           </div>
           <div className="space-y-2">
              <h3 className="text-sm font-black text-blue-500 uppercase tracking-widest">OTA Deployment</h3>
              <p className="text-[10px] text-zinc-500 font-bold leading-relaxed">
                Upload a compiled <span className="text-white">.apk release</span> to directly push to all paired mobile nodes via <span className="text-white">Local Hub Update</span>.
              </p>
           </div>
           <button 
             onClick={() => setShowDeployModal(true)}
             className="w-full py-4 bg-[#1A2433] border border-blue-500/20 hover:border-blue-500/50 hover:bg-blue-500/10 rounded-xl font-black uppercase text-[10px] tracking-widest text-blue-400 hover:text-blue-300 transition-all shadow-[0_0_20px_rgba(59,130,246,0.1)]"
           >
             Deploy App Release
           </button>
        </div>
        
        {/* Soft Reset Card */}
        <div className="p-8 bg-[#1C2028] border border-white/5 rounded-3xl space-y-6 relative overflow-hidden group">
           <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
              <RotateCcw size={80} />
           </div>
           <div className="space-y-2">
              <h3 className="text-sm font-black text-white uppercase tracking-widest">Soft Reset (Shift Change)</h3>
              <p className="text-[10px] text-zinc-500 font-bold leading-relaxed">
                Clears the <span className="text-white">KhataLedger</span> and all <span className="text-white">CCTV evidence snippets</span>. 
                Keep Industry Profile, Camera Settings, and Visual Identity intact.
              </p>
           </div>
           <button 
             onClick={() => setShowSoftResetModal(true)}
             className="w-full py-4 bg-white/5 border border-white/5 hover:border-[#EF4444]/50 hover:bg-[#EF4444]/5 rounded-xl font-black uppercase text-[10px] tracking-widest text-zinc-400 hover:text-[#EF4444] transition-all"
           >
             Initialize Shift Reset
           </button>
        </div>

        {/* Hard Reset Card */}
        <div className="p-8 bg-[#1C2028] border border-[#EF4444]/20 rounded-3xl space-y-6 relative overflow-hidden group">
           <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity text-[#EF4444]">
              <Trash2 size={80} />
           </div>
           <div className="space-y-2">
              <h3 className="text-sm font-black text-[#EF4444] uppercase tracking-widest">Hard Reset (Nuclear Wipe)</h3>
              <p className="text-[10px] text-zinc-500 font-bold leading-relaxed">
                <span className="text-[#EF4444]">TOTAL DATA DESTRUCTION.</span> Wipes entire database, paired nodes, and all configuration. 
                System will return to factory onboarding state.
              </p>
           </div>
           <button 
             onClick={() => { generateCode(); setShowHardResetModal(true); }}
             className="w-full py-4 bg-[#EF4444] text-white rounded-xl font-black uppercase text-[10px] tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_0_30px_rgba(239,68,68,0.2)]"
           >
             Initialize Hard Reset
           </button>
        </div>

      </div>

      {!isUnlocked && (
        <p className="text-center text-[9px] font-black text-zinc-700 uppercase tracking-[0.3em]">
          Master Admin Authorization Required to Modify System Kernel
        </p>
      )}

      {/* Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/90 backdrop-blur-xl p-6">
           <div className="w-full max-w-md bg-[#121417] border border-white/5 rounded-3xl p-10 space-y-8">
              <div className="text-center space-y-2">
                 <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center text-white mx-auto mb-4">
                    <Lock size={32} />
                 </div>
                 <h2 className="text-xl font-black text-white uppercase tracking-tight">Admin Authorization</h2>
                 <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Enter Master System Password</p>
              </div>
              
              <input 
                type="password"
                autoFocus
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleUnlock()}
                className="w-full bg-black/40 border border-white/5 rounded-xl px-6 py-4 text-center text-2xl font-bold text-white focus:border-[#EF4444] outline-none transition-all"
              />

              <div className="flex gap-4">
                 <button 
                   onClick={() => setShowPasswordModal(false)}
                   className="flex-1 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-white transition-colors"
                 >
                   Abort
                 </button>
                 <button 
                   onClick={handleUnlock}
                   disabled={verifying}
                   className="flex-1 py-4 bg-[#EF4444] text-white rounded-xl font-black uppercase text-[10px] tracking-widest hover:opacity-90 transition-opacity flex items-center justify-center"
                 >
                   {verifying ? <Loader2 className="animate-spin" /> : 'Unlock Protocol'}
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* Soft Reset Modal */}
      {showSoftResetModal && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/90 backdrop-blur-xl p-6">
           <div className="w-full max-w-md bg-[#121417] border border-white/5 rounded-3xl p-10 space-y-8">
              <div className="text-center space-y-2">
                 <div className="w-16 h-16 bg-[#EF4444]/10 rounded-2xl flex items-center justify-center text-[#EF4444] mx-auto mb-4">
                    <RotateCcw size={32} />
                 </div>
                 <h2 className="text-xl font-black text-white uppercase tracking-tight">Confirm Shift Change</h2>
                 <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Wiping ledger and CCTV evidence</p>
              </div>
              
              <p className="text-[11px] text-zinc-400 text-center leading-relaxed font-medium">
                This will clear all transactions and recorded video snippets from the current shift. 
                <span className="text-white"> System settings will remain active.</span>
              </p>

              <div className="flex gap-4">
                 <button 
                   onClick={() => setShowSoftResetModal(false)}
                   className="flex-1 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-white transition-colors"
                 >
                   Abort
                 </button>
                 <button 
                   onClick={handleSoftReset}
                   disabled={processing}
                   className="flex-1 py-4 bg-white text-black rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-[#EF4444] hover:text-white transition-all flex items-center justify-center"
                 >
                   {processing ? <Loader2 className="animate-spin" /> : 'Confirm Reset'}
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* Hard Reset Modal */}
      {showHardResetModal && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center bg-[#1A0A0A]/95 backdrop-blur-2xl p-6">
           <div className="w-full max-w-lg bg-[#121417] border border-[#EF4444]/30 rounded-3xl p-10 space-y-8 shadow-[0_0_100px_rgba(239,68,68,0.2)]">
              <div className="text-center space-y-4">
                 <div className="w-20 h-20 bg-[#EF4444]/10 rounded-full flex items-center justify-center text-[#EF4444] mx-auto animate-pulse">
                    <AlertTriangle size={40} />
                 </div>
                 <h2 className="text-2xl font-black text-white uppercase tracking-tighter">System Annihilation</h2>
                 <p className="text-xs text-[#EF4444] font-bold uppercase tracking-widest">Warning: This action is irreversible.</p>
                 <p className="text-[10px] text-zinc-500 font-medium leading-relaxed px-6">
                   All data from the <span className="text-white">SQLite Ledger</span>, <span className="text-white">Node Registry</span>, 
                   and <span className="text-white">CCTV Evidence snippets</span> will be permanently deleted.
                 </p>
              </div>

              <div className="p-6 bg-black/40 rounded-2xl border border-white/5 space-y-6 text-center">
                 <div className="space-y-1">
                    <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Verification Handshake</p>
                    <p className="text-4xl font-black text-white tracking-[0.3em] font-mono">{verificationCode}</p>
                 </div>
                 
                 <input 
                   type="text"
                   autoFocus
                   maxLength={6}
                   placeholder="TYPE CODE"
                   value={userCode}
                   onChange={(e) => setUserCode(e.target.value.replace(/\D/g, ''))}
                   className="w-full bg-black/40 border border-[#EF4444]/20 rounded-xl px-6 py-4 text-center text-xl font-black text-white placeholder:text-zinc-800 focus:border-[#EF4444] outline-none transition-all"
                 />
              </div>

              <div className="flex gap-4">
                 <button 
                   onClick={() => setShowHardResetModal(false)}
                   className="flex-1 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-white transition-colors"
                 >
                   Abort Reset
                 </button>
                 <button 
                   disabled={userCode !== verificationCode || processing}
                   onClick={handleHardReset}
                   className="flex-1 py-5 bg-[#EF4444] text-white rounded-xl font-black uppercase text-[10px] tracking-widest hover:opacity-90 transition-opacity flex items-center justify-center shadow-[0_0_40px_rgba(239,68,68,0.3)] disabled:opacity-20"
                 >
                   {processing ? <Loader2 className="animate-spin" /> : 'Confirm Annihilation'}
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* OTA Deploy Modal */}
      {showDeployModal && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/90 backdrop-blur-xl p-6">
           <div className="w-full max-w-md bg-[#121417] border border-blue-500/20 rounded-3xl p-10 space-y-8 shadow-[0_0_80px_rgba(59,130,246,0.1)]">
              <div className="text-center space-y-2">
                 <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-500 mx-auto mb-4">
                    <UploadCloud size={32} />
                 </div>
                 <h2 className="text-xl font-black text-white uppercase tracking-tight">Deploy App Update</h2>
                 <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Push OTA to paired nodes</p>
              </div>
              
              <div className="space-y-4">
                <div>
                   <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 block">Version String</label>
                   <input 
                     type="text"
                     placeholder="e.g. 1.0.42"
                     value={versionString}
                     onChange={(e) => setVersionString(e.target.value)}
                     className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-sm font-bold text-white focus:border-blue-500 outline-none transition-all"
                   />
                </div>
                
                <div>
                   <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 block">APK File</label>
                   <input 
                     type="file"
                     accept=".apk"
                     onChange={(e) => setApkFile(e.target.files?.[0] || null)}
                     className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-sm font-bold text-zinc-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-[10px] file:font-black file:uppercase file:tracking-widest file:bg-blue-500/20 file:text-blue-400 hover:file:bg-blue-500/30 transition-all outline-none"
                   />
                </div>

                {uploadResult && (
                  <div className={cn("p-4 rounded-xl border text-[11px] font-bold", uploadResult.success ? "bg-green-500/10 border-green-500/20 text-green-400" : "bg-red-500/10 border-red-500/20 text-red-400")}>
                    {uploadResult.success ? (
                      <div className="space-y-1">
                        <div className="flex items-center gap-2"><CheckCircle2 size={14} /> Deployment Successful</div>
                        <div className="font-mono text-[9px] text-zinc-500 break-all">SHA-256: {uploadResult.hash}</div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2"><AlertTriangle size={14} /> {uploadResult.error}</div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex gap-4 pt-4 border-t border-white/5">
                 <button 
                   onClick={() => {
                     setShowDeployModal(false);
                     setUploadResult(null);
                     setApkFile(null);
                     setVersionString('');
                   }}
                   className="flex-1 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-white transition-colors"
                 >
                   Close
                 </button>
                 <button 
                   onClick={handleDeployUpload}
                   disabled={uploadProgress || !apkFile || !versionString}
                   className="flex-1 py-4 bg-blue-500 text-white rounded-xl font-black uppercase text-[10px] tracking-widest hover:opacity-90 transition-opacity flex items-center justify-center disabled:opacity-20 disabled:cursor-not-allowed shadow-[0_0_30px_rgba(59,130,246,0.3)]"
                 >
                   {uploadProgress ? <Loader2 className="animate-spin" /> : 'Push to Nodes'}
                 </button>
              </div>
           </div>
        </div>
      )}

    </div>
  );
}
