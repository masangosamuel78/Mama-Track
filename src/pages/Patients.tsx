import React, { useEffect, useState } from 'react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';
import { Link } from 'react-router-dom';

export default function Patients() {
  const { profile } = useAuth();
  const [patients, setPatients] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'name' | 'datedesc'>('datedesc');

  useEffect(() => {
    async function fetchPatients() {
      if (!profile?.uid) return;
      try {
        let q;
        if (profile.role === 'admin') {
          q = query(
            collection(db, 'patients'),
            orderBy('createdAt', 'desc')
          );
        } else {
          q = query(
            collection(db, 'patients'),
            where('assignedMidwifeId', '==', profile.uid),
            orderBy('createdAt', 'desc')
          );
        }
        const snapshot = await getDocs(q);
        setPatients(snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) })));
      } catch (err) {
        console.error('Error fetching patients:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchPatients();
  }, [profile]);

  const filteredPatients = patients.filter(p => {
    const matchesSearch = p.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || p.id?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filter === 'all' || p.riskLevel === filter;
    return matchesSearch && matchesFilter;
  });

  const sortedPatients = [...filteredPatients].sort((a, b) => {
    if (sortBy === 'name') {
      return a.fullName.localeCompare(b.fullName);
    }
    // Default: datedesc (though the initial fetch is already sorted if from FB, but local filtering/sorting might be needed)
    return 0; 
  });

  return (
    <div className="space-y-6">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold">Patients</h1>
          <p className="text-on-surface-variant text-sm">Active records under your care.</p>
        </div>
        <Link to="/patients/new" className="text-primary material-symbols-outlined text-3xl">person_add</Link>
      </header>

      {/* Search & Filter */}
      <div className="space-y-4">
        <div className="flex gap-2 items-center">
          <div className="relative flex-1">
            <input 
              type="text" 
              placeholder="Search patients..."
              className="w-full bg-surface-container border border-outline-variant/30 rounded-full py-4 px-12 focus:outline-none focus:border-primary transition-colors text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant text-xl">search</span>
          </div>
          <button 
            onClick={() => setSortBy(sortBy === 'name' ? 'datedesc' : 'name')}
            className={cn(
              "w-12 h-12 rounded-2xl flex items-center justify-center border transition-colors shrink-0",
              sortBy === 'name' ? "bg-primary/20 border-primary text-primary" : "bg-surface-container border-outline-variant/30 text-on-surface-variant hover:bg-surface-container-high"
            )}
            title={sortBy === 'name' ? "Sorted by Name (A-Z)" : "Sort by Name"}
          >
            <span className="material-symbols-outlined text-xl">sort_by_alpha</span>
          </button>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
          {['all', 'high', 'medium', 'low'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-5 py-2 rounded-full text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all",
                filter === f ? "bg-primary text-background shadow-[0_0_15px_rgba(70,228,240,0.2)]" : "bg-surface-container-high text-on-surface-variant border border-outline-variant/20"
              )}
            >
              {f === 'all' ? 'All Patients' : `${f} Risk`}
            </button>
          ))}
        </div>
      </div>

      {/* Patient List */}
      <div className="space-y-3">
        {loading ? (
          <div className="py-20 text-center text-on-surface-variant">Loading health records...</div>
        ) : sortedPatients.length === 0 ? (
          <div className="py-20 text-center">
            <span className="material-symbols-outlined text-5xl mb-4 text-on-surface-variant opacity-20">search_off</span>
            <p className="text-on-surface-variant">No patients match your search criteria.</p>
          </div>
        ) : (
          sortedPatients.map(patient => (
            <Link 
              key={patient.id} 
              to={`/patients/${patient.id}`}
              className="bg-surface-container rounded-2xl p-5 border border-outline-variant/30 flex justify-between items-center active:scale-[0.98] transition-transform group"
            >
              <div className="flex gap-4 items-center flex-1">
                <div className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105",
                  patient.riskLevel === 'high' ? "bg-error/10" : 
                  patient.riskLevel === 'medium' ? "bg-tertiary/10" : 
                  "bg-primary/10"
                )}>
                  <span className={cn(
                    "material-symbols-outlined",
                    patient.riskLevel === 'high' ? "text-error" : 
                    patient.riskLevel === 'medium' ? "text-tertiary" : 
                    "text-primary"
                  )}>person</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="font-bold truncate">{patient.fullName}</div>
                    <div className={cn(
                      "px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest",
                      patient.riskScore > 75 ? "bg-error text-white" : 
                      patient.riskScore > 40 ? "bg-tertiary text-white" : 
                      "bg-primary/20 text-primary"
                    )}>
                      Score: {patient.riskScore}%
                    </div>
                  </div>
                  <div className="text-[10px] text-on-surface-variant uppercase tracking-wide font-bold mt-0.5">
                    {patient.location} • Week {patient.weekOfPregnancy || 0}
                  </div>
                  <div className="text-[8px] text-on-surface-variant/60 uppercase tracking-[0.2em] mt-1 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[10px]">medical_services</span>
                    Midwife: {patient.assignedMidwifeName || profile?.fullName || 'Assigned'}
                  </div>
                </div>
              </div>
              <span className="material-symbols-outlined text-on-surface-variant transform group-hover:translate-x-1 transition-transform">chevron_right</span>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
