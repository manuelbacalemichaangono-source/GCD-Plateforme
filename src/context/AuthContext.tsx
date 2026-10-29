import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import {
  auth,
  db,
  ensureInitialCatalogSeeded,
  handleFirestoreError,
  OperationType,
} from '../firebase';
import { SEED_ADMIN_EMAIL } from '../config/constants';
import { CandidatureRecord, PersonnelRecord, PersonnelRole } from '../types/cedoc';

export type AccountKind = 'visitor' | 'candidat' | 'doctorant' | 'personnel';

interface AuthContextValue {
  user: User | null;
  authReady: boolean;
  accountKind: AccountKind;
  personnel: PersonnelRecord | null;
  activePersonnelRole: PersonnelRole | null;
  setActivePersonnelRole: (role: PersonnelRole | null) => void;
  candidature: CandidatureRecord | null;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  registerCandidat: (nom: string, email: string, password: string) => Promise<User>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [personnel, setPersonnel] = useState<PersonnelRecord | null>(null);
  const [activePersonnelRole, setActivePersonnelRole] = useState<PersonnelRole | null>(null);
  const [candidature, setCandidature] = useState<CandidatureRecord | null>(null);

  useEffect(() => {
    let unsubCandidature: (() => void) | null = null;
    let unsubPersonnel: (() => void) | null = null;

    const unsubAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (unsubCandidature) {
        unsubCandidature();
        unsubCandidature = null;
      }
      if (unsubPersonnel) {
        unsubPersonnel();
        unsubPersonnel = null;
      }

      setUser(firebaseUser);

      if (!firebaseUser) {
        setPersonnel(null);
        setActivePersonnelRole(null);
        setCandidature(null);
        setAuthReady(true);
        return;
      }

      setAuthReady(false);
      const emailLower = (firebaseUser.email ?? '').trim().toLowerCase();

      // Seed bootstrap rule for Aladinmonroe0@gmail.com
      if (emailLower === SEED_ADMIN_EMAIL) {
        try {
          const seedRef = doc(db, 'personnel', SEED_ADMIN_EMAIL);
          const seedSnap = await getDoc(seedRef);
          if (!seedSnap.exists()) {
            await setDoc(seedRef, {
              email: SEED_ADMIN_EMAIL,
              nom: firebaseUser.displayName?.trim() || 'Directeur CEDoc',
              roles: ['Directeur du CEDoc'],
              laboratoire: '',
              updatedAt: serverTimestamp(),
            });
          }
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, `personnel/${SEED_ADMIN_EMAIL}`);
        }
      }

      // One-time catalog initialization into Firestore if empty
      await ensureInitialCatalogSeeded();

      // Check personnel record first
      let initialPersonnel: PersonnelRecord | null = null;
      if (emailLower) {
        try {
          const pRef = doc(db, 'personnel', emailLower);
          const pSnap = await getDoc(pRef);
          if (pSnap.exists()) {
            const d = pSnap.data();
            initialPersonnel = {
              email: String(d.email ?? emailLower),
              nom: String(d.nom ?? ''),
              roles: Array.isArray(d.roles) ? (d.roles as PersonnelRole[]) : [],
              laboratoire: String(d.laboratoire ?? ''),
            };
          }
        } catch (err) {
          handleFirestoreError(err, OperationType.GET, `personnel/${emailLower}`);
        }
      }

      if (initialPersonnel && initialPersonnel.roles.length > 0) {
        setPersonnel(initialPersonnel);
        setActivePersonnelRole(
          initialPersonnel.roles.length === 1 ? initialPersonnel.roles[0] : null
        );
        setCandidature(null);

        const pRef = doc(db, 'personnel', emailLower);
        unsubPersonnel = onSnapshot(
          pRef,
          (snap) => {
            if (!snap.exists()) {
              setPersonnel(null);
              setActivePersonnelRole(null);
              return;
            }
            const d = snap.data();
            const roles = Array.isArray(d.roles) ? (d.roles as PersonnelRole[]) : [];
            setPersonnel({
              email: String(d.email ?? emailLower),
              nom: String(d.nom ?? ''),
              roles,
              laboratoire: String(d.laboratoire ?? ''),
            });
            setActivePersonnelRole((prev) =>
              prev && roles.includes(prev) ? prev : roles.length === 1 ? roles[0] : null
            );
          },
          (err) => {
            handleFirestoreError(err, OperationType.GET, `personnel/${emailLower}`);
          }
        );

        setAuthReady(true);
        return;
      }

      // Otherwise treat as Candidat / Doctorant and listen to own candidature
      setPersonnel(null);
      setActivePersonnelRole(null);

      const candRef = doc(db, 'candidatures', firebaseUser.uid);
      unsubCandidature = onSnapshot(
        candRef,
        (snap) => {
          if (!snap.exists()) {
            setCandidature(null);
          } else {
            const d = snap.data();
            setCandidature({
              candidatId: String(d.candidatId ?? firebaseUser.uid),
              nom: String(d.nom ?? ''),
              email: String(d.email ?? emailLower),
              sujetId: String(d.sujetId ?? ''),
              sujetIntitule: String(d.sujetIntitule ?? ''),
              sujetDescription: String(d.sujetDescription ?? ''),
              sujetDiscipline: String(d.sujetDiscipline ?? ''),
              directeur: String(d.directeur ?? ''),
              directeurEmail: String(d.directeurEmail ?? ''),
              laboratoire: String(d.laboratoire ?? ''),
              universiteOrigine: (d.universiteOrigine as '' | 'EST Fès' | 'Autre') ?? '',
              cne: String(d.cne ?? ''),
              recuperationAuto: Boolean(d.recuperationAuto),
              statut: d.statut,
              nouveauDelai: String(d.nouveauDelai ?? ''),
              convocationDate: String(d.convocationDate ?? ''),
              convocationLieu: String(d.convocationLieu ?? ''),
              recoursDepose: Boolean(d.recoursDepose),
              recoursMotif: String(d.recoursMotif ?? ''),
            });
          }
          setAuthReady(true);
        },
        (err) => {
          handleFirestoreError(err, OperationType.GET, `candidatures/${firebaseUser.uid}`);
        }
      );
    });

    return () => {
      unsubAuth();
      if (unsubCandidature) unsubCandidature();
      if (unsubPersonnel) unsubPersonnel();
    };
  }, []);

  const accountKind: AccountKind = !user
    ? 'visitor'
    : personnel && personnel.roles.length > 0
    ? 'personnel'
    : candidature?.statut === 'Inscrit'
    ? 'doctorant'
    : 'candidat';

  const loginWithEmail = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
  };

  const registerCandidat = async (nom: string, email: string, password: string) => {
    const cleanEmail = email.trim().toLowerCase();
    const cred = await createUserWithEmailAndPassword(auth, cleanEmail, password);
    if (nom.trim()) {
      await updateProfile(cred.user, { displayName: nom.trim().slice(0, 120) });
    }
    return cred.user;
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email.trim().toLowerCase());
  };

  const logout = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        authReady,
        accountKind,
        personnel,
        activePersonnelRole,
        setActivePersonnelRole,
        candidature,
        loginWithEmail,
        registerCandidat,
        resetPassword,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
