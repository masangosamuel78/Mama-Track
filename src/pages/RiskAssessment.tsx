import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { motion, AnimatePresence } from 'motion/react';

export default function RiskAssessment() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [patient, setPatient] = useState<any>(null);
  const [assessing, setAssessing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPatient() {
      if (!id) return;
      const snap = await getDoc(doc(db, 'patients', id));
      if (snap.exists()) {
        setPatient({ id: snap.id, ...snap.data() });
      }
      setLoading(false);
    }
    fetchPatient();
  }, [id]);

  const runAssessment = async () => {
    if (!patient) return;
    setAssessing(true);
    setResult(null);

    try {
      const response = await fetch('/api/assess-risk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientData: {
            age: patient.age,
            weekOfPregnancy: patient.weekOfPregnancy,
            bloodType: patient.bloodType,
            riskLevel: patient.riskLevel
          },
          medicalHistory: {
            visitsCount: 1, // Mock
            lastBp: '120/80' // Mock
          }
        }),
      });

      const data = await response.json();
      setResult(data);

      // Update patient profile in DB
      await updateDoc(doc(db, 'patients', patient.id), {
        riskLevel: data.riskLevel,
        riskScore: data.riskScore
      });
      
      setPatient(prev => ({ ...prev, riskLevel: data.riskLevel, riskScore: data.riskScore }));

    } catch (error) {
      console.error('Assessment failed:', error);
    } finally {
      setAssessing(false);
    }
  };

  if (loading) return <div className="py-20 text-center text-primary">Loading data...</div>;
  if (!patient) return <div className="py-20 text-center text-error">Patient not found.</div>;

  return (
    <div className="space-y-8 pb-20">
      <header className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="material-symbols-outlined text-primary">arrow_back</button>
        <div>
          <h1 className="text-2xl font-bold">AI Risk Diagnostic</h1>
          <p className="text-xs text-on-surface-variant uppercase tracking-widest">Powered by Gemini Precision</p>
        </div>
      </header>

      <section className="bg-surface-container rounded-3xl p-6 border border-outline-variant/30 flex items-center justify-between">
        <div>
          <div className="text-xs text-on-surface-variant uppercase font-bold tracking-wider mb-1">Patient Name</div>
          <div className="text-xl font-bold">{patient.fullName}</div>
        </div>
        <div className="text-right">
          <div className="text-xs text-on-surface-variant uppercase font-bold tracking-wider mb-1">Current State</div>
          <div className={cn(
             "px-3 py-1 rounded-full text-[10px] font-bold uppercase",
             patient.riskLevel === 'high' ? "bg-error/20 text-error" : 
             patient.riskLevel === 'medium' ? "bg-tertiary/20 text-tertiary" : 
             "bg-primary/20 text-primary"
          )}>
            {patient.riskLevel} Risk
          </div>
        </div>
      </section>

      {!result && !assessing && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-surface-container rounded-3xl p-8 border border-outline-variant/30 text-center space-y-6"
        >
          <div className="w-20 h-20 rounded-full bg-primary/10 mx-auto flex items-center justify-center animate-pulse">
            <span className="material-symbols-outlined text-primary text-4xl fill-1">smart_toy</span>
          </div>
          <div>
            <h3 className="text-lg font-bold">Ready for Analysis</h3>
            <p className="text-sm text-on-surface-variant mt-2">
              The AI engine will cross-reference biometric trends, pregnancy stage, and past vitals to detect early complications.
            </p>
          </div>
          <button 
            onClick={runAssessment}
            className="w-full h-14 bg-primary text-background font-bold rounded-full shadow-[0_0_20px_rgba(70,228,240,0.3)] flex items-center justify-center gap-2 active:scale-95 transition-transform"
          >
            Run Clinical Diagnostics
          </button>
        </motion.div>
      )}

      {assessing && (
        <div className="py-20 text-center space-y-6">
          <div className="relative w-24 h-24 mx-auto mb-8">
            <div className="absolute inset-0 border-4 border-primary/20 rounded-full" />
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
              className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full shadow-[0_0_15px_rgba(70,228,240,0.4)]" 
            />
            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-center text-primary">
              <span className="material-symbols-outlined animate-bounce">neurology</span>
            </div>
          </div>
          <div>
            <h3 className="text-xl font-bold animate-pulse text-primary uppercase tracking-[0.2em] text-sm">Processing Neural Bio-Scan</h3>
            <p className="text-on-surface-variant text-xs mt-2 px-10 leading-relaxed uppercase tracking-widest">Analyzing vitals • predicting trends • generating recommendations</p>
          </div>
        </div>
      )}

      <AnimatePresence>
        {result && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-6"
          >
            {/* Risk Gauge */}
            <div className="bg-surface-container rounded-[2rem] p-8 border border-outline-variant/30 text-center relative overflow-hidden">
               <div className="relative z-10">
                  <div className="text-[10px] uppercase font-bold text-on-surface-variant tracking-[0.2em] mb-4">Calculated Risk Index</div>
                  <div className="text-7xl font-black mb-2 flex justify-center items-end gap-1">
                    <span className={cn(
                      result.riskLevel === 'high' ? "text-error" : 
                      result.riskLevel === 'medium' ? "text-tertiary" : 
                      "text-primary"
                    )}>
                      {result.riskScore}
                    </span>
                    <span className="text-xl text-on-surface-variant mb-3 font-medium opacity-50">%</span>
                  </div>
                  <div className={cn(
                    "inline-block px-6 py-2 rounded-full font-bold uppercase text-xs tracking-widest",
                    result.riskLevel === 'high' ? "bg-error text-background" : 
                    result.riskLevel === 'medium' ? "bg-tertiary text-background" : 
                    "bg-primary text-background"
                  )}>
                    {result.riskLevel} Priority Case
                  </div>
               </div>
               {/* Background Glow */}
               <div className={cn(
                 "absolute inset-x-0 bottom-0 h-40 opacity-20 blur-[60px]",
                 result.riskLevel === 'high' ? "bg-error" : 
                 result.riskLevel === 'medium' ? "bg-tertiary" : 
                 "bg-primary"
               )} />
            </div>

            {/* AI Insight Card */}
            <div className="bg-surface-container rounded-3xl p-6 border border-outline-variant/30 relative overflow-hidden group">
               <div className="flex items-center gap-3 mb-4">
                  <span className="material-symbols-outlined text-primary text-xl">psychology</span>
                  <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Clinical Analysis</span>
               </div>
               <p className="text-sm leading-relaxed text-on-surface">{result.insight}</p>
            </div>

            {/* Recommendations */}
            <section className="space-y-4">
               <h3 className="text-xs font-bold text-on-surface-variant uppercase tracking-widest pl-2">AI-Driven Interventions</h3>
               <div className="space-y-3">
                  {result.recommendedActions.map((action: string, idx: number) => (
                    <div key={idx} className="bg-surface-container rounded-2xl p-4 border border-outline-variant/30 flex gap-4 items-center group active:border-primary/50 transition-colors">
                       <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-bold shrink-0">
                          {idx + 1}
                       </div>
                       <span className="text-sm text-on-surface leading-tight">{action}</span>
                    </div>
                  ))}
               </div>
            </section>

            <button 
              onClick={() => navigate(`/patients/${id}`)}
              className="w-full h-14 border border-outline-variant bg-surface-container text-on-surface font-bold rounded-full flex items-center justify-center gap-2 active:scale-95 transition-transform"
            >
              Verify & Save to Records
              <span className="material-symbols-outlined">check_circle</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
