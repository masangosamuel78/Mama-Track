import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { motion } from 'motion/react';

export default function Landing() {
  const { user } = useAuth();

  if (user) {
    return <Navigate to="/dashboard" />;
  }

  return (
    <div className="min-h-screen bg-background text-on-surface flex flex-col items-center justify-center p-6 max-w-md mx-auto relative overflow-hidden">
      {/* Decorative Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-primary/10 rounded-full blur-[100px] pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center text-center space-y-10 z-10"
      >
        <div className="w-24 h-24 rounded-full bg-surface-container flex items-center justify-center border border-primary/30 relative">
          <span className="material-symbols-outlined text-primary text-5xl">maternal_health</span>
          <div className="absolute -top-1 -right-1 w-8 h-8 rounded-full bg-tertiary flex items-center justify-center text-background">
            <span className="material-symbols-outlined text-sm">security</span>
          </div>
        </div>

        <div className="space-y-4">
          <h1 className="text-4xl font-black tracking-tight leading-tight">
            MamaTrack <br />
            <span className="text-primary">Precision Care.</span>
          </h1>
          <p className="text-on-surface-variant max-w-[280px] mx-auto text-sm leading-relaxed">
            The next generation maternal health platform. Tracking progress, vitals, and AI-driven risk insights with clinical accuracy.
          </p>
        </div>

        <div className="w-full space-y-4">
          <Link 
            to="/login"
            className="w-full h-14 bg-primary text-background font-bold text-lg rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-transform shadow-lg"
          >
            Access Portal
            <span className="material-symbols-outlined">login</span>
          </Link>
          
          <div className="flex gap-4 justify-center">
            <div className="px-4 py-2 bg-surface-container rounded-full text-[10px] font-bold uppercase tracking-widest text-on-surface-variant border border-outline-variant/30">
              Clinical Grade
            </div>
            <div className="px-4 py-2 bg-surface-container rounded-full text-[10px] font-bold uppercase tracking-widest text-on-surface-variant border border-outline-variant/30">
              HIPAA Ready
            </div>
          </div>
        </div>

        <div className="pt-8 text-[10px] text-on-surface-variant uppercase tracking-[0.2em] opacity-40">
          Trusted by Midwives Worldwide
          <br />
          © 2026 MamaTrack Technologies
        </div>
      </motion.div>
    </div>
  );
}
