import React from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { motion } from 'motion/react';

export default function Login() {
  const { user, login } = useAuth();

  if (user) {
    return <Navigate to="/dashboard" />;
  }

  return (
    <div className="min-h-screen bg-background text-on-surface flex flex-col items-center justify-center p-6 max-w-md mx-auto relative overflow-hidden">
      {/* Dynamic Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-64 h-64 bg-primary/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-64 h-64 bg-tertiary/10 rounded-full blur-[120px]" />
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full z-10 space-y-10"
      >
        <div className="text-center space-y-4">
          <motion.div 
            initial={{ y: -20 }}
            animate={{ y: 0 }}
            className="w-20 h-20 bg-surface-container rounded-3xl mx-auto flex items-center justify-center border border-outline-variant shadow-xl relative group"
          >
            <span className="material-symbols-outlined text-primary text-4xl group-hover:scale-110 transition-transform">clinical_notes</span>
            <div className="absolute inset-0 bg-primary/5 rounded-3xl animate-pulse" />
          </motion.div>
          
          <div>
            <h1 className="text-3xl font-black tracking-tighter text-on-surface">Clinical Portal</h1>
            <p className="text-sm text-on-surface-variant font-medium mt-1">MamaTrack Health Systems</p>
          </div>
        </div>

        <div className="bg-surface-container-high/50 backdrop-blur-xl border border-outline-variant/30 rounded-[2.5rem] p-8 shadow-2xl space-y-8">
          <div className="space-y-2">
            <h2 className="text-xl font-bold">Sign In</h2>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              Access secure maternal health records with institutional-grade authentication.
            </p>
          </div>

          <div className="space-y-4">
            <button 
              onClick={login}
              className="w-full h-14 bg-primary text-background font-bold rounded-2xl flex items-center justify-center gap-3 active:scale-95 transition-all shadow-lg hover:shadow-primary/20"
            >
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Continue with Provider
            </button>

            <div className="flex items-center gap-4 py-2">
              <div className="h-px bg-outline-variant/30 flex-1" />
              <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">or email access</span>
              <div className="h-px bg-outline-variant/30 flex-1" />
            </div>

            <div className="space-y-4 opacity-50 pointer-events-none">
              <div className="space-y-1">
                <div className="h-12 bg-surface-container rounded-xl border border-outline-variant/30 flex items-center px-4 text-sm text-on-surface-variant italic">
                  Institutional Email
                </div>
              </div>
              <div className="space-y-1">
                <div className="h-12 bg-surface-container rounded-xl border border-outline-variant/30 flex items-center px-4 text-sm text-on-surface-variant italic">
                  Password
                </div>
              </div>
            </div>
            
            <p className="text-[10px] text-center text-on-surface-variant px-4">
              Authorized personnel only. All access is logged and audited according to clinical compliance standards.
            </p>
          </div>
        </div>

        <div className="flex flex-col items-center gap-4 text-[10px] text-on-surface-variant font-bold uppercase tracking-[0.2em] pt-4">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[10px]">lock</span>
            End-to-End Encryption
          </div>
          <p>© 2026 MamaTrack Global Health</p>
        </div>
      </motion.div>
    </div>
  );
}
