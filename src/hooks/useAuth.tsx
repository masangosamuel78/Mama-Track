import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User, 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword
} from 'firebase/auth';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';

interface AuthContextType {
  user: User | null;
  profile: any | null;
  loading: boolean;
  login: () => Promise<void>;
  loginWithEmail: (email: string, password: string) => Promise<any>;
  signupPatient: (email: string, password: string, patientData: any) => Promise<any>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeProfile: (() => void) | undefined;

    const unsubscribeAuth = onAuthStateChanged(auth, async (currUser) => {
      setUser(currUser);
      if (currUser) {
        // Look up profile inside 'users' collection
        const userDocRef = doc(db, 'users', currUser.uid);
        
        unsubscribeProfile = onSnapshot(userDocRef, async (docSnap) => {
          if (docSnap.exists()) {
            setProfile(docSnap.data());
            setLoading(false);
          } else {
            // Profile doc doesn't exist in unified users. Let's do dynamic setup
            try {
              if (currUser.email === 'admin@mamatrack.com') {
                const adminProfile = {
                  uid: currUser.uid,
                  fullName: 'System Administrator',
                  email: currUser.email || '',
                  role: 'admin',
                  clinic: 'MamaTrack HQ',
                  createdAt: new Date().toISOString(),
                };
                await setDoc(userDocRef, adminProfile);
                setProfile(adminProfile);
              } else {
                // Check if they are in 'midwives' collection
                const midwifeDocRef = doc(db, 'midwives', currUser.uid);
                const mSnap = await getDoc(midwifeDocRef);
                if (mSnap.exists()) {
                  const mData = mSnap.data();
                  const profileData = {
                    ...mData,
                    uid: currUser.uid,
                    role: 'midwife',
                    fullName: mData.fullName || currUser.displayName || 'Unnamed Midwife'
                  };
                  await setDoc(userDocRef, profileData);
                  setProfile(profileData);
                } else {
                  // Default to patient
                  const defaultPatientProfile = {
                    uid: currUser.uid,
                    fullName: currUser.displayName || 'Unnamed Patient',
                    email: currUser.email || '',
                    role: 'patient',
                    patientId: currUser.uid,
                    createdAt: new Date().toISOString(),
                  };
                  await setDoc(userDocRef, defaultPatientProfile);
                  setProfile(defaultPatientProfile);
                }
              }
            } catch (err) {
              console.error("Profile dynamic setup error in subscriber:", err);
            }
            setLoading(false);
          }
        }, (error) => {
          console.error("Profile sync error inside subscribe:", error);
          setLoading(false);
          handleFirestoreError(error, OperationType.GET, `users/${currUser.uid}`);
        });
      } else {
        setProfile(null);
        if (unsubscribeProfile) unsubscribeProfile();
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, []);

  const login = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const loginWithEmail = async (email: string, password: string) => {
    return await signInWithEmailAndPassword(auth, email, password);
  };

  const signupPatient = async (email: string, password: string, patientData: any) => {
    // 1. Create auth account
    const creds = await createUserWithEmailAndPassword(auth, email, password);
    const uid = creds.user.uid;

    // 2. Add as a patient document
    const patientDocRef = doc(db, 'patients', uid);
    const resolvedPatient = {
      id: uid,
      ...patientData,
      createdAt: new Date().toISOString()
    };
    await setDoc(patientDocRef, resolvedPatient);

    // 3. Add to 'users' container
    const userDocRef = doc(db, 'users', uid);
    const userProfile = {
      uid,
      fullName: patientData.fullName,
      email,
      role: 'patient',
      patientId: uid,
      createdAt: new Date().toISOString()
    };
    await setDoc(userDocRef, userProfile);

    return creds;
  };

  const logout = async () => {
    await signOut(auth);
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, login, loginWithEmail, signupPatient, logout, resetPassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
