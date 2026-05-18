import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, query, getDocs, orderBy, limit, addDoc, serverTimestamp, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { useAuth } from '../hooks/useAuth';

export default function PatientDetail() {
  const { id } = useParams();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [patient, setPatient] = useState<any>(null);
  const [visits, setVisits] = useState<any[]>([]);
  const [children, setChildren] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal States
  const [showChildModal, setShowChildModal] = useState(false);
  const [showVisitModal, setShowVisitModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [visitToDelete, setVisitToDelete] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditingEdd, setIsEditingEdd] = useState(false);
  const [newEdd, setNewEdd] = useState('');

  // Form States
  const [childForm, setChildForm] = useState({ fullName: '', dob: '', gender: 'female' });
  const [visitForm, setVisitForm] = useState({ visitType: 'Antenatal Check', notes: '', bp: '', weight: '' });

  useEffect(() => {
    async function fetchData() {
      if (!id) return;
      try {
        const docRef = doc(db, 'patients', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setPatient({ id: docSnap.id, ...docSnap.data() });
          
          // Fetch visits
          const vQuery = query(collection(db, 'patients', id, 'visits'), orderBy('visitDate', 'desc'), limit(5));
          const vSnap = await getDocs(vQuery);
          setVisits(vSnap.docs.map(d => ({ id: d.id, ...d.data() })));

          // Fetch children
          const cQuery = query(collection(db, 'patients', id, 'children'), orderBy('createdAt', 'desc'));
          const cSnap = await getDocs(cQuery);
          setChildren(cSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        }
      } catch (err) {
        console.error('Error fetching patient data:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [id]);

  const handleAddChild = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !childForm.fullName || !childForm.dob) return;
    setIsSubmitting(true);
    try {
      const colRef = collection(db, 'patients', id, 'children');
      const newChild = {
        ...childForm,
        createdAt: serverTimestamp(),
        patientId: id
      };
      const docRef = await addDoc(colRef, newChild);
      
      // Local update
      const localChild = { id: docRef.id, ...newChild, createdAt: { seconds: Date.now()/1000 } };
      setChildren(prev => [localChild, ...prev]);
      setShowChildModal(false);
      setChildForm({ fullName: '', dob: '', gender: 'female' });
    } catch (err) {
      console.error('Error adding child:', err);
      alert('Failed to add child profile.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRecordVisit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !profile?.uid || !visitForm.visitType) return;
    setIsSubmitting(true);
    try {
      const colRef = collection(db, 'patients', id, 'visits');
      const newVisit = {
        ...visitForm,
        visitDate: serverTimestamp(),
        midwifeId: profile.uid,
        patientId: id
      };
      const docRef = await addDoc(colRef, newVisit);
      // Construct local visit object for UI update
      const localVisit = { 
        id: docRef.id, 
        ...newVisit, 
        visitDate: { seconds: Math.floor(Date.now() / 1000) } 
      };
      setVisits(prev => [localVisit, ...prev].slice(0, 5));
      setShowVisitModal(false);
      setVisitForm({ visitType: 'Antenatal Check', notes: '', bp: '', weight: '' });
    } catch (err) {
      console.error('Error recording visit:', err);
      alert('Failed to record visit.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateEdd = async () => {
    if (!id || !newEdd) return;
    setIsSubmitting(true);
    try {
      const docRef = doc(db, 'patients', id);
      await updateDoc(docRef, { eddDate: newEdd });
      setPatient((prev: any) => ({ ...prev, eddDate: newEdd }));
      setIsEditingEdd(false);
    } catch (err) {
      console.error('Error updating EDD:', err);
      alert('Failed to update EDD.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteVisit = async () => {
    if (!id || !visitToDelete) return;
    setIsSubmitting(true);
    try {
      const visitRef = doc(db, 'patients', id, 'visits', visitToDelete);
      await deleteDoc(visitRef);
      setVisits(prev => prev.filter(v => v.id !== visitToDelete));
      setShowDeleteConfirm(false);
      setVisitToDelete(null);
    } catch (err) {
      console.error('Error deleting visit:', err);
      alert('Failed to delete visit record.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <div className="py-20 text-center text-primary animate-pulse font-bold tracking-widest uppercase text-xs">Accessing Health Files...</div>;
  if (!patient) return <div className="py-20 text-center text-error font-bold">Patient Not Found</div>;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-5 duration-500 pb-32">
      <header className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container-highest text-primary transition-colors">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">{patient.fullName}</h1>
            <span className={cn(
                  "px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider",
                  patient.riskLevel === 'high' ? "bg-error/20 text-error" : 
                  patient.riskLevel === 'medium' ? "bg-tertiary/20 text-tertiary" : 
                  "bg-primary/20 text-primary"
                )}>
                  {patient.riskLevel} Risk
            </span>
          </div>
          <p className="text-xs text-on-surface-variant uppercase tracking-widest">ID: MT-{patient.id?.substring(0, 8).toUpperCase()}</p>
        </div>
        <button 
          onClick={() => setShowVisitModal(true)}
          className="bg-primary text-background px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest shadow-lg active:scale-95 transition-transform shrink-0"
        >
          Record Visit
        </button>
      </header>

      {/* Patient Summary Card */}
      <section className="bg-surface-container rounded-3xl p-6 border border-outline-variant/30 relative overflow-hidden shadow-2xl">
        <div className="grid grid-cols-2 gap-6 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-primary">female</span>
            </div>
            <div>
              <div className="text-[10px] text-on-surface-variant uppercase tracking-tighter font-bold">Age</div>
              <div className="font-bold">{patient.age} Years</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-tertiary/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-tertiary">bloodtype</span>
            </div>
            <div>
              <div className="text-[10px] text-on-surface-variant uppercase tracking-tighter font-bold">Blood</div>
              <div className="font-bold">{patient.bloodType || 'O Positive'}</div>
            </div>
          </div>
        </div>
        
        {/* Subtle decorative glow */}
        <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-[40px] pointer-events-none" />
      </section>

      {/* Pregnancy Status Card */}
      <section className="space-y-4">
        <h3 className="text-xs font-bold text-on-surface-variant uppercase tracking-widest pl-2">Pregnancy Status</h3>
        <div className="bg-surface-container rounded-3xl p-6 border border-outline-variant/30 flex justify-between items-center bg-gradient-to-br from-surface-container to-surface-container-high shadow-lg">
          <div className="space-y-1">
            <div className="text-xs text-primary uppercase font-bold tracking-wider">Current Progress</div>
            <div className="text-4xl font-black text-primary">Week {patient.weekOfPregnancy || 24}</div>
            <div className="text-sm text-on-surface-variant">Active Pregnancy</div>
            <div className="mt-4 w-32 h-2 bg-surface-container-highest rounded-full overflow-hidden">
               <motion.div 
                 initial={{ width: 0 }}
                 animate={{ width: `${(patient.weekOfPregnancy / 40) * 100}%` }}
                 className="h-full bg-primary shadow-[0_0_10px_#46E4F0]" 
               />
            </div>
          </div>
          
          <div className="text-right">
             <div className="text-xs text-on-surface-variant uppercase font-bold tracking-wider">EDD</div>
             {isEditingEdd ? (
               <div className="mt-1 flex flex-col items-end gap-2">
                 <input 
                   type="date" 
                   value={newEdd} 
                   onChange={(e) => setNewEdd(e.target.value)}
                   className="bg-surface-container border border-primary text-xs p-1 rounded outline-none"
                 />
                 <div className="flex gap-2">
                   <button 
                     onClick={() => setIsEditingEdd(false)}
                     className="text-[10px] text-on-surface-variant uppercase font-bold"
                   >
                     Cancel
                   </button>
                   <button 
                     onClick={handleUpdateEdd}
                     disabled={isSubmitting}
                     className="text-[10px] text-primary uppercase font-bold"
                   >
                     {isSubmitting ? '...' : 'Save'}
                   </button>
                 </div>
               </div>
             ) : (
               <div className="flex flex-col items-end">
                 <div className="text-lg font-black text-tertiary">
                   {patient.eddDate ? format(new Date(patient.eddDate), 'MMM dd, yyyy') : 'TBD'}
                 </div>
                 <button 
                   onClick={() => {
                     setNewEdd(patient.eddDate || '');
                     setIsEditingEdd(true);
                   }}
                   className="text-[10px] text-primary uppercase font-bold underline"
                 >
                   Edit EDD
                 </button>
               </div>
             )}
          </div>
        </div>
      </section>

      {/* AI Risk Assessment Redirect */}
      <Link 
        to={`/risk/${patient.id}`}
        className="w-full bg-primary/5 border border-primary/20 rounded-3xl p-6 flex flex-col gap-3 relative group overflow-hidden active:scale-95 transition-transform"
      >
        <div className="flex items-center gap-3 relative z-10">
          <span className="material-symbols-outlined text-primary fill-1">smart_toy</span>
          <span className="font-bold text-primary uppercase text-xs tracking-widest">AI Risk Engine Insight</span>
        </div>
        <p className="text-sm leading-relaxed text-on-surface relative z-10">
          {patient.riskScore > 0 ? `Risk severity is at ${patient.riskScore}% based on biometric trends.` : "Run AI diagnostic for automated risk detection."}
        </p>
        <div className="flex justify-between items-center mt-2 relative z-10">
          <span className="text-[10px] uppercase font-bold text-primary group-hover:underline">Open Risk Profile</span>
          <span className="material-symbols-outlined text-primary group-hover:translate-x-1 transition-transform">arrow_forward</span>
        </div>
        <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-primary/10 rounded-full blur-[30px]" />
      </Link>

      {/* Recent Visits */}
      <section className="space-y-4">
        <div className="flex justify-between items-center pl-2">
          <h3 className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">Recent Visits</h3>
        </div>
        <div className="space-y-3">
          {visits.length === 0 ? (
            <div className="text-on-surface-variant text-[10px] italic py-10 bg-surface-container rounded-2xl border border-dashed border-outline-variant/30 text-center uppercase tracking-widest">No medical history recorded.</div>
          ) : (
            visits.map(visit => (
              <div key={visit.id} className="bg-surface-container rounded-2xl p-5 border border-outline-variant/30 flex justify-between items-center group active:scale-[0.98] transition-transform">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-surface-container-high flex items-center justify-center">
                    <span className="material-symbols-outlined text-primary">medical_services</span>
                  </div>
                  <div>
                    <div className="font-bold text-sm">{visit.visitType}</div>
                    <div className="text-[10px] text-on-surface-variant uppercase tracking-tighter font-bold">
                      {visit.visitDate?.seconds ? format(new Date(visit.visitDate.seconds * 1000), 'MMM dd, yyyy') : 'Recent'} • {visit.clinic || 'Central Clinic'}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={(e) => {
                      e.preventDefault();
                      setVisitToDelete(visit.id);
                      setShowDeleteConfirm(true);
                    }}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-error hover:bg-error/10 transition-colors"
                  >
                    <span className="material-symbols-outlined text-xl">delete</span>
                  </button>
                  <span className="material-symbols-outlined text-on-surface-variant opacity-30">chevron_right</span>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Children Section */}
      <section className="space-y-4">
        <h3 className="text-xs font-bold text-on-surface-variant uppercase tracking-widest pl-2">Children</h3>
        <div className="grid grid-cols-2 gap-4">
          {children.map(child => (
            <div key={child.id} className="bg-surface-container rounded-2xl p-5 border border-outline-variant/30 flex flex-col gap-2 relative overflow-hidden">
               <div className="w-8 h-8 rounded-lg bg-tertiary/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-tertiary text-lg">child_care</span>
               </div>
               <div className="font-bold text-sm truncate">{child.fullName}</div>
               <div className="text-[8px] text-on-surface-variant uppercase tracking-[0.1em]">{child.dob ? format(new Date(child.dob), 'MMM yyyy') : 'N/A'}</div>
               <div className="mt-2 flex items-center gap-1 text-[8px] text-primary font-bold uppercase tracking-widest">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                  Health Active
               </div>
            </div>
          ))}
          <button 
            onClick={() => setShowChildModal(true)}
            className="bg-surface-container/50 border border-dashed border-outline-variant/30 rounded-2xl p-5 flex flex-col items-center justify-center gap-3 text-on-surface-variant hover:border-primary/50 hover:text-primary transition-all active:scale-95 min-h-[140px]"
          >
            <span className="material-symbols-outlined text-2xl">add_circle</span>
            <span className="text-[10px] uppercase font-bold tracking-[0.2em]">Add Profile</span>
          </button>
        </div>
      </section>

      {/* Record Visit FAB */}
      <motion.button 
        whileTap={{ scale: 0.9 }}
        onClick={() => setShowVisitModal(true)}
        className="fixed bottom-24 right-5 w-14 h-14 bg-primary text-background rounded-full shadow-[0_8px_30px_rgba(70,228,240,0.5)] flex items-center justify-center z-40 active:scale-95"
      >
        <span className="material-symbols-outlined text-3xl font-bold">medical_information</span>
      </motion.button>

      {/* Add Child Modal */}
      <AnimatePresence>
        {showChildModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowChildModal(false)} className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] w-full max-w-md mx-auto" />
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-surface-container-high rounded-t-[2.5rem] z-[110] p-8 pb-12 shadow-2xl border-t border-outline-variant/30">
              <div className="w-12 h-1.5 bg-outline-variant/30 rounded-full mx-auto mb-8" />
              <h2 className="text-2xl font-bold mb-6">New Child Profile</h2>
              <form onSubmit={handleAddChild} className="space-y-5">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant ml-4">Full Name</label>
                  <input required placeholder="Child's Full Name" value={childForm.fullName} onChange={e => setChildForm({...childForm, fullName: e.target.value})} className="w-full bg-surface-container border border-outline-variant/30 rounded-2xl py-4 px-6 focus:border-primary outline-none transition-colors text-sm" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant ml-4">Birth Date</label>
                    <input required type="date" value={childForm.dob} onChange={e => setChildForm({...childForm, dob: e.target.value})} className="w-full bg-surface-container border border-outline-variant/30 rounded-2xl py-4 px-4 focus:border-primary outline-none text-sm" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant ml-4">Gender</label>
                    <select value={childForm.gender} onChange={e => setChildForm({...childForm, gender: e.target.value})} className="w-full bg-surface-container border border-outline-variant/30 rounded-2xl py-4 px-4 focus:border-primary outline-none text-sm">
                      <option value="female">Female</option>
                      <option value="male">Male</option>
                    </select>
                  </div>
                </div>
                <button disabled={isSubmitting} type="submit" className="w-full h-14 bg-primary text-background font-bold rounded-full mt-6 shadow-lg active:scale-95 transition-transform">{isSubmitting ? 'Registering...' : 'Register Profile'}</button>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Record Visit Modal */}
      <AnimatePresence>
        {showVisitModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowVisitModal(false)} className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] w-full max-w-md mx-auto" />
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-surface-container-high rounded-t-[2.5rem] z-[110] p-8 pb-12 shadow-2xl border-t border-outline-variant/30">
              <div className="w-12 h-1.5 bg-outline-variant/30 rounded-full mx-auto mb-8" />
              <h2 className="text-2xl font-bold mb-6">Clinical Visit Entry</h2>
              <form onSubmit={handleRecordVisit} className="space-y-5">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant ml-4">Visit Classification</label>
                  <select value={visitForm.visitType} onChange={e => setVisitForm({...visitForm, visitType: e.target.value})} className="w-full bg-surface-container border border-outline-variant/30 rounded-2xl py-4 px-6 focus:border-primary outline-none text-sm">
                    <option value="Antenatal Check">Antenatal Check</option>
                    <option value="Postnatal Review">Postnatal Review</option>
                    <option value="Immunization">Immunization</option>
                    <option value="Emergency Visit">Emergency Visit</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant ml-4">Vitals (BP)</label>
                    <input placeholder="120/80" value={visitForm.bp} onChange={e => setVisitForm({...visitForm, bp: e.target.value})} className="w-full bg-surface-container border border-outline-variant/30 rounded-2xl py-4 px-6 focus:border-primary outline-none text-sm" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant ml-4">Weight (kg)</label>
                    <input placeholder="0.0" value={visitForm.weight} onChange={e => setVisitForm({...visitForm, weight: e.target.value})} className="w-full bg-surface-container border border-outline-variant/30 rounded-2xl py-4 px-6 focus:border-primary outline-none text-sm" />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant ml-4">Clinical Observations</label>
                  <textarea placeholder="Record symptoms or progress notes..." value={visitForm.notes} onChange={e => setVisitForm({...visitForm, notes: e.target.value})} className="w-full bg-surface-container border border-outline-variant/30 rounded-2xl py-4 px-6 focus:border-primary outline-none text-sm min-h-[100px]" />
                </div>
                <button disabled={isSubmitting} type="submit" className="w-full h-14 bg-primary text-background font-bold rounded-full mt-6 shadow-lg active:scale-95 transition-transform">{isSubmitting ? 'Recording...' : 'Finalize Health Record'}</button>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowDeleteConfirm(false)} className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[120] w-full max-w-md mx-auto" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-5/6 max-w-[320px] bg-surface-container-high rounded-[2rem] z-[130] p-8 shadow-2xl border border-outline-variant/30 text-center">
              <div className="w-16 h-16 rounded-3xl bg-error/10 flex items-center justify-center mx-auto mb-6">
                <span className="material-symbols-outlined text-error text-3xl">warning</span>
              </div>
              <h2 className="text-xl font-bold mb-2">Delete Visit?</h2>
              <p className="text-sm text-on-surface-variant mb-8">This will permanently remove this medical record. This action cannot be undone.</p>
              <div className="flex flex-col gap-3">
                <button 
                  onClick={handleDeleteVisit}
                  disabled={isSubmitting}
                  className="w-full h-14 bg-error text-white font-bold rounded-2xl active:scale-95 transition-transform"
                >
                  {isSubmitting ? 'Deleting...' : 'Delete Record'}
                </button>
                <button 
                  onClick={() => setShowDeleteConfirm(false)}
                  className="w-full h-14 bg-surface-container border border-outline-variant/30 text-on-surface font-bold rounded-2xl active:scale-95 transition-transform"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
