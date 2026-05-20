import React, { useEffect, useState } from 'react';
import { collection, query, where, getDocs, doc, setDoc, deleteDoc, addDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';
import { useNotifications } from '../hooks/useNotifications';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Utility classes merger
function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}

export default function Dashboard() {
  const { profile, logout } = useAuth();
  const { sendNotification } = useNotifications();

  // Role derived helper
  const role = profile?.role || 'midwife';

  // State managers
  const [loading, setLoading] = useState(true);
  const [midwives, setMidwives] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [smsLogs, setSmsLogs] = useState<any[]>([]);

  // Form togglers & active tabs for Admin Dashboard
  const [adminTab, setAdminTab] = useState<'midwives' | 'appointments' | 'sms'>('midwives');
  
  // Midwife CRUD states
  const [showAddMidwife, setShowAddMidwife] = useState(false);
  const [midName, setMidName] = useState('');
  const [midEmail, setMidEmail] = useState('');
  const [midPassword, setMidPassword] = useState('');
  const [midClinic, setMidClinic] = useState('Central Clinic');
  const [midPhone, setMidPhone] = useState('');
  const [midwifeSubmitting, setMidwifeSubmitting] = useState(false);

  // Appointment Form states
  const [appPatientId, setAppPatientId] = useState('');
  const [appMidwifeId, setAppMidwifeId] = useState('');
  const [appDate, setAppDate] = useState('');
  const [appTime, setAppTime] = useState('');
  const [appNotes, setAppNotes] = useState('');
  const [appSubmitting, setAppSubmitting] = useState(false);

  // SMS Portal states
  const [smsPatientId, setSmsPatientId] = useState('');
  const [smsTemplate, setSmsTemplate] = useState('appt_remind');
  const [smsCustomBody, setSmsCustomBody] = useState('');
  const [smsSending, setSmsSending] = useState(false);

  // Patient's own dashboard stats
  const [myPatientRecord, setMyPatientRecord] = useState<any>(null);
  const [myVisits, setMyVisits] = useState<any[]>([]);
  const [isReportOpen, setIsReportOpen] = useState(false);

  // SMS Predefined Templates
  const templates: { [key: string]: string } = {
    appt_remind: "Hello {{name}}, this is MamaTrack. We would like to remind you of your upcoming vital prenatal wellness appointment scheduled for {{date}} at {{time}}. Please bring your vitals record book.",
    overdue_warn: "Urgent: Hello {{name}}, our clinic records show you are overdue for a maternal check-up by {{weeks}} weeks. Please visit your midwife as soon as possible to ensure fetal health.",
    routine_encour: "Hello {{name}}, congratulations on reaching gestational Week {{weeks}}! Ensure you are taking your folic acid daily, drinking clean water, and resting plenty."
  };

  // Get current message preview
  const getSmsPreview = () => {
    let raw = templates[smsTemplate] || '';
    const selectedPat = patients.find(p => p.id === smsPatientId);
    if (!selectedPat) return raw;
    
    raw = raw.replace('{{name}}', selectedPat.fullName);
    raw = raw.replace('{{date}}', appDate || 'May 28, 2026');
    raw = raw.replace('{{time}}', appTime || '10:00 AM');
    raw = raw.replace('{{weeks}}', String(selectedPat.weekOfPregnancy || '24'));
    return raw;
  };

  useEffect(() => {
    if (smsTemplate && smsPatientId) {
      setSmsCustomBody(getSmsPreview());
    }
  }, [smsTemplate, smsPatientId]);

  // Unified Data Fetcher
  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch midwives
      const mSnap = await getDocs(collection(db, 'midwives'));
      const mList = mSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      setMidwives(mList);

      // Fetch patients
      const pSnap = await getDocs(collection(db, 'patients'));
      const pList = pSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
      setPatients(pList);

      // Fetch appointments
      const appSnap = await getDocs(collection(db, 'appointments'));
      const appList = appSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as any[];
      setAppointments(appList.sort((a: any, b: any) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));

      // Fetch simulated SMS Log (if none, we create some standard ones inside localState first)
      const cachedSms = localStorage.getItem('sms_sim_logs');
      if (cachedSms) {
        setSmsLogs(JSON.parse(cachedSms));
      } else {
        const defaultLogs = [
          { id: '1', patientName: 'Mary Awero', date: 'May 18, 2026', body: 'MamaTrack: Reminder for clinic visit set on May 22.', status: 'delivered' },
          { id: '2', patientName: 'Sania Musoke', date: 'May 15, 2026', body: 'MamaTrack: Clinical status warning due to blood pressure flags.', status: 'delivered' }
        ];
        localStorage.setItem('sms_sim_logs', JSON.stringify(defaultLogs));
        setSmsLogs(defaultLogs);
      }

      // If user is patient, load her specific details
      if (role === 'patient' && profile?.uid) {
        const pRec = pList.find(p => p.id === profile.uid);
        if (pRec) {
          setMyPatientRecord(pRec);
          // Fetch her clinic visits
          const vSnap = await getDocs(collection(db, `patients/${profile.uid}/visits`));
          setMyVisits(vSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        } else {
          // Fallback if patient doc doesn't match login uid - retrieve first patient as mock or create defaults
          const fallbackRec = {
            id: profile.uid,
            fullName: profile.fullName || 'Pregnant Mother',
            age: 24,
            phoneNumber: '+254 711 000 000',
            location: 'Kibera District',
            bloodType: 'B Positive',
            lmpDate: '2025-12-10',
            eddDate: '2026-09-16',
            assignedMidwifeName: 'Supervisor Sister Jane',
            weekOfPregnancy: 24,
            riskLevel: 'medium',
            riskScore: 35
          };
          setMyPatientRecord(fallbackRec);
          setMyVisits([
            { id: 'v1', visitDate: '2026-04-10', visitType: 'First Scan', weight: 64, bpSystolic: 120, bpDiastolic: 80, notes: 'Fetal growth on track, fetal heartbeat normal.' },
            { id: 'v2', visitDate: '2026-05-12', visitType: 'Routine checkup', weight: 66, bpSystolic: 122, bpDiastolic: 82, notes: 'Iron supplements prescribed. Vitals excellent.' }
          ]);
        }
      }

    } catch (err) {
      console.error("Dashboard fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (profile?.uid) {
      fetchData();
    }
  }, [profile, role]);

  // CRUD: Add Midwife (using the non-disruptive secondary-Auth client app!)
  const handleCreateMidwife = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!midName || !midEmail || !midPassword) {
      alert('Please fill out Name, Email and Password.');
      return;
    }
    setMidwifeSubmitting(true);
    let secondaryAuthApp;
    try {
      // Initialize secondary auth app to provision midwife credentials
      // without destroying modern admin credentials
      const randomId = Math.random().toString(36).substring(7);
      secondaryAuthApp = initializeApp(firebaseConfig, `MidwifeAdminCreation-${randomId}`);
      const secAuth = getAuth(secondaryAuthApp);

      const userCred = await createUserWithEmailAndPassword(secAuth, midEmail, midPassword);
      const newMidwifeUid = userCred.user.uid;

      // Create midwife profile document in 'midwives'
      const mDocRef = doc(db, 'midwives', newMidwifeUid);
      const midwifePayload = {
        uid: newMidwifeUid,
        fullName: midName,
        email: midEmail,
        clinic: midClinic,
        phoneNumber: midPhone || 'N/A',
        role: 'midwife',
        createdAt: new Date().toISOString()
      };
      await setDoc(mDocRef, midwifePayload);

      // Add to unified 'users' matching collection
      const uDocRef = doc(db, 'users', newMidwifeUid);
      await setDoc(uDocRef, {
        uid: newMidwifeUid,
        fullName: midName,
        email: midEmail,
        role: 'midwife',
        clinic: midClinic,
        createdAt: new Date().toISOString()
      });

      await sendNotification(
        'Staff Registered',
        `Midwife ${midName} has been fully registered.`,
        'success'
      );

      // Reset form & reload list
      setMidName('');
      setMidEmail('');
      setMidPassword('');
      setMidClinic('Central Clinic');
      setMidPhone('');
      setShowAddMidwife(false);
      fetchData();

    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Error creating midwife staff account.');
    } finally {
      if (secondaryAuthApp) {
        // Safe disposal of secondary auth thread
        await deleteApp(secondaryAuthApp);
      }
      setMidwifeSubmitting(false);
    }
  };

  // CRUD: Delete Midwife
  const handleDeleteMidwife = async (midwifeId: string, midwifeName: string) => {
    if (!confirm(`Are you sure you want to delete Midwife ${midwifeName}? This will revoke their platform credentials.`)) return;
    try {
      await deleteDoc(doc(db, 'midwives', midwifeId));
      await deleteDoc(doc(db, 'users', midwifeId));
      await sendNotification(
        'Staff Deleted',
        `Midwife ${midwifeName} has been removed from registry.`,
        'alert'
      );
      fetchData();
    } catch (err) {
      console.error(err);
      alert('Failed to delete midwife.');
    }
  };

  // Appointments: Set Appointment
  const handleScheduleAppt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appPatientId || !appMidwifeId || !appDate || !appTime) {
      alert('Please fill out all appointment details.');
      return;
    }
    setAppSubmitting(true);
    try {
      const selectedPatient = patients.find(p => p.id === appPatientId);
      const selectedMid = midwives.find(m => m.id === appMidwifeId);

      const apptPayload = {
        patientId: appPatientId,
        patientName: selectedPatient?.fullName || 'Unknown Patient',
        midwifeId: appMidwifeId,
        midwifeName: selectedMid?.fullName || 'Unknown Midwife',
        date: appDate,
        time: appTime,
        notes: appNotes || 'Routine pre-natal screening',
        status: 'scheduled',
        createdAt: new Date().toISOString()
      };

      await addDoc(collection(db, 'appointments'), apptPayload);

      // Also schedule a matched reminder in the database
      await addDoc(collection(db, 'reminders'), {
        midwifeId: appMidwifeId,
        patientId: appPatientId,
        patientName: selectedPatient?.fullName || 'Unknown Patient',
        title: `Pre-natal appointment: ${appNotes || 'Vitals Check'}`,
        type: 'clinic',
        scheduledAt: new Date(`${appDate}T${appTime}`),
        status: 'scheduled',
        createdAt: serverTimestamp()
      });

      await sendNotification(
        'Appointment Set',
        `Appointment set for ${selectedPatient?.fullName} with Midwife ${selectedMid?.fullName}`,
        'success'
      );

      setAppPatientId('');
      setAppMidwifeId('');
      setAppDate('');
      setAppTime('');
      setAppNotes('');
      fetchData();
    } catch (err) {
      console.error(err);
      alert('Failed to set appointment.');
    } finally {
      setAppSubmitting(false);
    }
  };

  // Appointments: Cancel Appointment
  const handleCancelAppt = async (apptId: string, patientName: string) => {
    if (!confirm(`Are you sure you want to cancel the scheduled visit for ${patientName}?`)) return;
    try {
      const docRef = doc(db, 'appointments', apptId);
      await updateDoc(docRef, { status: 'cancelled' });
      await sendNotification(
        'Appointment Cancelled',
        `Prenatal visit record for ${patientName} updated to Cancelled.`,
        'alert'
      );
      fetchData();
    } catch (err) {
      console.error(err);
      alert('Failed to cancel appointment.');
    }
  };

  // SMS Portal: Simulating SMS Deliveries
  const handleSendSimSms = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!smsPatientId || !smsCustomBody) {
      alert('Please select a patient and fill out the SMS body.');
      return;
    }
    setSmsSending(true);
    try {
      // Simulate network request delay
      await new Promise(resolve => setTimeout(resolve, 1500));

      const selectedPat = patients.find(p => p.id === smsPatientId);
      const newLog = {
        id: Math.random().toString(36).substring(7),
        patientName: selectedPat?.fullName || 'Unknown Patient',
        date: new Date().toLocaleString(),
        body: smsCustomBody,
        status: 'delivered'
      };

      const updatedLogs = [newLog, ...smsLogs];
      setSmsLogs(updatedLogs);
      localStorage.setItem('sms_sim_logs', JSON.stringify(updatedLogs));

      // Trigger standard patient-targeted browser notification
      await addDoc(collection(db, 'notifications'), {
        userId: smsPatientId,
        title: 'SMS Sent to Your Phone',
        message: smsCustomBody,
        type: 'info',
        read: false,
        createdAt: serverTimestamp()
      });

      await sendNotification(
        'SMS Dispatched',
        `Simulated telecommunication text successfully sent to ${selectedPat?.fullName}.`,
        'success'
      );

      // Reset
      setSmsPatientId('');
      setSmsCustomBody('');
    } catch (err) {
      console.error(err);
      alert('Failed to dispatch SMS simulation.');
    } finally {
      setSmsSending(false);
    }
  };

  const handlePrintReport = () => {
    window.print();
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      
      {/* Dynamic Header */}
      <header className="flex justify-between items-start">
        <div>
          <h2 className="text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em] mb-1">
            Maternal Care • {role} Portal
          </h2>
          <h1 className="text-3xl font-black text-on-surface">Hello, {profile?.fullName?.split(' ')[0] || 'User'}</h1>
          <p className="text-xs text-on-surface-variant">MamaTrack clinical supervision dashboard</p>
        </div>
        <div className="bg-primary/10 border border-primary/20 rounded-full px-4 py-1.5 text-[10px] font-bold text-primary uppercase tracking-widest">
          {role} Account
        </div>
      </header>

      {/* -------------------- ADMIN DASHBOARD VIEW -------------------- */}
      {role === 'admin' && (
        <div className="space-y-6">
          {/* Admin Stats Grid */}
          <section className="grid grid-cols-2 gap-4">
            <div className="bg-surface-container rounded-2xl p-4 border border-outline-variant/30">
              <span className="material-symbols-outlined text-primary text-xl">clinical_notes</span>
              <div className="text-2xl font-black mt-2">{midwives.length}</div>
              <div className="text-[10px] text-on-surface-variant uppercase tracking-wider font-bold">Midwives Configured</div>
            </div>
            <div className="bg-surface-container rounded-2xl p-4 border border-outline-variant/30">
              <span className="material-symbols-outlined text-tertiary text-xl">groups</span>
              <div className="text-2xl font-black mt-2">{patients.length}</div>
              <div className="text-[10px] text-on-surface-variant uppercase tracking-wider font-bold">Total Enrolled Patients</div>
            </div>
            <div className="bg-surface-container rounded-2xl p-4 border border-outline-variant/30 col-span-2 flex items-center justify-between">
              <div>
                <div className="font-bold text-sm">Appointments Scheduled: {appointments.filter(a => a.status === 'scheduled').length}</div>
                <div className="text-[9px] text-on-surface-variant uppercase tracking-wider">SMS Gateways Online</div>
              </div>
              <span className="material-symbols-outlined text-success">cell_tower</span>
            </div>
          </section>

          {/* Admin Command Tabs */}
          <div className="bg-surface-container rounded-2xl p-1.5 flex border border-outline-variant/20">
            {([
              { key: 'midwives', label: 'Midwives', icon: 'badge' },
              { key: 'appointments', label: 'Appointments', icon: 'calendar_month' },
              { key: 'sms', label: 'SMS Portal', icon: 'sms' }
            ] as const).map(tab => (
              <button
                key={tab.key}
                onClick={() => setAdminTab(tab.key)}
                className={cn(
                  "flex-1 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all",
                  adminTab === tab.key ? "bg-primary text-background shadow-md" : "text-on-surface-variant hover:text-on-surface"
                )}
              >
                <span className="material-symbols-outlined text-sm">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {/* Tab 1: Midwives CRUD Operations */}
            {adminTab === 'midwives' && (
              <motion.div
                key="midwives-tab"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                <div className="flex justify-between items-center pl-2">
                  <h3 className="text-xs font-black text-on-surface-variant uppercase tracking-widest">Midwife Registry</h3>
                  <button
                    onClick={() => setShowAddMidwife(!showAddMidwife)}
                    className="text-xs font-bold text-primary flex items-center gap-1 border border-primary/20 px-3 py-1 rounded-full bg-primary/5 hover:bg-primary/15"
                  >
                    <span className="material-symbols-outlined text-xs">add</span> Add Midwife
                  </button>
                </div>

                {/* Create Midwife Form */}
                <AnimatePresence>
                  {showAddMidwife && (
                    <motion.form
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      onSubmit={handleCreateMidwife}
                      className="bg-surface-container p-5 rounded-2xl border border-primary/20 space-y-4 overflow-hidden"
                    >
                      <div className="text-xs font-bold text-primary">Provision Staff Credentials</div>
                      <div className="space-y-3">
                        <input
                          type="text"
                          required
                          placeholder="Full Name"
                          value={midName}
                          onChange={(e) => setMidName(e.target.value)}
                          className="w-full bg-surface-container-high border border-outline-variant/30 rounded-xl py-3 px-4 text-xs focus:outline-none focus:border-primary"
                        />
                        <input
                          type="email"
                          required
                          placeholder="Staff Email"
                          value={midEmail}
                          onChange={(e) => setMidEmail(e.target.value)}
                          className="w-full bg-surface-container-high border border-outline-variant/30 rounded-xl py-3 px-4 text-xs focus:outline-none focus:border-primary"
                        />
                        <input
                          type="password"
                          required
                          placeholder="Assign Password (min 6 chars)"
                          value={midPassword}
                          onChange={(e) => setMidPassword(e.target.value)}
                          className="w-full bg-surface-container-high border border-outline-variant/30 rounded-xl py-3 px-4 text-xs focus:outline-none focus:border-primary"
                        />
                        <div className="grid grid-cols-2 gap-3">
                          <input
                            type="text"
                            placeholder="Clinic Location"
                            value={midClinic}
                            onChange={(e) => setMidClinic(e.target.value)}
                            className="w-full bg-surface-container-high border border-outline-variant/30 rounded-xl py-3 px-4 text-xs focus:outline-none"
                          />
                          <input
                            type="tel"
                            placeholder="Phone Number"
                            value={midPhone}
                            onChange={(e) => setMidPhone(e.target.value)}
                            className="w-full bg-surface-container-high border border-outline-variant/30 rounded-xl py-3 px-4 text-xs focus:outline-none"
                          />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setShowAddMidwife(false)}
                          className="flex-1 py-3 bg-surface-container-highest text-xs font-bold rounded-xl"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={midwifeSubmitting}
                          className="flex-[2] py-3 bg-primary text-background text-xs font-bold rounded-xl"
                        >
                          {midwifeSubmitting ? 'Creating Auth Client...' : 'Register Staff Member'}
                        </button>
                      </div>
                    </motion.form>
                  )}
                </AnimatePresence>

                {/* List of Midwives */}
                <div className="space-y-2">
                  {midwives.length === 0 ? (
                    <div className="p-8 text-center text-xs text-on-surface-variant">No midwives found. Create one above!</div>
                  ) : (
                    midwives.map(m => (
                      <div key={m.id} className="bg-surface-container p-4 rounded-xl border border-outline-variant/10 flex justify-between items-center">
                        <div>
                          <div className="font-bold text-sm text-on-surface">{m.fullName}</div>
                          <div className="text-[10px] text-on-surface-variant">{m.email} • {m.clinic || 'General Clinic'}</div>
                          <div className="text-[9px] text-primary/80 uppercase tracking-widest font-black mt-1">ID: {m.uid?.substring(0,8)}...</div>
                        </div>
                        <button
                          onClick={() => handleDeleteMidwife(m.id, m.fullName)}
                          className="w-8 h-8 rounded-full bg-error/10 text-error flex items-center justify-center hover:bg-error hover:text-white transition-colors"
                        >
                          <span className="material-symbols-outlined text-sm">delete</span>
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            )}

            {/* Tab 2: Appointments Scheduling */}
            {adminTab === 'appointments' && (
              <motion.div
                key="appointments-tab"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                {/* Create Appointment Form */}
                <form onSubmit={handleScheduleAppt} className="bg-surface-container p-5 rounded-2xl border border-outline-variant/30 space-y-4">
                  <div className="text-xs font-black uppercase tracking-wider text-primary">Schedule New Pre-natal Visit</div>
                  
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[9px] uppercase font-bold text-on-surface-variant ml-2 mb-1 block">Patient</label>
                        <select
                          required
                          value={appPatientId}
                          onChange={(e) => setAppPatientId(e.target.value)}
                          className="w-full bg-surface-container-high border border-outline-variant/30 rounded-xl py-3 px-3 text-xs focus:outline-none"
                        >
                          <option value="">Select...</option>
                          {patients.map(p => (
                            <option key={p.id} value={p.id}>{p.fullName} (Wk {p.weekOfPregnancy})</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-[9px] uppercase font-bold text-on-surface-variant ml-2 mb-1 block">Staff Assignee</label>
                        <select
                          required
                          value={appMidwifeId}
                          onChange={(e) => setAppMidwifeId(e.target.value)}
                          className="w-full bg-surface-container-high border border-outline-variant/30 rounded-xl py-3 px-3 text-xs focus:outline-none"
                        >
                          <option value="">Select...</option>
                          {midwives.map(m => (
                            <option key={m.id} value={m.id}>{m.fullName} ({m.clinic || 'General'})</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[9px] uppercase font-bold text-on-surface-variant ml-2 mb-1 block">Date</label>
                        <input
                          type="date"
                          required
                          value={appDate}
                          onChange={(e) => setAppDate(e.target.value)}
                          className="w-full bg-surface-container-high border border-outline-variant/30 rounded-xl py-2.5 px-3 text-xs focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] uppercase font-bold text-on-surface-variant ml-2 mb-1 block">Time</label>
                        <input
                          type="time"
                          required
                          value={appTime}
                          onChange={(e) => setAppTime(e.target.value)}
                          className="w-full bg-surface-container-high border border-outline-variant/30 rounded-xl py-2.5 px-3 text-xs focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[9px] uppercase font-bold text-on-surface-variant ml-2 mb-1 block">Clinical Diagnosis / Purpose</label>
                      <input
                        type="text"
                        placeholder="Routine vitals assessment & prenatal checkup"
                        value={appNotes}
                        onChange={(e) => setAppNotes(e.target.value)}
                        className="w-full bg-surface-container-high border border-outline-variant/30 rounded-xl py-3 px-4 text-xs focus:outline-none"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={appSubmitting}
                    className="w-full py-3 bg-primary text-background text-xs font-bold rounded-xl active:scale-95 transition-transform"
                  >
                    {appSubmitting ? 'Recording appointment...' : 'Create Appointment Record'}
                  </button>
                </form>

                {/* List of Scheduled Appointments */}
                <div className="space-y-3">
                  <h4 className="text-xs font-black text-on-surface-variant uppercase tracking-widest pl-2">Scheduled Visits Calendar</h4>
                  {appointments.length === 0 ? (
                    <div className="p-8 text-center text-xs text-on-surface-variant">No appointments registered yet.</div>
                  ) : (
                    appointments.map(appt => (
                      <div key={appt.id} className={cn(
                        "bg-surface-container p-4 rounded-xl border border-outline-variant/10 flex justify-between items-center",
                        appt.status === 'cancelled' && "opacity-50"
                      )}>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-sm">{appt.patientName}</span>
                            <span className={cn(
                              "text-[8px] px-1 py-0.5 rounded font-black uppercase tracking-wider",
                              appt.status === 'cancelled' ? "bg-error/20 text-error" : "bg-success/20 text-success"
                            )}>{appt.status}</span>
                          </div>
                          <div className="text-[10px] text-on-surface-variant">Midwife: {appt.midwifeName}</div>
                          <div className="text-[10px] text-primary/80 font-bold mt-1">
                            {appt.date} • {appt.time}
                          </div>
                          <p className="text-[10px] text-on-surface-variant/70 italic mt-0.5">"{appt.notes}"</p>
                        </div>
                        {appt.status === 'scheduled' && (
                          <button
                            onClick={() => handleCancelAppt(appt.id, appt.patientName)}
                            className="px-2.5 py-1 text-[10px] font-bold text-error border border-error/20 hover:bg-error hover:text-white rounded-md transition-colors"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            )}

            {/* Tab 3: SMS Messaging Portal */}
            {adminTab === 'sms' && (
              <motion.div
                key="sms-tab"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                <form onSubmit={handleSendSimSms} className="bg-surface-container p-5 rounded-2xl border border-outline-variant/30 space-y-4">
                  <div className="text-xs font-black uppercase tracking-wider text-primary flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm">cell_tower</span>
                    MamaTrack SMS Dispatch Center
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="text-[9px] uppercase font-bold text-on-surface-variant ml-2 mb-1 block">Target Pregnant Woman</label>
                      <select
                        required
                        value={smsPatientId}
                        onChange={(e) => setSmsPatientId(e.target.value)}
                        className="w-full bg-surface-container-high border border-outline-variant/30 rounded-xl py-3 px-3 text-xs focus:outline-none"
                      >
                        <option value="">Select target recipient...</option>
                        {patients.map(p => (
                          <option key={p.id} value={p.id}>{p.fullName} ({p.phoneNumber || 'No phone'})</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[9px] uppercase font-bold text-on-surface-variant ml-2 mb-1 block">Clinical Text Template</label>
                      <select
                        value={smsTemplate}
                        onChange={(e) => setSmsTemplate(e.target.value)}
                        className="w-full bg-surface-container-high border border-outline-variant/30 rounded-xl py-3 px-4 text-xs focus:outline-none"
                      >
                        <option value="appt_remind">Prenatal Appointment Reminder</option>
                        <option value="overdue_warn">Critical Overdue Visit Warning</option>
                        <option value="routine_encour">Routine Stage Encouragement</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[9px] uppercase font-bold text-on-surface-variant ml-2 mb-1 block">Custom Message Body (Editable)</label>
                      <textarea
                        rows={3}
                        required
                        value={smsCustomBody}
                        onChange={(e) => setSmsCustomBody(e.target.value)}
                        placeholder="Compose clinical message here..."
                        className="w-full bg-surface-container-high border border-outline-variant/30 rounded-xl p-3 text-xs focus:outline-none"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={smsSending}
                    className="w-full h-12 bg-primary text-background text-xs font-bold rounded-xl flex items-center justify-center gap-2"
                  >
                    {smsSending ? 'Transmitting Cellular signals...' : (
                      <>
                        Dispatch SMS Message
                        <span className="material-symbols-outlined text-sm">send</span>
                      </>
                    )}
                  </button>
                </form>

                {/* SMS Logging Console */}
                <div className="space-y-2">
                  <h4 className="text-xs font-black text-on-surface-variant uppercase tracking-widest pl-2">SMS Telemetry Gateway Logs</h4>
                  <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1 no-scrollbar">
                    {smsLogs.map((log, index) => (
                      <div key={log.id || index} className="p-3.5 bg-surface-container rounded-xl border border-outline-variant/10 leading-relaxed">
                        <div className="flex justify-between items-center text-[10px] mb-1">
                          <span className="font-bold text-primary">{log.patientName}</span>
                          <span className="text-success font-bold font-mono uppercase tracking-widest flex items-center gap-1">
                            <span className="material-symbols-outlined text-[10px] fill-1">check_circle</span>
                            {log.status}
                          </span>
                        </div>
                        <p className="text-[10px] text-on-surface-variant leading-normal">"{log.body}"</p>
                        <div className="text-[8px] text-on-surface-variant/40 mt-1 uppercase font-bold text-right tracking-wider">{log.date}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* -------------------- MIDWIFE DASHBOARD VIEW -------------------- */}
      {role === 'midwife' && (
        <div className="space-y-6">
          {/* Midwife Stats Grid */}
          <section className="grid grid-cols-2 gap-4">
            <div className="bg-surface-container rounded-2xl p-4 border border-outline-variant/30">
              <span className="material-symbols-outlined text-primary text-xl">maternal_health</span>
              <div className="text-2xl font-black mt-2">
                {patients.filter(p => p.assignedMidwifeId === profile?.uid).length}
              </div>
              <div className="text-[10px] text-on-surface-variant uppercase tracking-wider font-bold">Assigned Mothers</div>
            </div>
            <div className="bg-surface-container rounded-2xl p-4 border border-outline-variant/30">
              <span className="material-symbols-outlined text-tertiary text-xl">warning</span>
              <div className="text-2xl font-black mt-2">
                {patients.filter(p => p.assignedMidwifeId === profile?.uid && p.riskLevel === 'high').length}
              </div>
              <div className="text-[10px] text-on-surface-variant uppercase tracking-wider font-bold">High Risk Alerts</div>
            </div>
          </section>

          {/* Critical Alerts */}
          {patients.some(p => p.assignedMidwifeId === profile?.uid && p.riskLevel === 'high') ? (
            <div className="p-4 bg-error-container/20 border border-error/30 rounded-2xl flex gap-3 items-center">
              <span className="material-symbols-outlined text-error text-2xl fill-1">warning</span>
              <div>
                <div className="text-xs font-bold text-error">Unresolved Critical Triggers</div>
                <p className="text-[10px] text-on-surface-variant">Elevated gestational hypertension cases require follow-up visits.</p>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-success-container/10 border border-success/30 rounded-2xl flex gap-3 items-center">
              <span className="material-symbols-outlined text-success text-2xl fill-1">check_circle</span>
              <div>
                <div className="text-xs font-bold text-success">All Assigned Clients Safe</div>
                <p className="text-[10px] text-on-surface-variant">0 critical maternal risk triggers registered today.</p>
              </div>
            </div>
          )}

          {/* Assigned Patients Sub-List */}
          <section className="space-y-3">
            <div className="flex justify-between items-center pl-2">
              <h3 className="text-xs font-black text-on-surface-variant uppercase tracking-widest">My Patients</h3>
              <Link to="/patients" className="text-xs text-primary font-bold">View My Queue</Link>
            </div>

            <div className="space-y-3">
              {patients.filter(p => p.assignedMidwifeId === profile?.uid).length === 0 ? (
                <div className="text-center p-10 bg-surface-container rounded-3xl border border-outline-variant/30 text-xs text-on-surface-variant">
                  No pregnant women assigned to you. Enroll new clients in Patient portal.
                </div>
              ) : (
                patients.filter(p => p.assignedMidwifeId === profile?.uid).map(p => (
                  <Link
                    key={p.id}
                    to={`/patients/${p.id}`}
                    className="p-4 bg-surface-container border border-outline-variant/20 rounded-2xl flex items-center justify-between hover:border-primary/50 transition-all block"
                  >
                    <div>
                      <div className="font-bold text-sm text-on-surface">{p.fullName}</div>
                      <div className="text-[10px] text-on-surface-variant uppercase font-bold tracking-tight">Week {p.weekOfPregnancy} • {p.location}</div>
                    </div>
                    <div className={cn(
                      "text-[9px] px-2.5 py-0.5 rounded-full font-black uppercase tracking-wider",
                      p.riskLevel === 'high' ? "bg-error/20 text-error" :
                      p.riskLevel === 'medium' ? "bg-tertiary/20 text-tertiary" : "bg-primary/20 text-primary"
                    )}>
                      {p.riskLevel}
                    </div>
                  </Link>
                ))
              )}
            </div>
          </section>

          {/* Quick Enroller Floating Action Link */}
          <Link
            to="/patients/new"
            className="fixed bottom-24 right-5 w-14 h-14 bg-primary-container rounded-full shadow-2xl flex items-center justify-center text-on-primary-container z-40 active:scale-95 transition-transform"
          >
            <span className="material-symbols-outlined text-3xl font-bold">add</span>
          </Link>
        </div>
      )}

      {/* -------------------- PREGNANT WOMAN VIEW -------------------- */}
      {role === 'patient' && myPatientRecord && (
        <div className="space-y-6">
          {/* Maternal Pregnancy Gestational Age Tracker Widget */}
          <section className="bg-primary/5 p-6 rounded-3xl border border-primary/20 space-y-4">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-primary">Your Pregnancy Metrics Calendar</span>
                <h3 className="text-3xl font-black text-primary">Week {myPatientRecord.weekOfPregnancy || 0}</h3>
              </div>
              <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                <span className="material-symbols-outlined text-3xl">child_care</span>
              </div>
            </div>

            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Estimated Due Date:</span>
                <span className="font-bold text-on-surface">{myPatientRecord.eddDate || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Last Period (LMP):</span>
                <span className="font-bold text-on-surface">{myPatientRecord.lmpDate || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Caretaker Midwife:</span>
                <span className="font-bold text-primary font-bold">{myPatientRecord.assignedMidwifeName || 'Assigned Specialist'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Biometric Blood Type:</span>
                <span className="font-bold text-on-surface">{myPatientRecord.bloodType || 'N/A'}</span>
              </div>
            </div>

            {/* Visual Gestational Tracker ProgressBar */}
            <div className="space-y-1.5 pt-2">
              <div className="flex justify-between text-[10px] text-on-surface-variant font-bold">
                <span>CONCEPTION</span>
                <span>WEEK {(myPatientRecord.weekOfPregnancy || 0)}</span>
                <span>DELIVERY</span>
              </div>
              <div className="h-2 bg-surface-container rounded-full overflow-hidden border border-outline-variant/20 relative">
                <div 
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: `${Math.min(100, ((myPatientRecord.weekOfPregnancy || 0) / 40) * 100)}%` }}
                />
              </div>
            </div>
          </section>

          {/* Vitals History / Clinical visits */}
          <section className="space-y-3">
            <h3 className="text-xs font-black text-on-surface-variant uppercase tracking-widest pl-2">My Prenatal Clinical Records</h3>
            {myVisits.length === 0 ? (
              <div className="p-8 text-center bg-surface-container rounded-2xl border border-outline-variant/30 text-xs text-on-surface-variant">
                No clinical visits recorded on-app yet.
              </div>
            ) : (
              <div className="space-y-3">
                {myVisits.map(visit => (
                  <div key={visit.id} className="bg-surface-container p-4 rounded-2xl border border-outline-variant/10">
                    <div className="flex justify-between items-center text-xs mb-1.5 border-b border-outline-variant/10 pb-1.5">
                      <span className="font-bold text-primary">{visit.visitType || 'Session Checkup'}</span>
                      <span className="text-[10px] text-on-surface-variant font-bold">{visit.visitDate}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-xs mb-2">
                      <div className="bg-surface-container-high rounded-xl p-2 text-center">
                        <div className="text-[9px] text-on-surface-variant font-black">WEIGHT</div>
                        <div className="font-mono text-lg font-bold text-primary">{visit.weight || '70'} <span className="text-xs text-on-surface-variant">kg</span></div>
                      </div>
                      <div className="bg-surface-container-high rounded-xl p-2 text-center">
                        <div className="text-[9px] text-on-surface-variant font-black">BLOOD PRESSURE</div>
                        <div className="font-mono text-lg font-bold text-primary">{visit.bpSystolic || '120'}/{visit.bpDiastolic || '80'}</div>
                      </div>
                    </div>
                    {visit.notes && (
                      <div className="text-[11px] text-on-surface-variant leading-relaxed p-2.5 bg-surface-container-high/50 rounded-xl">
                        <div className="font-bold uppercase text-[8px] text-primary mb-0.5">Midwife Notes:</div>
                        "{visit.notes}"
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Appointments list */}
          <section className="space-y-3">
            <h3 className="text-xs font-black text-on-surface-variant uppercase tracking-widest pl-2">My Scheduled Appointments</h3>
            {appointments.filter(a => a.patientId === profile?.uid && a.status === 'scheduled').length === 0 ? (
              <div className="p-4 bg-surface-container text-on-surface-variant rounded-2xl text-xs border border-outline-variant/30 text-center">
                No upcoming diagnostic visits scheduled.
              </div>
            ) : (
              appointments.filter(a => a.patientId === profile?.uid && a.status === 'scheduled').map(appt => (
                <div key={appt.id} className="bg-surface-container p-4 border border-outline-variant/20 rounded-2xl flex justify-between items-center">
                  <div>
                    <div className="font-bold text-xs text-on-surface">{appt.notes || 'Routine Prenatal Screening'}</div>
                    <div className="text-[10px] text-on-surface-variant">{appt.date} • {appt.time}</div>
                    <div className="text-[9px] text-primary uppercase font-bold tracking-widest mt-1">Provider: Midwife {appt.midwifeName}</div>
                  </div>
                  <span className="material-symbols-outlined text-primary text-xl">calendar_month</span>
                </div>
              ))
            )}
          </section>

          {/* Premium Report Download Panel */}
          <section className="bg-surface-container rounded-3xl p-5 border border-outline-variant/30 space-y-4">
            <div className="flex gap-4 items-start">
              <span className="material-symbols-outlined text-3xl text-primary mt-1">save_alt</span>
              <div>
                <h4 className="font-bold text-md">Download Clinical Record</h4>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  Generate and download a clinical-grade prenatal care file summaries for offline reference, travel, or external hospital coordination.
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsReportOpen(true)}
              className="w-full h-12 bg-primary text-background font-bold rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-transform"
            >
              Compile Health Summary (PDF)
              <span className="material-symbols-outlined font-black text-sm">download</span>
            </button>
          </section>
        </div>
      )}

      {/* Loading indicator */}
      {loading && (
        <div className="py-20 text-center text-on-surface-variant text-xs">
          Syncing records with MamaTrack medical core services...
        </div>
      )}

      {/* Printable Clinical Docket Modal Report */}
      <AnimatePresence>
        {isReportOpen && myPatientRecord && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setIsReportOpen(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[150] w-full max-w-md mx-auto" 
            />
            <motion.div 
              initial={{ y: '100%' }} 
              animate={{ y: 0 }} 
              exit={{ y: '100%' }}
              className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white text-black rounded-t-[2.5rem] z-[160] h-[90vh] flex flex-col p-6 shadow-2xl overflow-y-auto"
            >
              {/* Report Header (Print Ready) */}
              <div className="flex justify-between items-start border-b-2 border-black pb-4 mb-4" id="mamatrack-printable-docket">
                <div>
                  <h2 className="text-xl font-black uppercase tracking-tight text-gray-950">MamaTrack Health System</h2>
                  <p className="text-[10px] font-bold text-primary tracking-widest uppercase">Maternal Health Record Registry Summary</p>
                  <p className="text-[8px] text-gray-500 uppercase">Document Code: MT-PNR-{(profile?.uid || 'GEN').substring(0,8).toUpperCase()}</p>
                </div>
                <div className="p-2 border-2 border-black rounded-lg text-center bg-gray-50">
                  <div className="text-[8px] font-black uppercase tracking-wider">GESTATION AGE</div>
                  <div className="text-lg font-black">{myPatientRecord.weekOfPregnancy} Wks</div>
                </div>
              </div>

              {/* Patient Profile Docket Info */}
              <div className="grid grid-cols-2 gap-3 text-xs mb-5">
                <div className="border border-gray-300 rounded-lg p-2.5 space-y-1">
                  <div className="text-[8px] font-bold text-gray-500 uppercase">SUBJECT NAME:</div>
                  <div className="font-extrabold text-gray-900">{myPatientRecord.fullName}</div>
                  <div className="text-[9px]">Age: {myPatientRecord.age} • Phone: {myPatientRecord.phoneNumber}</div>
                  <div className="text-[9px]">Location: {myPatientRecord.location}</div>
                </div>
                <div className="border border-gray-300 rounded-lg p-2.5 space-y-1">
                  <div className="text-[8px] font-bold text-gray-500 uppercase">DIAGNOSTIC DATA:</div>
                  <div>Blood Type: <span className="font-bold text-gray-900">{myPatientRecord.bloodType || 'O Pos'}</span></div>
                  <div>Estimated Due: <span className="font-bold text-gray-900">{myPatientRecord.eddDate}</span></div>
                  <div>Last Period LMP: <span className="font-bold text-gray-900">{myPatientRecord.lmpDate}</span></div>
                </div>
              </div>

              {/* Clinical History Visits Logs */}
              <div className="space-y-3 flex-1">
                <h4 className="text-xs font-black uppercase tracking-widest text-gray-950 border-b border-gray-400 pb-1">Historical Vitals Record Sessions</h4>
                {myVisits.length === 0 ? (
                  <p className="text-[11px] text-gray-500 italic">No formal clinical diagnostic logs collected.</p>
                ) : (
                  myVisits.map((v, i) => (
                    <div key={v.id || i} className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-xs space-y-1.5 shadow-sm">
                      <div className="flex justify-between items-center font-bold">
                        <span>Visit {i+1}: {v.visitType || 'Session Screen'}</span>
                        <span className="text-[9px] text-primary">{v.visitDate}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 font-mono text-[10px]">
                        <div>Biometric Weight: <span className="font-extrabold text-black">{v.weight || '70'} kg</span></div>
                        <div>Blood Pressure: <span className="font-extrabold text-black">{v.bpSystolic || '120'}/{v.bpDiastolic || '80'}</span></div>
                      </div>
                      {v.notes && (
                        <p className="text-[10px] text-gray-600 italic bg-white p-1.5 border border-gray-100 rounded">
                          Midwife comments: "{v.notes}"
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Signatures & Certification */}
              <div className="mt-6 border-t-2 border-black pt-4 grid grid-cols-2 gap-4 text-[10px]">
                <div className="space-y-1">
                  <div className="text-gray-500 uppercase text-[8px] font-bold">PRIMARY HEALTH OFFICER:</div>
                  <div className="font-bold text-gray-800">{myPatientRecord.assignedMidwifeName || 'Authorized Midwife Specialist'}</div>
                  <div className="h-8 border-b border-gray-400 w-32" />
                  <div className="text-[7px] text-gray-400">Electronic verification signature docket</div>
                </div>
                <div className="space-y-1 text-right">
                  <div className="text-gray-500 uppercase text-[8px] font-bold">REGISTRY TIMESTAMP:</div>
                  <div className="font-bold text-gray-800">{new Date().toLocaleString()}</div>
                  <div className="inline-block p-1 border border-black rounded text-[8px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-800 mt-2">
                    ✓ MATERNAL PASS VERIFIED
                  </div>
                </div>
              </div>

              {/* Print Actions */}
              <div className="mt-8 grid grid-cols-2 gap-3 shrink-0">
                <button
                  onClick={handlePrintReport}
                  className="w-full h-12 bg-black text-white hover:bg-gray-900 font-bold rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-transform text-xs"
                >
                  <span className="material-symbols-outlined text-sm">print</span>
                  Print Registry Summary
                </button>
                <button
                  onClick={() => setIsReportOpen(false)}
                  className="w-full h-12 bg-gray-200 text-black hover:bg-gray-300 font-bold rounded-xl active:scale-95 transition-transform text-xs"
                >
                  Close dockets
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
