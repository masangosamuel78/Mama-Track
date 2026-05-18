import React, { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNotifications } from '../hooks/useNotifications';
import { collection, query, where, getDocs, addDoc, serverTimestamp, orderBy, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { motion, AnimatePresence } from 'motion/react';

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}

export default function Reminders() {
  const { profile } = useAuth();
  const { sendNotification } = useNotifications();
  const [reminders, setReminders] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  
  // New Task Form State
  const [formData, setFormData] = useState({
    patientId: '',
    title: '',
    type: 'clinic',
    scheduledAt: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function fetchData() {
      if (!profile?.uid) return;
      try {
        // Fetch Reminders
        const rQuery = query(
          collection(db, 'reminders'),
          where('midwifeId', '==', profile.uid),
          orderBy('scheduledAt', 'desc')
        );
        const rSnap = await getDocs(rQuery);
        setReminders(rSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

        // Fetch Patients for selection
        const pQuery = query(collection(db, 'patients'), where('assignedMidwifeId', '==', profile.uid));
        const pSnap = await getDocs(pQuery);
        setPatients(pSnap.docs.map(doc => ({ id: doc.id, fullName: doc.data().fullName })));
      } catch (err) {
        console.error('Error fetching reminders/patients:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [profile]);

  const handleScheduleTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.uid || !formData.patientId || !formData.title || !formData.scheduledAt) return;

    setIsSubmitting(true);
    try {
      const selectedPatient = patients.find(p => p.id === formData.patientId);
      const newReminder = {
        midwifeId: profile.uid,
        patientId: formData.patientId,
        patientName: selectedPatient?.fullName || 'Unknown',
        title: formData.title,
        type: formData.type,
        scheduledAt: new Date(formData.scheduledAt),
        status: 'scheduled',
        createdAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, 'reminders'), newReminder);
      
      // Update local state
      setReminders(prev => [{ id: docRef.id, ...newReminder }, ...prev]);
      setShowModal(false);
      setFormData({ patientId: '', title: '', type: 'clinic', scheduledAt: '' });
      
      await sendNotification(
        'Task Scheduled',
        `New reminder set for ${selectedPatient?.fullName}`,
        'info'
      );
    } catch (err) {
      console.error('Error scheduling task:', err);
      alert('Failed to schedule task.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCompleteTask = async (reminderId: string) => {
    try {
      const docRef = doc(db, 'reminders', reminderId);
      const reminderToComplete = reminders.find(r => r.id === reminderId);
      
      await updateDoc(docRef, { 
        status: 'completed',
        completedAt: serverTimestamp()
      });
      
      setReminders(prev => prev.map(r => 
        r.id === reminderId ? { ...r, status: 'completed' } : r
      ));

      if (reminderToComplete) {
        await sendNotification(
          'Task Attended',
          `Successfully recorded visit for ${reminderToComplete.patientName}`,
          'success'
        );
      }
    } catch (err) {
      console.error('Error completing task:', err);
      alert('Failed to update task status.');
    }
  };

  const handleDeleteTask = async (reminderId: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return;
    
    try {
      const docRef = doc(db, 'reminders', reminderId);
      await deleteDoc(docRef);
      
      setReminders(prev => prev.filter(r => r.id !== reminderId));
    } catch (err) {
      console.error('Error deleting task:', err);
      alert('Failed to delete task.');
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <header>
        <h1 className="text-3xl font-bold">Reminders</h1>
        <p className="text-sm text-on-surface-variant">Scheduled tasks & automated notifications.</p>
      </header>

      <section className="space-y-6">
        <div className="space-y-4">
          <div className="flex justify-between items-end pl-2 pr-2">
            <h3 className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">Active Timeline</h3>
            <span className="text-[10px] text-primary font-bold uppercase tracking-widest opacity-60">{reminders.filter(r => r.status === 'scheduled').length} Pending</span>
          </div>
          <div className="space-y-3">
            {loading ? (
              <div className="py-10 text-center text-on-surface-variant text-sm">Syncing with clinical registry...</div>
            ) : reminders.length === 0 ? (
              <div className="bg-surface-container rounded-3xl p-10 border border-outline-variant/30 text-center space-y-3">
                <span className="material-symbols-outlined text-4xl text-on-surface-variant opacity-20">event_busy</span>
                <p className="text-sm text-on-surface-variant">No active reminders scheduled.</p>
              </div>
            ) : (
              reminders.map((reminder) => (
                <div key={reminder.id} className={cn(
                  "bg-surface-container rounded-3xl p-5 border border-outline-variant/30 flex gap-4 items-center transition-all duration-300",
                  reminder.status === 'completed' && "opacity-60 grayscale-[0.5]"
                )}>
                  <div className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0",
                    reminder.status === 'completed' ? "bg-surface-container-highest text-on-surface-variant" :
                    reminder.type === 'clinic' ? "bg-primary/10 text-primary" :
                    reminder.type === 'lab' ? "bg-tertiary/10 text-tertiary" :
                    reminder.type === 'home' ? "bg-secondary-container text-on-secondary-container" :
                    "bg-surface-container-highest text-on-surface-variant"
                  )}>
                    <span className="material-symbols-outlined">
                      {reminder.status === 'completed' ? 'check_circle' : 
                       reminder.type === 'clinic' ? 'medical_services' :
                       reminder.type === 'lab' ? 'science' :
                       reminder.type === 'home' ? 'home_health' : 'sms'}
                    </span>
                  </div>
                  <div className="flex-1">
                    <div className={cn("font-bold text-sm text-on-surface", reminder.status === 'completed' && "line-through")}>{reminder.title}</div>
                    <div className="text-[10px] text-primary font-black uppercase tracking-tighter mb-1">{reminder.patientName}</div>
                    <div className="text-[10px] text-on-surface-variant uppercase tracking-tighter">
                      {reminder.scheduledAt?.seconds 
                        ? new Date(reminder.scheduledAt.seconds * 1000).toLocaleString() 
                        : new Date(reminder.scheduledAt).toLocaleString()}
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    {reminder.status === 'scheduled' && (
                      <button 
                        onClick={() => handleCompleteTask(reminder.id)}
                        className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center hover:bg-primary hover:text-background transition-colors active:scale-90"
                        title="Mark as attended"
                      >
                        <span className="material-symbols-outlined text-xl">check</span>
                      </button>
                    )}
                    <button 
                      onClick={() => handleDeleteTask(reminder.id)}
                      className="w-10 h-10 rounded-full bg-error/5 text-error flex items-center justify-center hover:bg-error hover:text-white transition-colors active:scale-90"
                      title="Delete task"
                    >
                      <span className="material-symbols-outlined text-xl">delete</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <button 
          onClick={() => setShowModal(true)}
          className="w-full h-14 bg-surface-container-high border border-outline-variant/30 rounded-2xl flex items-center justify-center gap-2 text-primary font-bold active:scale-95 transition-transform shadow-lg"
        >
          <span className="material-symbols-outlined">schedule</span>
          Schedule New Task
        </button>
      </section>

      {/* New Task Modal */}
      <AnimatePresence>
        {showModal && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowModal(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] w-full max-w-md mx-auto"
            />
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-surface-container-high rounded-t-[2.5rem] z-[110] p-8 pb-12 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] border-t border-outline-variant/30"
            >
              <div className="w-12 h-1.5 bg-outline-variant/30 rounded-full mx-auto mb-8" />
              <h2 className="text-2xl font-bold mb-6">Schedule Task</h2>
              
              <form onSubmit={handleScheduleTask} className="space-y-5">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-bold text-on-surface-variant tracking-widest ml-4">Select Patient</label>
                  <select 
                    required
                    value={formData.patientId}
                    onChange={(e) => setFormData({...formData, patientId: e.target.value})}
                    className="w-full bg-surface-container border border-outline-variant/30 rounded-2xl py-4 px-6 appearance-none focus:border-primary outline-none text-sm transition-colors"
                  >
                    <option value="">Choose a patient...</option>
                    {patients.map(p => (
                      <option key={p.id} value={p.id}>{p.fullName}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-bold text-on-surface-variant tracking-widest ml-4">Task Description</label>
                  <input 
                    required
                    placeholder="e.g. Antenatal Check-up"
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    className="w-full bg-surface-container border border-outline-variant/30 rounded-2xl py-4 px-6 focus:border-primary outline-none transition-colors text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-bold text-on-surface-variant tracking-widest ml-4">Task Type</label>
                    <select 
                      value={formData.type}
                      onChange={(e) => setFormData({...formData, type: e.target.value})}
                      className="w-full bg-surface-container border border-outline-variant/30 rounded-2xl py-4 px-6 appearance-none focus:border-primary outline-none text-sm transition-colors"
                    >
                      <option value="clinic">Clinic Visit</option>
                      <option value="lab">Lab Work</option>
                      <option value="home">Home Check</option>
                      <option value="sms">SMS Alert</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-bold text-on-surface-variant tracking-widest ml-4">Date & Time</label>
                    <input 
                      required
                      type="datetime-local"
                      value={formData.scheduledAt}
                      onChange={(e) => setFormData({...formData, scheduledAt: e.target.value})}
                      className="w-full bg-surface-container border border-outline-variant/30 rounded-2xl py-4 px-4 focus:border-primary outline-none transition-colors text-sm"
                    />
                  </div>
                </div>

                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-14 bg-primary text-background font-bold rounded-full mt-6 active:scale-95 transition-transform flex items-center justify-center gap-2"
                >
                  {isSubmitting ? 'Scheduling...' : (
                    <>
                      Confirm Schedule
                      <span className="material-symbols-outlined">send</span>
                    </>
                  )}
                </button>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
