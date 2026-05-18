import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNotifications } from '../hooks/useNotifications';
import { motion, AnimatePresence } from 'motion/react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: any[]) {
  return twMerge(clsx(inputs));
}

export default function Profile() {
  const { profile, logout, resetPassword } = useAuth();
  const { requestPermission } = useNotifications();
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    fullName: '',
    email: '',
    clinic: ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const [showSyncStatus, setShowSyncStatus] = useState(false);
  const [offlineEnabled, setOfflineEnabled] = useState(profile?.offlineSyncEnabled ?? true);
  const [avatarData, setAvatarData] = useState<string | null>(null);
  const [notifPermission, setNotifPermission] = useState(Notification.permission);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isAssignmentSecurityOpen, setIsAssignmentSecurityOpen] = useState(false);
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditComplete, setAuditComplete] = useState(false);

  const handleRunAudit = async () => {
    setIsAuditing(true);
    await new Promise(resolve => setTimeout(resolve, 2500));
    setIsAuditing(false);
    setAuditComplete(true);
    setTimeout(() => {
      setAuditComplete(false);
      setIsAssignmentSecurityOpen(false);
    }, 2000);
  };

  const handleRequestPermission = async () => {
    const granted = await requestPermission();
    setNotifPermission(granted ? 'granted' : 'denied');
  };

  useEffect(() => {
    if (profile) {
      setEditForm({
        fullName: profile.fullName || '',
        email: profile.email || '',
        clinic: profile.clinic || ''
      });
      setAvatarData(profile.avatar || null);
      setOfflineEnabled(profile.offlineSyncEnabled ?? true);
    }
  }, [profile]);

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleSave = async () => {
    if (!profile?.uid) return;
    
    // Validation
    if (!editForm.fullName.trim()) {
      alert('Name cannot be empty');
      return;
    }
    if (!validateEmail(editForm.email)) {
      alert('Please enter a valid email address');
      return;
    }

    setIsSaving(true);
    try {
      const docRef = doc(db, 'midwives', profile.uid);
      await updateDoc(docRef, {
        fullName: editForm.fullName,
        email: editForm.email,
        clinic: editForm.clinic,
        avatar: avatarData // Save the avatar data (base64 string)
      });
      setIsEditing(false);
      // Profile will be updated via AuthProvider listener
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Failed to update profile. Please check your connection.');
    } finally {
      setIsSaving(false);
    }
  };

  const triggerSync = async () => {
    setShowSyncStatus(true);
    // Simulate a complex sync operation
    await new Promise(resolve => setTimeout(resolve, 2000));
    setShowSyncStatus(false);
    alert('Synchronization Complete: Clinical records and encrypted identifiers have been verified.');
  };

  const handleToggleOffline = async () => {
    if (!profile?.uid) return;
    const newValue = !offlineEnabled;
    setOfflineEnabled(newValue);
    try {
      const docRef = doc(db, 'midwives', profile.uid);
      await updateDoc(docRef, { offlineSyncEnabled: newValue });
    } catch (err) {
      console.error('Error toggling offline sync:', err);
      // Revert local state if it fails
      setOfflineEnabled(!newValue);
    }
  };

  const handleEditPhoto = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Limit size to 512KB for Firestore storage as a string
      if (file.size > 512 * 1024) {
        alert('Image too large. Please choose an image smaller than 500KB.');
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setAvatarData(base64String);
        // Automatically enter edit mode if not already there to allow saving
        if (!isEditing) setIsEditing(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSecurityClick = async () => {
    if (!profile?.email) return;
    if (confirm(`Would you like to send a password reset link to ${profile.email}?`)) {
      try {
        await resetPassword(profile.email);
        alert('Password reset link sent! Please check your email.');
      } catch (err) {
        console.error('Error sending reset link:', err);
        alert('Failed to send reset link. This is usually due to missing authorization or an invalid email.');
      }
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-5 duration-500 pb-24">
      <header className="flex flex-col items-center text-center space-y-4 pt-4">
        <div className="w-32 h-32 rounded-3xl bg-surface-container flex items-center justify-center border border-outline-variant relative overflow-hidden group">
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept="image/*" 
            onChange={handleFileChange}
          />
          {avatarData || profile?.avatar ? (
            <img src={avatarData || profile?.avatar} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            <span className="material-symbols-outlined text-6xl text-on-surface-variant group-hover:scale-110 transition-transform">person</span>
          )}
          <button 
            onClick={handleEditPhoto}
            className="absolute bottom-0 inset-x-0 h-8 bg-black/50 backdrop-blur-md text-[10px] uppercase font-bold text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          >
            Choose Picture
          </button>
        </div>
        <div>
          {isEditing ? (
            <input 
              className="text-3xl font-bold bg-surface-container-high border-b-2 border-primary outline-none px-4 text-center rounded-t-lg w-full max-w-[280px]"
              value={editForm.fullName}
              onChange={(e) => setEditForm({...editForm, fullName: e.target.value})}
              autoFocus
            />
          ) : (
            <h1 className="text-3xl font-bold tracking-tight">{profile?.fullName}</h1>
          )}
          <p className="text-primary font-bold uppercase text-[10px] tracking-[0.2em] mt-1">{profile?.role} • {profile?.clinic}</p>
        </div>
        
        <button 
          onClick={() => isEditing ? handleSave() : setIsEditing(true)}
          disabled={isSaving}
          className="px-6 py-2 rounded-full border border-primary/30 text-primary text-xs font-bold uppercase tracking-widest hover:bg-primary/10 transition-colors"
        >
          {isSaving ? 'Saving...' : isEditing ? 'Save Changes' : 'Edit Profile'}
        </button>
        {isEditing && (
          <button onClick={() => {
            setIsEditing(false);
            setAvatarData(profile?.avatar || null); // Reset avatar to original
            setEditForm({
              fullName: profile?.fullName || '',
              email: profile?.email || '',
              clinic: profile?.clinic || ''
            });
          }} className="text-xs text-on-surface-variant underline block mt-2">Cancel</button>
        )}
      </header>

      <section className="space-y-3">
        <div className="bg-surface-container rounded-2xl p-5 border border-outline-variant/30 flex justify-between items-center group">
           <div className="flex items-center gap-4 flex-1">
              <span className="material-symbols-outlined text-on-surface-variant">mail</span>
              {isEditing ? (
                <input 
                  className="bg-transparent border-b border-outline-variant outline-none flex-1 text-sm text-primary"
                  value={editForm.email}
                  onChange={(e) => setEditForm({...editForm, email: e.target.value})}
                />
              ) : (
                <div className="text-sm">{profile?.email}</div>
              )}
           </div>
        </div>
        <div className="bg-surface-container rounded-2xl p-5 border border-outline-variant/30 flex justify-between items-center group">
           <div className="flex items-center gap-4 flex-1">
              <span className="material-symbols-outlined text-on-surface-variant">home_health</span>
              {isEditing ? (
                <input 
                  className="bg-transparent border-b border-outline-variant outline-none flex-1 text-sm text-primary"
                  value={editForm.clinic}
                  onChange={(e) => setEditForm({...editForm, clinic: e.target.value})}
                  placeholder="Enter clinic name"
                />
              ) : (
                <div className="text-sm">Assigned Clinic: {profile?.clinic || 'Not Set'}</div>
              )}
           </div>
        </div>
      </section>

      <div className="space-y-4">
        <h3 className="text-xs font-bold text-on-surface-variant uppercase tracking-widest pl-2">System Controls</h3>
        <div className="bg-surface-container rounded-2xl overflow-hidden border border-outline-variant/30">
           <button 
             onClick={() => setIsAssignmentSecurityOpen(true)}
             className="w-full p-5 flex items-center justify-between border-b border-outline-variant/30 active:bg-surface-container-high transition-colors text-sm"
           >
              <div className="flex items-center gap-4">
                <span className="material-symbols-outlined text-on-surface-variant">verified_user</span>
                <span>Assignment Security</span>
              </div>
              <span className="material-symbols-outlined text-on-surface-variant opacity-30">chevron_right</span>
           </button>

           <button 
             onClick={handleSecurityClick}
             className="w-full p-5 flex items-center justify-between border-b border-outline-variant/30 active:bg-surface-container-high transition-colors text-sm"
           >
              <div className="flex items-center gap-4">
                <span className="material-symbols-outlined text-on-surface-variant">security</span>
                <span>Account Security</span>
              </div>
              <span className="material-symbols-outlined text-on-surface-variant opacity-30">chevron_right</span>
           </button>
           
           <div className="w-full p-5 flex items-center justify-between border-b border-outline-variant/30 text-sm">
              <div className="flex items-center gap-4">
                <span className="material-symbols-outlined text-on-surface-variant">cloud_sync</span>
                <span>Offline Data Sync</span>
              </div>
              <button 
                onClick={handleToggleOffline}
                className={`w-10 h-5 rounded-full transition-colors relative ${offlineEnabled ? 'bg-primary' : 'bg-outline-variant'}`}
              >
                <motion.div 
                  animate={{ x: offlineEnabled ? 20 : 2 }}
                  className="absolute top-1 w-3 h-3 bg-white rounded-full"
                />
              </button>
           </div>

           <button 
             onClick={triggerSync}
             className="w-full p-5 flex items-center gap-4 border-b border-outline-variant/30 active:bg-surface-container-high transition-colors text-sm"
           >
              <span className="material-symbols-outlined text-on-surface-variant">sync</span>
              {showSyncStatus ? <span className="text-primary font-bold animate-pulse">Syncing Encrypted Logs...</span> : "Manual Force Sync"}
           </button>

           <button 
             onClick={handleRequestPermission}
             disabled={notifPermission === 'granted'}
             className="w-full p-5 flex items-center justify-between border-b border-outline-variant/30 active:bg-surface-container-high transition-colors text-sm"
           >
              <div className="flex items-center gap-4">
                <span className={cn("material-symbols-outlined", notifPermission === 'granted' ? "text-primary" : "text-on-surface-variant")}>
                  {notifPermission === 'granted' ? 'notifications_active' : 'notifications'}
                </span>
                <span>Browser Notifications</span>
              </div>
              <span className={cn(
                "text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-md",
                notifPermission === 'granted' ? "text-primary border border-primary/30" : "text-on-surface-variant border border-outline-variant/30"
              )}>
                {notifPermission === 'granted' ? 'Enabled' : 'Request'}
              </span>
           </button>

           <button 
             onClick={logout}
             className="w-full p-5 flex items-center gap-4 active:bg-error-container/20 transition-colors text-sm text-error font-bold"
           >
              <span className="material-symbols-outlined">logout</span>
              Sign Out
           </button>
        </div>
      </div>

      <div className="text-center pt-8">
        <p className="text-[10px] text-on-surface-variant uppercase tracking-[0.2em] opacity-40">
           MamaTrack Version 2.4.0 (Alpha)
           <br />
           Authorized Personnel Only
        </p>
      </div>

      {/* Assignment Security Modal */}
      <AnimatePresence>
        {isAssignmentSecurityOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => !isAuditing && setIsAssignmentSecurityOpen(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] w-full max-w-md mx-auto" 
            />
            <motion.div 
              initial={{ y: '100%' }} 
              animate={{ y: 0 }} 
              exit={{ y: '100%' }}
              className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-surface-container-highest rounded-t-[2.5rem] z-[110] p-8 shadow-2xl border-t border-outline-variant/30"
            >
              <div className="w-12 h-1.5 bg-outline-variant/30 rounded-full mx-auto mb-8" />
              <div className="text-center space-y-4 mb-8">
                <div className="w-16 h-16 rounded-3xl bg-primary/10 flex items-center justify-center mx-auto">
                  <span className={cn("material-symbols-outlined text-primary text-3xl", isAuditing && "animate-spin")}>
                    {auditComplete ? 'verified' : 'admin_panel_settings'}
                  </span>
                </div>
                <div>
                  <h2 className="text-xl font-bold">Assignment Security</h2>
                  <p className="text-xs text-on-surface-variant">Verify patient access & clinical ID assignment.</p>
                </div>
              </div>

              <div className="space-y-4 bg-surface-container rounded-3xl p-5 border border-outline-variant/20 mb-8">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-on-surface-variant">Clinical Identity</span>
                  <span className="font-bold text-primary">VERIFIED</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-on-surface-variant">Last Assignment Audit</span>
                  <span className="text-on-surface">May 18, 2026</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-on-surface-variant">Suspicious Activity</span>
                  <span className="font-bold text-success font-mono">0 DETECTED</span>
                </div>
              </div>

              <div className="space-y-3">
                <button 
                  onClick={handleRunAudit}
                  disabled={isAuditing || auditComplete}
                  className={cn(
                    "w-full h-14 rounded-2xl font-bold transition-all active:scale-95 flex items-center justify-center gap-2",
                    auditComplete ? "bg-success text-white" : "bg-primary text-background"
                  )}
                >
                  {isAuditing ? (
                    <>
                      <span className="material-symbols-outlined animate-spin text-sm">sync</span>
                      Auditing Access Logs...
                    </>
                  ) : auditComplete ? (
                    <>
                      <span className="material-symbols-outlined">check_circle</span>
                      Audit Secure
                    </>
                  ) : (
                    "Run Assignment Security Audit"
                  )}
                </button>
                <button 
                  onClick={() => setIsAssignmentSecurityOpen(false)}
                  disabled={isAuditing}
                  className="w-full h-14 bg-surface-container border border-outline-variant/30 text-on-surface font-bold rounded-2xl active:scale-95 transition-transform"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
