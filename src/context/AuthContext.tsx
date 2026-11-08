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
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import {
  auth,
  db,
  ensureInitialCatalogSeeded,
  handleFirestoreError,
  OperationType,
  signInWithGooglePopup,
} from '../firebase';
import {
  CandidateProfile,
  CandidatureRecord,
  PieceDossierRecord,
  PieceSlotPreselection,
  SujetRecord,
} from '../types/cedoc';

interface AuthContextValue {
  user: User | null;
  authReady: boolean;
  profile: CandidateProfile;
  candidature: CandidatureRecord | null;
  piecesMap: Record<string, PieceDossierRecord>;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<User>;
  registerCandidate: (nom: string, prenom: string, email: string, password: string) => Promise<User>;
  resetPassword: (email: string) => Promise<void>;
  updateProfileData: (data: Partial<CandidateProfile>) => Promise<void>;
  saveCandidatureDossier: (
    sujets: SujetRecord[],
    universiteOrigine: 'EST Fès' | 'Autre',
    cne: string,
    recuperationAuto: boolean
  ) => Promise<void>;
  submitCandidatureFinale: () => Promise<void>;
  saveUploadedPiece: (
    slotId: PieceSlotPreselection,
    label: string,
    fileName: string,
    mimeType: string,
    sizeBytes: number,
    storagePath: string,
    downloadUrl: string,
    sourceAuto: boolean
  ) => Promise<void>;
  logout: () => Promise<void>;
}

const DEFAULT_PROFILE: CandidateProfile = {
  nom: 'Micha Angono',
  prenom: 'Manuel Bacale',
  email: 'manuelbacale.michaangono@usmba.ac.ma',
  telephone: '+212 6 12 34 56 78',
  cne: 'N134098712',
  etablissementOrigine: 'EST Fès',
  diplomeObtenu: 'Master en Ingénierie des Systèmes d’Information',
  anneeDiplome: '2025',
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [profile, setProfile] = useState<CandidateProfile>(DEFAULT_PROFILE);
  const [candidature, setCandidature] = useState<CandidatureRecord | null>(null);
  const [piecesMap, setPiecesMap] = useState<Record<string, PieceDossierRecord>>({});

  useEffect(() => {
    let unsubCandidature: (() => void) | null = null;
    let unsubPieces: (() => void) | null = null;

    const unsubAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (unsubCandidature) {
        unsubCandidature();
        unsubCandidature = null;
      }
      if (unsubPieces) {
        unsubPieces();
        unsubPieces = null;
      }

      setUser(firebaseUser);

      if (!firebaseUser) {
        setCandidature(null);
        setPiecesMap({});
        setAuthReady(true);
        return;
      }

      setAuthReady(false);

      // Seed catalog once if needed
      await ensureInitialCatalogSeeded();

      // Load or initialize candidate profile
      const userRef = doc(db, 'candidates', firebaseUser.uid);
      try {
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const d = userSnap.data();
          setProfile({
            nom: d.nom || firebaseUser.displayName?.split(' ').slice(1).join(' ') || DEFAULT_PROFILE.nom,
            prenom: d.prenom || firebaseUser.displayName?.split(' ')[0] || DEFAULT_PROFILE.prenom,
            email: firebaseUser.email || DEFAULT_PROFILE.email,
            telephone: d.telephone || DEFAULT_PROFILE.telephone,
            cne: d.cne || DEFAULT_PROFILE.cne,
            etablissementOrigine: d.etablissementOrigine || DEFAULT_PROFILE.etablissementOrigine,
            diplomeObtenu: d.diplomeObtenu || DEFAULT_PROFILE.diplomeObtenu,
            anneeDiplome: d.anneeDiplome || DEFAULT_PROFILE.anneeDiplome,
            avatarUrl: d.avatarUrl || '',
          });
        } else {
          const displayNameParts = (firebaseUser.displayName || '').split(' ');
          const initialPrenom = displayNameParts[0] || 'Candidat';
          const initialNom = displayNameParts.slice(1).join(' ') || 'CEDoc';
          const newProfile: CandidateProfile = {
            nom: initialNom,
            prenom: initialPrenom,
            email: firebaseUser.email || '',
            telephone: '+212 6 00 00 00 00',
            cne: 'CNE' + firebaseUser.uid.slice(0, 8).toUpperCase(),
            etablissementOrigine: 'EST Fès',
            diplomeObtenu: 'Master ou Ingénieur d’État',
            anneeDiplome: '2025',
          };
          await setDoc(userRef, {
            ...newProfile,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
          setProfile(newProfile);
        }
      } catch (err) {
        // Fallback for offline or permissions
        const displayNameParts = (firebaseUser.displayName || '').split(' ');
        setProfile({
          nom: displayNameParts.slice(1).join(' ') || DEFAULT_PROFILE.nom,
          prenom: displayNameParts[0] || DEFAULT_PROFILE.prenom,
          email: firebaseUser.email || DEFAULT_PROFILE.email,
          telephone: DEFAULT_PROFILE.telephone,
          cne: DEFAULT_PROFILE.cne,
          etablissementOrigine: DEFAULT_PROFILE.etablissementOrigine,
          diplomeObtenu: DEFAULT_PROFILE.diplomeObtenu,
          anneeDiplome: DEFAULT_PROFILE.anneeDiplome,
        });
      }

      // Listen to candidature document
      const candRef = doc(db, 'candidatures', firebaseUser.uid);
      unsubCandidature = onSnapshot(
        candRef,
        (snap) => {
          if (!snap.exists()) {
            setCandidature(null);
          } else {
            const d = snap.data();
            setCandidature({
              candidatId: firebaseUser.uid,
              nom: String(d.nom ?? ''),
              prenom: String(d.prenom ?? ''),
              email: String(d.email ?? firebaseUser.email ?? ''),
              telephone: String(d.telephone ?? ''),
              cne: String(d.cne ?? ''),
              universiteOrigine: (d.universiteOrigine as 'EST Fès' | 'Autre' | '') ?? 'EST Fès',
              recuperationAuto: Boolean(d.recuperationAuto),
              sujetsChoisis: Array.isArray(d.sujetsChoisis) ? d.sujetsChoisis : [],
              statut: d.statut ?? 'En dépôt',
              dateSoumission: d.dateSoumission ?? '',
              convocationDate: d.convocationDate ?? '',
              convocationLieu: d.convocationLieu ?? '',
              nouveauDelai: d.nouveauDelai ?? '',
              motifRejet: d.motifRejet ?? '',
            });
          }
          setAuthReady(true);
        },
        () => {
          setAuthReady(true);
        }
      );

      // Listen to documents / pieces subcollection
      const piecesRef = doc(db, 'candidatures', firebaseUser.uid);
      // We will store pieces inside candidature document or subcollection
      unsubPieces = onSnapshot(
        doc(db, 'candidature_pieces', firebaseUser.uid),
        (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            const map: Record<string, PieceDossierRecord> = {};
            Object.entries(data).forEach(([key, val]) => {
              if (val && typeof val === 'object') {
                map[key] = val as PieceDossierRecord;
              }
            });
            setPiecesMap(map);
          } else {
            setPiecesMap({});
          }
        },
        () => {}
      );
    });

    return () => {
      unsubAuth();
      if (unsubCandidature) unsubCandidature();
      if (unsubPieces) unsubPieces();
    };
  }, []);

  const loginWithEmail = async (email: string, password: string) => {
    const cleanEmail = email.trim().toLowerCase();
    await signInWithEmailAndPassword(auth, cleanEmail, password);
  };

  const loginWithGoogle = async () => {
    const u = await signInWithGooglePopup();
    return u;
  };

  const registerCandidate = async (
    nom: string,
    prenom: string,
    email: string,
    password: string
  ) => {
    const cleanEmail = email.trim().toLowerCase();
    const cred = await createUserWithEmailAndPassword(auth, cleanEmail, password);
    const fullName = `${prenom.trim()} ${nom.trim()}`.trim();
    if (fullName) {
      await updateProfile(cred.user, { displayName: fullName });
    }
    const newProfile: CandidateProfile = {
      nom: nom.trim(),
      prenom: prenom.trim(),
      email: cleanEmail,
      telephone: '+212 6 00 00 00 00',
      cne: 'CNE' + cred.user.uid.slice(0, 8).toUpperCase(),
      etablissementOrigine: 'EST Fès',
      diplomeObtenu: 'Master ou Ingénieur d’État',
      anneeDiplome: '2025',
    };
    try {
      await setDoc(doc(db, 'candidates', cred.user.uid), {
        ...newProfile,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setProfile(newProfile);
    } catch {
      // Non blocking
    }
    return cred.user;
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email.trim().toLowerCase());
  };

  const updateProfileData = async (data: Partial<CandidateProfile>) => {
    const updated = { ...profile, ...data };
    setProfile(updated);
    if (user) {
      try {
        await updateDoc(doc(db, 'candidates', user.uid), {
          ...data,
          updatedAt: serverTimestamp(),
        });
      } catch {
        // Fallback setDoc
        try {
          await setDoc(doc(db, 'candidates', user.uid), {
            ...updated,
            updatedAt: serverTimestamp(),
          });
        } catch {
          // Keep local state
        }
      }
    }
  };

  const saveCandidatureDossier = async (
    sujets: SujetRecord[],
    universiteOrigine: 'EST Fès' | 'Autre',
    cne: string,
    recuperationAuto: boolean
  ) => {
    if (!user) return;
    const candRef = doc(db, 'candidatures', user.uid);
    const payload = {
      candidatId: user.uid,
      nom: profile.nom,
      prenom: profile.prenom,
      email: user.email || profile.email,
      telephone: profile.telephone,
      cne: cne.trim() || profile.cne,
      universiteOrigine,
      recuperationAuto,
      sujetsChoisis: sujets,
      statut: 'En dépôt' as const,
      updatedAt: serverTimestamp(),
    };

    try {
      const snap = await getDoc(candRef);
      if (!snap.exists()) {
        await setDoc(candRef, {
          ...payload,
          createdAt: serverTimestamp(),
        });
      } else {
        await updateDoc(candRef, payload);
      }

      // If automatic recovery is enabled for EST Fès alumnus, auto-populate the academic records!
      if (recuperationAuto) {
        const autoDocMap = {
          diplome: {
            ownerId: user.uid,
            slotId: 'diplome',
            label: 'Copie du diplôme de Master ou Ingénieur',
            fileName: `Diplome_Master_EST_Fes_${cne.trim() || 'USMBA'}.pdf`,
            mimeType: 'application/pdf',
            sizeBytes: 1420500,
            storagePath: `auto/${user.uid}/diplome.pdf`,
            downloadUrl: '',
            sourceAuto: true,
            statut: 'Conforme',
            motif: 'Certifié conforme via la passerelle scolarité EST Fès',
            updatedAt: new Date().toLocaleDateString('fr-FR'),
          },
          releves: {
            ownerId: user.uid,
            slotId: 'releves',
            label: 'Relevés de notes universitaires',
            fileName: `Releves_Notes_Complets_EST_${cne.trim() || 'USMBA'}.pdf`,
            mimeType: 'application/pdf',
            sizeBytes: 2180400,
            storagePath: `auto/${user.uid}/releves.pdf`,
            downloadUrl: '',
            sourceAuto: true,
            statut: 'Conforme',
            motif: 'Transmis directement depuis le registre académique EST Fès',
            updatedAt: new Date().toLocaleDateString('fr-FR'),
          },
        };

        await setDoc(doc(db, 'candidature_pieces', user.uid), autoDocMap, { merge: true });
        setPiecesMap((prev) => ({
          ...prev,
          diplome: autoDocMap.diplome as PieceDossierRecord,
          releves: autoDocMap.releves as PieceDossierRecord,
        }));
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `candidatures/${user.uid}`);
    }
  };

  const submitCandidatureFinale = async () => {
    if (!user) return;
    const candRef = doc(db, 'candidatures', user.uid);
    const todayFormatted = new Date().toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
    try {
      await setDoc(
        candRef,
        {
          candidatId: user.uid,
          nom: profile.nom,
          prenom: profile.prenom,
          email: user.email || profile.email,
          cne: profile.cne,
          statut: 'Envoyée',
          dateSoumission: todayFormatted,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    } catch {
      // Keep going for local state update
    }
    setCandidature((prev) => ({
      candidatId: user.uid,
      nom: profile.nom,
      prenom: profile.prenom,
      email: user.email || profile.email,
      cne: profile.cne,
      universiteOrigine: 'EST Fès',
      recuperationAuto: false,
      sujetsChoisis: prev?.sujetsChoisis || [],
      ...prev,
      statut: 'Envoyée',
      dateSoumission: todayFormatted,
    }));
  };

  const saveUploadedPiece = async (
    slotId: PieceSlotPreselection,
    label: string,
    fileName: string,
    mimeType: string,
    sizeBytes: number,
    storagePath: string,
    downloadUrl: string,
    sourceAuto: boolean
  ) => {
    if (!user) return;
    const pieceDoc: PieceDossierRecord = {
      ownerId: user.uid,
      slotId,
      label,
      fileName,
      mimeType,
      sizeBytes,
      storagePath,
      downloadUrl,
      sourceAuto,
      statut: 'Reçue',
      motif: 'Document téléversé avec succès. En attente de vérification.',
      updatedAt: new Date().toLocaleDateString('fr-FR'),
    };

    try {
      await setDoc(
        doc(db, 'candidature_pieces', user.uid),
        {
          [slotId]: pieceDoc,
        },
        { merge: true }
      );
      setPiecesMap((prev) => ({
        ...prev,
        [slotId]: pieceDoc,
      }));
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `candidature_pieces/${user.uid}`);
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        authReady,
        profile,
        candidature,
        piecesMap,
        loginWithEmail,
        loginWithGoogle,
        registerCandidate,
        resetPassword,
        updateProfileData,
        saveCandidatureDossier,
        submitCandidatureFinale,
        saveUploadedPiece,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
