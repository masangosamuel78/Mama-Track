import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { collection, addDoc, serverTimestamp, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';

const patientSchema = z.object({
  fullName: z.string().min(2, 'Full name is required'),
  age: z.number().min(12, 'Must be at least 12'),
  phoneNumber: z.string().min(8, 'Phone number is required'),
  location: z.string().min(2, 'Location is required'),
  bloodType: z.string().optional(),
  assignedMidwifeId: z.string().min(1, 'Please select a midwife'),
});

type PatientForm = z.infer<typeof patientSchema>;

export default function NewPatient() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [midwives, setMidwives] = useState<any[]>([]);

  useEffect(() => {
    async function fetchMidwives() {
      try {
        const querySnapshot = await getDocs(collection(db, 'midwives'));
        setMidwives(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (err) {
        console.error('Error fetching midwives:', err);
      }
    }
    fetchMidwives();
  }, []);

  const { register, handleSubmit, formState: { errors } } = useForm<PatientForm>({
    resolver: zodResolver(patientSchema),
    defaultValues: {
      assignedMidwifeId: profile?.uid || ''
    }
  });

  const onSubmit = async (data: PatientForm) => {
    if (!profile?.uid) return;
    setLoading(true);
    try {
      const selectedMidwife = midwives.find(m => m.id === data.assignedMidwifeId);
      const docRef = await addDoc(collection(db, 'patients'), {
        ...data,
        assignedMidwifeName: selectedMidwife?.fullName || profile.fullName || 'Unknown',
        createdAt: serverTimestamp(),
        riskLevel: 'low', // Default
        riskScore: 0,
        weekOfPregnancy: 0,
      });
      navigate(`/patients/${docRef.id}`);
    } catch (error) {
      console.error('Error adding patient:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-in slide-in-from-right duration-300">
      <header>
        <div className="flex items-center gap-3 mb-2">
          <button onClick={() => navigate(-1)} className="material-symbols-outlined text-primary">arrow_back</button>
          <h2 className="text-sm font-bold text-primary uppercase tracking-widest">Registration</h2>
        </div>
        <h1 className="text-4xl font-bold">New Patient</h1>
        <div className="mt-4 flex items-center justify-between text-xs font-bold text-on-surface-variant">
          <span>STEP {step} OF 2</span>
          <span>{step === 1 ? 'Personal Details' : 'Medical Background'}</span>
        </div>
        <div className="mt-2 h-1 w-full bg-surface-container rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: '50%' }}
            animate={{ width: step === 1 ? '50%' : '100%' }}
            className="h-full bg-primary" 
          />
        </div>
      </header>

      <form onSubmit={handleSubmit((data) => onSubmit(data))} className="space-y-6 pb-12">
        <div className="space-y-5">
          <div className="space-y-2">
            <label className="text-[10px] uppercase font-bold tracking-widest text-on-surface-variant ml-4">Full Name</label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant">person</span>
              <input 
                {...register('fullName')}
                placeholder="Enter patient name"
                className="w-full bg-surface-container border border-outline-variant/30 rounded-2xl py-4 px-12 focus:border-primary focus:outline-none transition-colors"
                disabled={loading}
              />
            </div>
            {errors.fullName && <p className="text-error text-xs ml-4">{errors.fullName.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-bold tracking-widest text-on-surface-variant ml-4">Age</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant">calendar_today</span>
                <input 
                  {...register('age', { valueAsNumber: true })}
                  type="number"
                  placeholder="Years"
                  className="w-full bg-surface-container border border-outline-variant/30 rounded-2xl py-4 px-12 focus:border-primary focus:outline-none transition-colors"
                  disabled={loading}
                />
              </div>
              {errors.age && <p className="text-error text-xs ml-4">{errors.age.message}</p>}
            </div>
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-bold tracking-widest text-on-surface-variant ml-4">Phone</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant">call</span>
                <input 
                  {...register('phoneNumber')}
                  placeholder="Mobile"
                  className="w-full bg-surface-container border border-outline-variant/30 rounded-2xl py-4 px-12 focus:border-primary focus:outline-none transition-colors"
                  disabled={loading}
                />
              </div>
              {errors.phoneNumber && <p className="text-error text-xs ml-4">{errors.phoneNumber.message}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] uppercase font-bold tracking-widest text-on-surface-variant ml-4">Village / Location</label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant">location_on</span>
              <input 
                {...register('location')}
                placeholder="Search location"
                className="w-full bg-surface-container border border-outline-variant/30 rounded-2xl py-4 px-12 focus:border-primary focus:outline-none transition-colors"
                disabled={loading}
              />
            </div>
            {errors.location && <p className="text-error text-xs ml-4">{errors.location.message}</p>}
          </div>
          <div className="space-y-2">
            <label className="text-[10px] uppercase font-bold tracking-widest text-on-surface-variant ml-4">Assigned Midwife</label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant">clinical_notes</span>
              <select 
                {...register('assignedMidwifeId')}
                className="w-full bg-surface-container border border-outline-variant/30 rounded-2xl py-4 px-12 focus:border-primary focus:outline-none transition-colors appearance-none text-sm"
                disabled={loading}
              >
                <option value="">Select a midwife...</option>
                {midwives.map(m => (
                  <option key={m.id} value={m.id}>{m.fullName} {m.clinic ? `(${m.clinic})` : ''}</option>
                ))}
              </select>
              <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none">expand_more</span>
            </div>
            {errors.assignedMidwifeId && <p className="text-error text-xs ml-4">{errors.assignedMidwifeId.message}</p>}
          </div>
        </div>

        <div className="bg-primary/5 border border-primary/20 rounded-2xl p-5 flex gap-4">
          <span className="material-symbols-outlined text-primary shrink-0">info</span>
          <p className="text-xs text-on-surface-variant leading-relaxed">
            Accurate personal details ensure proper patient tracking and reliable reminder delivery via SMS.
          </p>
        </div>

        <button 
          type="submit"
          disabled={loading}
          className="w-full h-14 bg-primary text-background font-bold rounded-full shadow-[0_0_20px_rgba(70,228,240,0.3)] flex items-center justify-center gap-2 active:scale-95 transition-transform"
        >
          {loading ? 'Registering...' : (
            <>
              Next Step
              <span className="material-symbols-outlined">arrow_forward</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}
