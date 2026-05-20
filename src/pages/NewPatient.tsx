import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { collection, addDoc, serverTimestamp, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { calculateEDD, calculateWeeks } from '../lib/pregnancy';

const patientSchema = z.object({
  fullName: z.string().min(2, 'Full name is required'),
  age: z.number().min(12, 'Must be at least 12'),
  phoneNumber: z.string().min(8, 'Phone number is required'),
  location: z.string().min(2, 'Location is required'),
  bloodType: z.string().optional(),
  assignedMidwifeId: z.string().min(1, 'Please select a midwife'),
  lmpDate: z.string().min(1, 'Last Menstrual Period is required'),
  eddDate: z.string().min(1, 'Estimated Due Date is required'),
  eddOverridden: z.boolean(),
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

  const { register, handleSubmit, formState: { errors }, trigger, watch, setValue } = useForm<PatientForm>({
    resolver: zodResolver(patientSchema),
    defaultValues: {
      fullName: '',
      age: undefined as any,
      phoneNumber: '',
      location: '',
      assignedMidwifeId: profile?.uid || '',
      bloodType: 'O Positive',
      lmpDate: '',
      eddDate: '',
      eddOverridden: false,
    }
  });

  const watchLmpDate = watch('lmpDate');
  const watchEddOverridden = watch('eddOverridden');

  // Automatically calculate EDD when LMP changes, unless override is active
  useEffect(() => {
    if (watchLmpDate && !watchEddOverridden) {
      const computedEdd = calculateEDD(watchLmpDate);
      setValue('eddDate', computedEdd, { shouldValidate: true });
    }
  }, [watchLmpDate, watchEddOverridden, setValue]);

  const calculatedWeeks = watchLmpDate ? calculateWeeks(watchLmpDate) : 0;

  const handleNextStep = async () => {
    const isStep1Valid = await trigger([
      'fullName',
      'age',
      'phoneNumber',
      'location',
      'assignedMidwifeId'
    ]);
    if (isStep1Valid) {
      setStep(2);
    }
  };

  const onSubmit = async (data: PatientForm) => {
    if (!profile?.uid) return;
    setLoading(true);
    try {
      const selectedMidwife = midwives.find(m => m.id === data.assignedMidwifeId);
      const finalWeeks = data.lmpDate ? calculateWeeks(data.lmpDate) : 0;

      const docRef = await addDoc(collection(db, 'patients'), {
        fullName: data.fullName,
        age: data.age,
        phoneNumber: data.phoneNumber,
        location: data.location,
        bloodType: data.bloodType || 'Unknown',
        assignedMidwifeId: data.assignedMidwifeId,
        assignedMidwifeName: selectedMidwife?.fullName || profile.fullName || 'Unknown',
        createdAt: serverTimestamp(),
        riskLevel: 'low', // Default
        riskScore: 0,
        lmpDate: data.lmpDate,
        eddDate: data.eddDate,
        eddOverridden: data.eddOverridden,
        weekOfPregnancy: finalWeeks,
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
          <button 
            type="button"
            onClick={() => step === 2 ? setStep(1) : navigate(-1)} 
            className="material-symbols-outlined text-primary"
          >
            arrow_back
          </button>
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

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 pb-12">
        <AnimatePresence mode="wait">
          {step === 1 ? (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.2 }}
              className="space-y-5"
            >
              {/* Full Name */}
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

              {/* Age & Phone */}
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

              {/* Village/Location */}
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

              {/* Assigned Midwife */}
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

              <div className="bg-primary/5 border border-primary/20 rounded-2xl p-5 flex gap-4 mt-6">
                <span className="material-symbols-outlined text-primary shrink-0">info</span>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  Carefully verified clinical assignments ensure all communications and digital notifications reach the appropriate practitioner.
                </p>
              </div>

              <button 
                type="button"
                onClick={handleNextStep}
                className="w-full h-14 bg-primary text-background font-bold rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-transform mt-6"
              >
                Continue to Medical Info
                <span className="material-symbols-outlined">arrow_forward</span>
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              {/* Last Menstrual Period Date */}
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold tracking-widest text-on-surface-variant ml-4">Last Menstrual Period (LMP)</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant">calendar_view_day</span>
                  <input 
                    {...register('lmpDate')}
                    type="date"
                    className="w-full bg-surface-container border border-outline-variant/30 rounded-2xl py-4 px-12 focus:border-primary focus:outline-none transition-colors text-sm"
                    disabled={loading}
                  />
                </div>
                {errors.lmpDate && <p className="text-error text-xs ml-4">{errors.lmpDate.message}</p>}
              </div>

              {/* Automatic Calculation Card Banner */}
              {watchLmpDate && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-primary/5 border border-primary/20 rounded-3xl p-5 space-y-3"
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-[10px] uppercase font-bold tracking-widest text-primary">Autocalculated Gestational Age</span>
                      <h4 className="text-2xl font-black text-primary mt-1">Week {calculatedWeeks}</h4>
                    </div>
                    <span className="material-symbols-outlined text-primary text-3xl">maternal_health</span>
                  </div>
                  <p className="text-xs text-on-surface-variant leading-relaxed">
                    Based on standard clinical conventions, an Estimated Due Date (EDD) of 40 weeks has been calculated from the provided Last Menstrual Period date.
                  </p>
                </motion.div>
              )}

              {/* Manual Override Flag */}
              <div className="bg-surface-container rounded-2xl p-5 border border-outline-variant/30 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-on-surface-variant">edit_calendar</span>
                  <div>
                    <div className="text-sm font-bold">Manual EDD Override</div>
                    <div className="text-[10px] text-on-surface-variant">Ultrasound verified or custom due date</div>
                  </div>
                </div>
                <input 
                  type="checkbox"
                  {...register('eddOverridden')}
                  className="w-5 h-5 accent-primary rounded cursor-pointer"
                  disabled={loading}
                />
              </div>

              {/* Estimated Due Date (EDD) Picker */}
              <div className="space-y-2">
                <div className="flex justify-between items-center ml-4 pr-1">
                  <label className="text-[10px] uppercase font-bold tracking-widest text-on-surface-variant">
                    Estimated Due Date (EDD)
                  </label>
                  {!watchEddOverridden && watchLmpDate && (
                    <span className="text-[8px] uppercase font-bold tracking-widest text-primary/70">
                      Standard Clinical Match
                    </span>
                  )}
                </div>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant">event</span>
                  <input 
                    {...register('eddDate')}
                    type="date"
                    className={`w-full bg-surface-container border rounded-2xl py-4 px-12 focus:outline-none transition-colors text-sm ${
                      watchEddOverridden 
                        ? 'border-primary/50 focus:border-primary text-on-surface' 
                        : 'border-outline-variant/30 text-on-surface-variant opacity-80 pointer-events-none'
                    }`}
                    disabled={loading || !watchEddOverridden}
                  />
                </div>
                {errors.eddDate && <p className="text-error text-xs ml-4">{errors.eddDate.message}</p>}
                {!watchEddOverridden && (
                  <p className="text-[10px] text-on-surface-variant/70 ml-4">
                    Unlock "Manual EDD Override" to input a date determined by scan or custom diagnosis.
                  </p>
                )}
              </div>

              {/* Blood Type Picker */}
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold tracking-widest text-on-surface-variant ml-4">Blood Type</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant">bloodtype</span>
                  <select 
                    {...register('bloodType')}
                    className="w-full bg-surface-container border border-outline-variant/30 rounded-2xl py-4 px-12 focus:border-primary focus:outline-none transition-colors appearance-none text-sm"
                    disabled={loading}
                  >
                    <option value="A Positive">A Positive (A+)</option>
                    <option value="A Negative">A Negative (A-)</option>
                    <option value="B Positive">B Positive (B+)</option>
                    <option value="B Negative">B Negative (B-)</option>
                    <option value="O Positive">O Positive (O+)</option>
                    <option value="O Negative">O Negative (O-)</option>
                    <option value="AB Positive">AB Positive (AB+)</option>
                    <option value="AB Negative">AB Negative (AB-)</option>
                    <option value="Unknown">Unknown / Pending Test</option>
                  </select>
                  <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none">expand_more</span>
                </div>
                {errors.bloodType && <p className="text-error text-xs ml-4">{errors.bloodType.message}</p>}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 pt-4">
                <button 
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex-1 h-14 bg-surface-container border border-outline-variant/30 text-on-surface font-bold rounded-2xl active:scale-95 transition-transform"
                  disabled={loading}
                >
                  Back
                </button>
                <button 
                  type="submit"
                  disabled={loading}
                  className="flex-[2] h-14 bg-primary text-background font-bold rounded-2xl shadow-[0_0_20px_rgba(70,228,240,0.3)] flex items-center justify-center gap-2 active:scale-95 transition-transform"
                >
                  {loading ? 'Registering...' : (
                    <>
                      Create Record
                      <span className="material-symbols-outlined">check</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </form>
    </div>
  );
}
