import React, { useEffect, useState } from 'react';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const { profile } = useAuth();
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPatients() {
      if (!profile?.uid) return;
      try {
        const q = query(
          collection(db, 'patients'), 
          where('assignedMidwifeId', '==', profile.uid),
          limit(5)
        );
        const snapshot = await getDocs(q);
        setPatients(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (error) {
        console.error('Error fetching patients:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchPatients();
  }, [profile]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header>
        <h2 className="text-sm font-bold text-on-surface-variant uppercase tracking-widest mb-1">Overview</h2>
        <h1 className="text-3xl font-bold">Hello, {profile?.fullName?.split(' ')[0]}</h1>
        <p className="text-on-surface-variant">System-wide performance & monitoring</p>
      </header>

      {/* Stats Cards */}
      <section className="grid grid-cols-2 gap-4">
        <div className="bg-surface-container rounded-2xl p-5 border border-outline-variant/30">
          <div className="flex justify-between items-start mb-4">
            <span className="material-symbols-outlined text-primary">groups</span>
            <span className="text-[10px] text-primary bg-primary/10 px-2 py-0.5 rounded-full font-bold">+4.2%</span>
          </div>
          <div className="text-2xl font-bold">12,842</div>
          <div className="text-[10px] text-on-surface-variant uppercase tracking-tighter">Total Patients</div>
        </div>
        <div className="bg-surface-container rounded-2xl p-5 border border-outline-variant/30">
          <div className="flex justify-between items-start mb-4">
            <span className="material-symbols-outlined text-tertiary">clinical_notes</span>
          </div>
          <div className="text-2xl font-bold">840</div>
          <div className="text-[10px] text-on-surface-variant uppercase tracking-tighter">Active Cases</div>
        </div>
      </section>

      {/* Alerts */}
      <section className="bg-error-container/10 border border-error/30 rounded-2xl p-5 flex gap-4 items-center">
        <div className="w-12 h-12 rounded-full bg-error/20 flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined text-error fill-1">warning</span>
        </div>
        <div>
          <div className="font-bold text-error">8 Overdue Visits</div>
          <p className="text-xs text-on-surface-variant">Critical follow-ups needed in Mwanzo Village.</p>
        </div>
      </section>

      {/* Active Patients */}
      <section className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">Active Patients</h3>
          <Link to="/patients" className="text-xs text-primary font-bold">View All</Link>
        </div>

        <div className="space-y-3">
          {loading ? (
            <div className="text-on-surface-variant text-sm">Loading patients...</div>
          ) : patients.length === 0 ? (
            <div className="bg-surface-container rounded-2xl p-8 border border-outline-variant/30 text-center">
              <span className="material-symbols-outlined text-4xl text-on-surface-variant mb-2 opacity-30">person_off</span>
              <p className="text-on-surface-variant text-sm">No patients assigned to you yet.</p>
              <Link to="/patients/new" className="mt-4 inline-block text-primary text-sm font-bold border border-primary px-4 py-2 rounded-full transition-colors hover:bg-primary hover:text-background">Add Patient</Link>
            </div>
          ) : (
            patients.map(patient => (
              <Link 
                key={patient.id} 
                to={`/patients/${patient.id}`}
                className="bg-surface-container rounded-2xl p-4 border border-outline-variant/30 flex items-center justify-between hover:border-primary/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-surface-container-high flex items-center justify-center">
                    <span className="material-symbols-outlined text-on-surface-variant">person</span>
                  </div>
                  <div>
                    <div className="font-bold">{patient.fullName}</div>
                    <div className="text-xs text-on-surface-variant">{patient.location || 'Unknown Village'} • Week {patient.weekOfPregnancy || 0}</div>
                  </div>
                </div>
                <div className={cn(
                  "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                  patient.riskLevel === 'high' ? "bg-error/20 text-error" : 
                  patient.riskLevel === 'medium' ? "bg-tertiary/20 text-tertiary" : 
                  "bg-primary/20 text-primary"
                )}>
                  {patient.riskLevel || 'Unknown'}
                </div>
              </Link>
            ))
          )}
        </div>
      </section>

      {/* Floating Action Button */}
      <Link 
        to="/patients/new"
        className="fixed bottom-24 right-5 w-14 h-14 bg-primary-container rounded-full shadow-2xl flex items-center justify-center text-on-primary-container z-40 active:scale-95 transition-transform"
      >
        <span className="material-symbols-outlined text-3xl font-bold">add</span>
      </Link>
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
