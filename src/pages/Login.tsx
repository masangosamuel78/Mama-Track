import React, { useEffect, useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { calculateEDD, calculateWeeks } from '../lib/pregnancy';

export default function Login() {
  const { user, login, loginWithEmail, signupPatient } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  // Login Form States
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Sign Up Form States for Pregnant Woman
  const [signUpData, setSignUpData] = useState({
    email: '',
    password: '',
    fullName: '',
    age: '',
    phoneNumber: '',
    location: '',
    bloodType: 'O Positive',
    assignedMidwifeId: '',
    lmpDate: '',
    eddDate: '',
    eddOverridden: false
  });

  const [midwives, setMidwives] = useState<any[]>([]);

  // Fetch midwives when sign up is shown
  useEffect(() => {
    async function fetchMidwives() {
      try {
        const querySnapshot = await getDocs(collection(db, 'midwives'));
        const mList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setMidwives(mList);
        if (mList.length > 0 && !signUpData.assignedMidwifeId) {
          setSignUpData(prev => ({ ...prev, assignedMidwifeId: mList[0].id }));
        }
      } catch (err) {
        console.error('Error fetching midwives:', err);
      }
    }
    if (isSignUp) {
      fetchMidwives();
    }
  }, [isSignUp]);

  // Handle LMP Change for EDD calculation
  useEffect(() => {
    if (signUpData.lmpDate && !signUpData.eddOverridden) {
      const computedEdd = calculateEDD(signUpData.lmpDate);
      setSignUpData(prev => ({ ...prev, eddDate: computedEdd }));
    }
  }, [signUpData.lmpDate, signUpData.eddOverridden]);

  const computedWeeks = signUpData.lmpDate ? calculateWeeks(signUpData.lmpDate) : 0;

  if (user) {
    return <Navigate to="/dashboard" />;
  }

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    try {
      await loginWithEmail(loginEmail, loginPassword);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Incorrect password or user not found.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signUpData.email || !signUpData.password || !signUpData.fullName) {
      setErrorMsg('Please fill in Name, Email and Password.');
      return;
    }
    if (!signUpData.assignedMidwifeId) {
      setErrorMsg('Please select an assigned midwife.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    try {
      const selectedMidwife = midwives.find(m => m.id === signUpData.assignedMidwifeId);
      
      const payload = {
        fullName: signUpData.fullName,
        age: Number(signUpData.age) || 25,
        phoneNumber: signUpData.phoneNumber || 'N/A',
        location: signUpData.location || 'N/A',
        bloodType: signUpData.bloodType,
        assignedMidwifeId: signUpData.assignedMidwifeId,
        assignedMidwifeName: selectedMidwife?.fullName || 'Assigned Midwife',
        lmpDate: signUpData.lmpDate || new Date().toISOString().split('T')[0],
        eddDate: signUpData.eddDate || new Date().toISOString().split('T')[0],
        eddOverridden: signUpData.eddOverridden,
        weekOfPregnancy: computedWeeks,
        riskLevel: 'low',
        riskScore: 0,
      };

      await signupPatient(signUpData.email, signUpData.password, payload);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Error occurred during registration.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-on-surface flex flex-col items-center justify-center p-4 max-w-md mx-auto relative overflow-hidden">
      {/* Background Decorative Glow */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-64 h-64 bg-primary/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-64 h-64 bg-tertiary/10 rounded-full blur-[100px]" />
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="w-full z-10 space-y-6"
      >
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-surface-container rounded-3xl mx-auto flex items-center justify-center border border-outline-variant shadow-xl relative group">
            <span className="material-symbols-outlined text-primary text-3xl group-hover:scale-110 transition-transform">clinical_notes</span>
            <div className="absolute inset-0 bg-primary/5 rounded-3xl animate-pulse" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tighter text-on-surface">MamaTrack Health</h1>
            <p className="text-xs text-on-surface-variant font-medium">Unified Pregnancy Care Network</p>
          </div>
        </div>

        {/* Toggle between Sign In and Sign Up */}
        <div className="bg-surface-container p-1 rounded-2xl flex border border-outline-variant/30">
          <button 
            type="button"
            onClick={() => { setIsSignUp(false); setErrorMsg(''); }}
            className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider rounded-xl transition-all ${!isSignUp ? 'bg-primary text-background shadow-md' : 'text-on-surface-variant'}`}
          >
            Sign In
          </button>
          <button 
            type="button"
            onClick={() => { setIsSignUp(true); setErrorMsg(''); }}
            className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider rounded-xl transition-all ${isSignUp ? 'bg-primary text-background shadow-md' : 'text-on-surface-variant'}`}
          >
            Woman Sign Up
          </button>
        </div>

        {errorMsg && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-error-container/20 border border-error/30 rounded-2xl text-xs text-error font-bold flex gap-3"
          >
            <span className="material-symbols-outlined text-sm shrink-0">error</span>
            <span>{errorMsg}</span>
          </motion.div>
        )}

        <div className="bg-surface-container-high/50 backdrop-blur-xl border border-outline-variant/30 rounded-[2rem] p-6 shadow-2xl">
          <AnimatePresence mode="wait">
            {!isSignUp ? (
              <motion.form 
                key="signin"
                initial={{ opacity: 0, x: -15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 15 }}
                onSubmit={handleLoginSubmit}
                className="space-y-4"
              >
                <div className="space-y-1">
                  <h2 className="text-lg font-bold">Sign In to Dashboard</h2>
                  <p className="text-[11px] text-on-surface-variant">Admin, Midwife, or Pregnant Woman login</p>
                </div>

                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold tracking-widest text-on-surface-variant ml-2">Email Address</label>
                    <input 
                      type="email"
                      required
                      placeholder="nurse@clinic.org or user@email.com"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      className="w-full bg-surface-container border border-outline-variant/30 rounded-xl py-3 px-4 focus:border-primary focus:outline-none text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold tracking-widest text-on-surface-variant ml-2">Password</label>
                    <input 
                      type="password"
                      required
                      placeholder="******"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="w-full bg-surface-container border border-outline-variant/30 rounded-xl py-3 px-4 focus:border-primary focus:outline-none text-sm"
                    />
                  </div>
                </div>

                <button 
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 bg-primary text-background font-bold rounded-xl flex items-center justify-center gap-2 mt-6 active:scale-95 transition-transform"
                >
                  {loading ? 'Authenticating...' : 'Sign In'}
                  <span className="material-symbols-outlined text-sm">login</span>
                </button>

                <div className="flex items-center gap-4 py-3">
                  <div className="h-px bg-outline-variant/30 flex-1" />
                  <span className="text-[9px] font-bold text-on-surface-variant uppercase tracking-widest">or single sign-on</span>
                  <div className="h-px bg-outline-variant/30 flex-1" />
                </div>

                <button 
                  type="button"
                  onClick={login}
                  className="w-full h-12 bg-surface-container hover:bg-surface-container-high text-on-surface border border-outline-variant/30 font-bold rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-transform text-xs"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                  Login with Google
                </button>

                <div className="bg-primary/5 p-3 rounded-xl space-y-1 text-[10px] text-primary/80 border border-primary/10">
                  <div className="font-bold">🔑 Testing Credentials:</div>
                  <div>• **Admin**: `admin@mamatrack.com` / `admin123`</div>
                  <div>• **Sample Midwife**: created by admin in Dashboard</div>
                </div>
              </motion.form>
            ) : (
              <motion.form 
                key="signup"
                initial={{ opacity: 0, x: 15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -15 }}
                onSubmit={handleSignUpSubmit}
                className="space-y-4 max-h-[60vh] overflow-y-auto pr-1 no-scrollbar"
              >
                <div className="space-y-1">
                  <h2 className="text-lg font-bold">Women Self-Registration</h2>
                  <p className="text-[11px] text-on-surface-variant">Create details and calculate pregnancy metrics</p>
                </div>

                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold tracking-widest text-on-surface-variant ml-1">Full Name</label>
                    <input 
                      type="text"
                      required
                      placeholder="Jane Doe"
                      value={signUpData.fullName}
                      onChange={(e) => setSignUpData({ ...signUpData, fullName: e.target.value })}
                      className="w-full bg-surface-container border border-outline-variant/30 rounded-xl py-3 px-4 focus:border-primary focus:outline-none text-sm"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold tracking-widest text-on-surface-variant ml-1">Email</label>
                      <input 
                        type="email"
                        required
                        placeholder="jane@email.com"
                        value={signUpData.email}
                        onChange={(e) => setSignUpData({ ...signUpData, email: e.target.value })}
                        className="w-full bg-surface-container border border-outline-variant/30 rounded-xl py-3 px-4 focus:border-primary focus:outline-none text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold tracking-widest text-on-surface-variant ml-1">Password</label>
                      <input 
                        type="password"
                        required
                        placeholder="******"
                        value={signUpData.password}
                        onChange={(e) => setSignUpData({ ...signUpData, password: e.target.value })}
                        className="w-full bg-surface-container border border-outline-variant/30 rounded-xl py-3 px-4 focus:border-primary focus:outline-none text-sm"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold tracking-widest text-on-surface-variant ml-1">Age</label>
                      <input 
                        type="number"
                        placeholder="28"
                        value={signUpData.age}
                        onChange={(e) => setSignUpData({ ...signUpData, age: e.target.value })}
                        className="w-full bg-surface-container border border-outline-variant/30 rounded-xl py-3 px-4 focus:border-primary focus:outline-none text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold tracking-widest text-on-surface-variant ml-1">Telephone</label>
                      <input 
                        type="tel"
                        placeholder="+254 712..."
                        value={signUpData.phoneNumber}
                        onChange={(e) => setSignUpData({ ...signUpData, phoneNumber: e.target.value })}
                        className="w-full bg-surface-container border border-outline-variant/30 rounded-xl py-3 px-4 focus:border-primary focus:outline-none text-sm"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold tracking-widest text-on-surface-variant ml-1">Location / Village</label>
                    <input 
                      type="text"
                      placeholder="Mwanzo Village"
                      value={signUpData.location}
                      onChange={(e) => setSignUpData({ ...signUpData, location: e.target.value })}
                      className="w-full bg-surface-container border border-outline-variant/30 rounded-xl py-3 px-4 focus:border-primary focus:outline-none text-sm"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold tracking-widest text-on-surface-variant ml-1">Blood Type</label>
                    <select 
                      value={signUpData.bloodType}
                      onChange={(e) => setSignUpData({ ...signUpData, bloodType: e.target.value })}
                      className="w-full bg-surface-container border border-outline-variant/30 rounded-xl py-3 px-4 focus:border-primary focus:outline-none text-sm"
                    >
                      <option value="A Positive">A Positive (A+)</option>
                      <option value="A Negative">A Negative (A-)</option>
                      <option value="B Positive">B Positive (B+)</option>
                      <option value="B Negative">B Negative (B-)</option>
                      <option value="O Positive">O Positive (O+)</option>
                      <option value="O Negative">O Negative (O-)</option>
                    </select>
                  </div>

                  {/* Midwife Selection */}
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold tracking-widest text-on-surface-variant ml-1">Assigned Midwife</label>
                    <select 
                      required
                      value={signUpData.assignedMidwifeId}
                      onChange={(e) => setSignUpData({ ...signUpData, assignedMidwifeId: e.target.value })}
                      className="w-full bg-surface-container border border-outline-variant/30 rounded-xl py-3 px-4 focus:border-primary focus:outline-none text-sm appearance-none"
                    >
                      <option value="">Select a midwife...</option>
                      {midwives.map(m => (
                        <option key={m.id} value={m.id}>{m.fullName} ({m.clinic || 'General Clinic'})</option>
                      ))}
                    </select>
                  </div>

                  {/* LMP Date */}
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold tracking-widest text-on-surface-variant ml-1">Last Menstrual Period (LMP)</label>
                    <input 
                      type="date"
                      required
                      value={signUpData.lmpDate}
                      onChange={(e) => setSignUpData({ ...signUpData, lmpDate: e.target.value })}
                      className="w-full bg-surface-container border border-outline-variant/30 rounded-xl py-3 px-4 focus:border-primary focus:outline-none text-sm"
                    />
                  </div>

                  {signUpData.lmpDate && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="bg-primary/10 p-4 rounded-xl space-y-1 border border-primary/20"
                    >
                      <span className="text-[9px] font-black uppercase tracking-wider text-primary">Live Calculator Metrics</span>
                      <div className="text-xl font-bold">Week {computedWeeks} of Pregnancy</div>
                      <p className="text-[10px] text-on-surface-variant">Due date calculated automatically.</p>
                    </motion.div>
                  )}

                  {/* Override Toggle & Picker */}
                  <div className="bg-surface-container rounded-xl p-3 border border-outline-variant/30 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold">Manual EDD Override</div>
                      <div className="text-[9px] text-on-surface-variant">Manually tweak estimated due date</div>
                    </div>
                    <input 
                      type="checkbox"
                      checked={signUpData.eddOverridden}
                      onChange={(e) => setSignUpData({ ...signUpData, eddOverridden: e.target.checked })}
                      className="w-4 h-4 accent-primary"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold tracking-widest text-on-surface-variant ml-1">Estimated Due Date (EDD)</label>
                    <input 
                      type="date"
                      value={signUpData.eddDate}
                      onChange={(e) => setSignUpData({ ...signUpData, eddDate: e.target.value })}
                      disabled={!signUpData.eddOverridden}
                      className={`w-full bg-surface-container border rounded-xl py-3 px-4 focus:outline-none text-sm ${signUpData.eddOverridden ? 'border-primary' : 'border-outline-variant/30 text-on-surface-variant opacity-60 pointer-events-none'}`}
                    />
                  </div>
                </div>

                <button 
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 bg-primary text-background font-bold rounded-xl flex items-center justify-center gap-2 mt-6 active:scale-95 transition-transform"
                >
                  {loading ? 'Registering Your File...' : 'Agree & Create Account'}
                  <span className="material-symbols-outlined text-sm">how_to_reg</span>
                </button>
              </motion.form>
            )}
          </AnimatePresence>
        </div>

        <p className="text-[9px] text-center text-on-surface-variant/40 tracking-wider">
          © 2026 MamaTrack Global Inc. Institutional clinical compliance verified.
        </p>
      </motion.div>
    </div>
  );
}
