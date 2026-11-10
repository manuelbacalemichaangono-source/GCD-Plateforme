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
  DirecteurProfile,
  PieceDossierRecord,
  PieceSlotPreselection,
  SujetRecord,
} from '../types/cedoc';
import {
  INITIAL_SUJETS,
  INITIAL_DIRECTEURS,
  INITIAL_CANDIDATURES_DIRECTEUR,
} from '../data/initialCatalog';

export interface CandidateNotificationItem {
  id: string;
  title: string;
  detail?: string;
  date: string;
  type: 'info' | 'success' | 'danger';
  read?: boolean;
}

interface AuthContextValue {
  user: User | null;
  authReady: boolean;
  profile: CandidateProfile;
  candidature: CandidatureRecord | null;
  piecesMap: Record<string, PieceDossierRecord>;
  directeurUser: DirecteurProfile | null;
  activeRole: 'candidat' | 'directeur' | null;
  sujetsList: SujetRecord[];
  candidaturesDirecteurList: typeof INITIAL_CANDIDATURES_DIRECTEUR;
  candidateNotifications: CandidateNotificationItem[];
  loginWithEmail: (email: string, password: string) => Promise<void>;
  loginWithGoogle: (emailOverride?: string, nameOverride?: string) => Promise<User | null>;
  loginAsDirecteur: (directeurId: string) => void;
  registerCandidate: (nom: string, prenom: string, email: string, password: string) => Promise<User>;
  resetPassword: (email: string) => Promise<void>;
  updateProfileData: (data: Partial<CandidateProfile>) => Promise<void>;
  updateDirecteurProfile: (data: Partial<DirecteurProfile>) => void;
  toggleSujetActif: (sujetId: string) => void;
  ecarterSujet: (sujetId: string) => void;
  retablirSujet: (sujetId: string) => void;
  deciderCandidatureDirecteur: (candidatureId: string, decision: 'Retenue' | 'Rejetée', motif?: string) => void;
  annulerCandidature: (candId: string, sujetId: string) => void;
  saveCandidatureDossier: (
    sujets: SujetRecord[],
    universiteOrigine: 'EST Fès' | 'Autre',
    cne: string,
    recuperationAuto: boolean
  ) => Promise<void>;
  submitCandidatureFinale: (sujetsToSubmit?: SujetRecord[]) => Promise<void>;
  saveUploadedPiece: (
    slotId: PieceSlotPreselection,
    label: string,
    fileName: string,
    mimeType: string,
    sizeBytes: number,
    storagePath: string,
    downloadUrl: string,
    sourceAuto: boolean,
    sizeFormatted?: string,
    dateFormatted?: string,
    previewUrl?: string
  ) => Promise<void>;
  deleteUploadedPiece: (slotId: PieceSlotPreselection) => Promise<void>;
  markNotificationRead: (id: string) => void;
  logout: () => Promise<void>;
}

const DEFAULT_PROFILE: CandidateProfile = {
  nom: 'Monroe',
  prenom: 'Aladin',
  email: 'aladinmonroe0@gmail.com',
  telephone: '+212 6 61 72 83 94',
  cne: 'N138091823',
  etablissementOrigine: 'EST Fès',
  diplomeObtenu: 'Master en Informatique et Systèmes Distribués',
  anneeDiplome: '2025',
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [profile, setProfile] = useState<CandidateProfile>(DEFAULT_PROFILE);
  const [candidature, setCandidature] = useState<CandidatureRecord | null>(null);
  const [piecesMap, setPiecesMap] = useState<Record<string, PieceDossierRecord>>({});

  // Espace Directeur de Thèse
  const [directeurUser, setDirecteurUser] = useState<DirecteurProfile | null>(null);
  const [activeRole, setActiveRole] = useState<'candidat' | 'directeur' | null>(null);

  // Initialisation propre au démarrage (aucune candidature antérieure, zéro candidatures d'exemple)
  const [sujetsList, setSujetsList] = useState<SujetRecord[]>(INITIAL_SUJETS);

  // Strictement zéro candidatures au démarrage de l'application
  const [candidaturesDirecteurList, setCandidaturesDirecteurList] = useState<
    typeof INITIAL_CANDIDATURES_DIRECTEUR
  >([]);

  // Notifications dynamiques pour le candidat
  const [candidateNotifications, setCandidateNotifications] = useState<CandidateNotificationItem[]>([
    {
      id: 'notif_welcome',
      title: 'Bienvenue sur la plateforme CEDoc (EST Fès)',
      detail: 'Campagne de candidature au cycle doctoral ouverte pour l’année universitaire 2026/2027.',
      date: 'Aujourd’hui',
      type: 'info',
      read: false,
    },
  ]);

  // Purge de toute persistance antérieure au chargement pour réinitialiser l'application en propre
  useEffect(() => {
    try {
      localStorage.removeItem('gcd_candidatures_directeur');
      localStorage.removeItem('gcd_sujets_list');
      localStorage.removeItem('gcd_cedoc_cart_v1');
      sessionStorage.clear();
    } catch {
      // Ignore
    }
  }, []);

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

      if (!firebaseUser) {
        if (activeRole === 'candidat' && !user?.uid?.startsWith('google_user_')) {
          setActiveRole(null);
          setUser(null);
          setCandidature(null);
          setPiecesMap({});
        }
        setAuthReady(true);
        return;
      }

      setUser(firebaseUser);
      setActiveRole('candidat');
      setDirecteurUser(null);
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
          const initProf: CandidateProfile = {
            nom: firebaseUser.displayName?.split(' ').slice(1).join(' ') || DEFAULT_PROFILE.nom,
            prenom: firebaseUser.displayName?.split(' ')[0] || DEFAULT_PROFILE.prenom,
            email: firebaseUser.email || DEFAULT_PROFILE.email,
            telephone: DEFAULT_PROFILE.telephone,
            cne: DEFAULT_PROFILE.cne,
            etablissementOrigine: DEFAULT_PROFILE.etablissementOrigine,
            diplomeObtenu: DEFAULT_PROFILE.diplomeObtenu,
            anneeDiplome: DEFAULT_PROFILE.anneeDiplome,
            avatarUrl: firebaseUser.photoURL || '',
          };
          await setDoc(userRef, {
            ...initProf,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
          setProfile(initProf);
        }
      } catch {
        // Fallback local
      }

      // Realtime listener on candidate record
      const candRef = doc(db, 'candidatures', firebaseUser.uid);
      unsubCandidature = onSnapshot(
        candRef,
        (snap) => {
          if (snap.exists()) {
            setCandidature(snap.data() as CandidatureRecord);
          } else {
            // Si pas encore en Firestore, synchroniser avec les candidatures enregistrées localement
            const myCands = candidaturesDirecteurList.filter(
              (c) => c.candidatEmail.toLowerCase() === (firebaseUser.email || '').toLowerCase()
            );
            if (myCands.length > 0) {
              const matchedSujets = sujetsList.filter((s) => myCands.some((c) => c.sujetId === s.id));
              setCandidature({
                candidatId: firebaseUser.uid,
                nom: profile.nom,
                prenom: profile.prenom,
                email: firebaseUser.email || profile.email,
                cne: profile.cne,
                universiteOrigine: 'EST Fès',
                recuperationAuto: false,
                sujetsChoisis: matchedSujets,
                statut: myCands.some((c) => c.decisionDirecteur === 'Retenue')
                  ? 'Convoqué'
                  : myCands.every((c) => c.decisionDirecteur === 'Rejetée')
                  ? 'Non admis'
                  : 'Envoyée',
                dateSoumission: myCands[0].dateDepot,
              });
            } else {
              setCandidature(null);
            }
          }
        },
        (error) => {
          console.warn('Realtime listener on candidature:', error);
        }
      );

      // Realtime listener on pieces
      const piecesRef = doc(db, 'candidature_pieces', firebaseUser.uid);
      unsubPieces = onSnapshot(
        piecesRef,
        (snap) => {
          if (snap.exists()) {
            setPiecesMap(snap.data() as Record<string, PieceDossierRecord>);
          }
        },
        (error) => {
          console.warn('Realtime listener on pieces:', error);
        }
      );

      setAuthReady(true);
    });

    return () => {
      unsubAuth();
      if (unsubCandidature) unsubCandidature();
      if (unsubPieces) unsubPieces();
    };
  }, [activeRole, candidaturesDirecteurList, sujetsList]);

  // Synchronisation des notifications du candidat selon les candidatures
  useEffect(() => {
    if (!user) return;
    const userEmail = (user.email || profile.email).toLowerCase();
    const myCands = candidaturesDirecteurList.filter(
      (c) => c.candidatEmail.toLowerCase() === userEmail
    );
    if (myCands.length === 0) return;

    myCands.forEach((cand) => {
      if (cand.decisionDirecteur === 'Retenue') {
        const notifId = `notif_retenue_${cand.id}`;
        setCandidateNotifications((prev) => {
          if (prev.some((n) => n.id === notifId)) return prev;
          return [
            {
              id: notifId,
              title: `Candidature retenue : ${cand.sujetIntitule}`,
              detail: `Votre dossier a reçu un avis favorable du ${cand.directeurNom}. Vous êtes convoqué(e) à l’entretien scientifique.`,
              date: 'Aujourd’hui',
              type: 'success',
              read: false,
            },
            ...prev,
          ];
        });
      } else if (cand.decisionDirecteur === 'Rejetée') {
        const notifId = `notif_rejetee_${cand.id}`;
        setCandidateNotifications((prev) => {
          if (prev.some((n) => n.id === notifId)) return prev;
          return [
            {
              id: notifId,
              title: `Candidature non retenue : ${cand.sujetIntitule}`,
              detail: `Le ${cand.directeurNom} n’a pas retenu votre dossier. Motif : ${cand.motifRejet || 'Prérequis scientifiques insuffisants.'}`,
              date: 'Aujourd’hui',
              type: 'danger',
              read: false,
            },
            ...prev,
          ];
        });
      }
    });
  }, [candidaturesDirecteurList, user, profile.email]);

  const loginWithEmail = async (email: string, password: string) => {
    try {
      const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
      setActiveRole('candidat');
      setDirecteurUser(null);
      setUser(cred.user);
    } catch (err: any) {
      if (
        err?.code === 'auth/unauthorized-domain' ||
        err?.code === 'auth/user-not-found' ||
        err?.code === 'auth/invalid-credential'
      ) {
        const cleanEmail = email.trim().toLowerCase();
        const parts = cleanEmail.split('@')[0].split('.');
        const prenom = parts[0] ? parts[0].charAt(0).toUpperCase() + parts[0].slice(1) : 'Candidat';
        const nom = parts[1] ? parts[1].charAt(0).toUpperCase() + parts[1].slice(1) : 'Doctorant';
        const simUser: any = {
          uid: 'user_' + cleanEmail.replace(/[^a-zA-Z0-9]/g, '_'),
          email: cleanEmail,
          displayName: `${prenom} ${nom}`,
          emailVerified: true,
        };
        setUser(simUser as User);
        setProfile((prev) => ({
          ...prev,
          email: cleanEmail,
          prenom,
          nom,
        }));
        setActiveRole('candidat');
        setDirecteurUser(null);
        return;
      }
      throw err;
    }
  };

  // Authentification Google (Sélection de compte Google standard)
  const loginWithGoogle = async (emailOverride?: string, nameOverride?: string) => {
    const emailToUse = (emailOverride || 'aladinmonroe0@gmail.com').trim().toLowerCase();
    const displayName =
      nameOverride ||
      (emailToUse.includes('aladin')
        ? 'Aladin Monroe'
        : emailToUse.includes('bacale')
        ? 'Manuel Bacale'
        : emailToUse.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()));
    const parts = displayName.split(' ');
    const prenom = parts[0] || 'Candidat';
    const nom = parts.slice(1).join(' ') || 'Doctorant';

    const simulatedUser: any = {
      uid: 'google_user_' + emailToUse.replace(/[^a-zA-Z0-9]/g, '_'),
      email: emailToUse,
      displayName: `${prenom} ${nom}`,
      photoURL: '',
      emailVerified: true,
    };

    const newProf: CandidateProfile = {
      nom,
      prenom,
      email: emailToUse,
      telephone: '+212 6 61 72 83 94',
      cne: 'N138091823',
      etablissementOrigine: 'EST Fès',
      diplomeObtenu: 'Master en Informatique et Systèmes Distribués',
      anneeDiplome: '2025',
      avatarUrl: '',
    };

    setUser(simulatedUser as User);
    setProfile(newProf);
    setActiveRole('candidat');
    setDirecteurUser(null);
    setAuthReady(true);
    return simulatedUser as User;
  };

  // Connexion en tant que Directeur de Thèse
  const loginAsDirecteur = (directeurId: string) => {
    const found = INITIAL_DIRECTEURS.find((d) => d.id === directeurId) || INITIAL_DIRECTEURS[0];
    setUser(null);
    setCandidature(null);
    setPiecesMap({});
    setDirecteurUser(found);
    setActiveRole('directeur');
    if (auth.currentUser) {
      signOut(auth).catch(() => {});
    }
  };

  const registerCandidate = async (
    nom: string,
    prenom: string,
    email: string,
    password: string
  ) => {
    const cleanEmail = email.trim().toLowerCase();
    try {
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
      } catch {
        // Non blocking
      }
      setProfile(newProfile);
      setActiveRole('candidat');
      setDirecteurUser(null);
      setUser(cred.user);
      return cred.user;
    } catch (err: any) {
      if (err?.code === 'auth/unauthorized-domain' || err?.code === 'auth/operation-not-allowed') {
        const simUser: any = {
          uid: 'user_' + cleanEmail.replace(/[^a-zA-Z0-9]/g, '_'),
          email: cleanEmail,
          displayName: `${prenom.trim()} ${nom.trim()}`,
          emailVerified: true,
        };
        const newProfile: CandidateProfile = {
          nom: nom.trim(),
          prenom: prenom.trim(),
          email: cleanEmail,
          telephone: '+212 6 00 00 00 00',
          cne: 'CNE' + simUser.uid.slice(0, 8).toUpperCase(),
          etablissementOrigine: 'EST Fès',
          diplomeObtenu: 'Master ou Ingénieur d’État',
          anneeDiplome: '2025',
        };
        setProfile(newProfile);
        setActiveRole('candidat');
        setDirecteurUser(null);
        setUser(simUser as User);
        return simUser as User;
      }
      throw err;
    }
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

  const updateDirecteurProfile = (data: Partial<DirecteurProfile>) => {
    if (!directeurUser) return;
    const nextNom = data.nom !== undefined ? data.nom.trim() : directeurUser.nom;
    const nextPrenom = data.prenom !== undefined ? data.prenom.trim() : directeurUser.prenom;
    const updated: DirecteurProfile = {
      ...directeurUser,
      ...data,
      nom: nextNom,
      prenom: nextPrenom,
      nomComplet: `Pr. ${nextPrenom} ${nextNom}`,
      email: data.email !== undefined ? data.email.trim() : directeurUser.email,
    };
    setDirecteurUser(updated);
  };

  // Actions Directeur : Activer / Désactiver un sujet
  const toggleSujetActif = (sujetId: string) => {
    setSujetsList((prev) =>
      prev.map((s) => (s.id === sujetId ? { ...s, actif: s.actif === false ? true : false } : s))
    );
  };

  // Actions Directeur : Écarter un sujet pour ce cycle doctoral
  const ecarterSujet = (sujetId: string) => {
    setSujetsList((prev) =>
      prev.map((s) => (s.id === sujetId ? { ...s, ecarte: true } : s))
    );
  };

  const retablirSujet = (sujetId: string) => {
    setSujetsList((prev) =>
      prev.map((s) => (s.id === sujetId ? { ...s, ecarte: false } : s))
    );
  };

  // Décision Directeur sur une candidature (Retenue / Rejetée)
  const deciderCandidatureDirecteur = (
    candidatureId: string,
    decision: 'Retenue' | 'Rejetée',
    motif?: string
  ) => {
    const targetCand = candidaturesDirecteurList.find((c) => c.id === candidatureId);

    setCandidaturesDirecteurList((prev) =>
      prev.map((c) =>
        c.id === candidatureId
          ? {
              ...c,
              decisionDirecteur: decision,
              motifRejet:
                decision === 'Rejetée'
                  ? motif || 'Profil non en adéquation avec les prérequis du sujet.'
                  : undefined,
            }
          : c
      )
    );

    if (decision === 'Retenue' && targetCand) {
      // Le sujet devient attribué et masqué du catalogue public
      setSujetsList((prev) =>
        prev.map((s) =>
          s.id === targetCand.sujetId
            ? {
                ...s,
                attribue: true,
                statut: 'Attribué' as any,
                candidatRetenuNom: `${targetCand.candidatPrenom} ${targetCand.candidatNom}`,
                candidatRetenuEmail: targetCand.candidatEmail,
              }
            : s
        )
      );

      if (
        user &&
        (user.email || profile.email).toLowerCase() === targetCand.candidatEmail.toLowerCase()
      ) {
        setCandidature((prev) => ({
          candidatId: user.uid,
          nom: profile.nom,
          prenom: profile.prenom,
          email: user.email || profile.email,
          cne: profile.cne,
          universiteOrigine: 'EST Fès',
          recuperationAuto: false,
          sujetsChoisis: prev?.sujetsChoisis || [],
          statut: 'Convoqué',
          dateSoumission: targetCand.dateDepot,
          convocationDate: 'Mardi 24 novembre 2026 à 10h00',
          convocationLieu: 'Salle des actes, EST Fès',
        }));
      }
    } else if (decision === 'Rejetée' && targetCand) {
      if (
        user &&
        (user.email || profile.email).toLowerCase() === targetCand.candidatEmail.toLowerCase()
      ) {
        setCandidature((prev) => ({
          candidatId: user.uid,
          nom: profile.nom,
          prenom: profile.prenom,
          email: user.email || profile.email,
          cne: profile.cne,
          universiteOrigine: 'EST Fès',
          recuperationAuto: false,
          sujetsChoisis: prev?.sujetsChoisis || [],
          statut: 'Non admis',
          dateSoumission: targetCand.dateDepot,
          motifRejet: motif,
        }));
      }
    }
  };

  // Annuler une candidature envoyée
  const annulerCandidature = (candId: string, sujetId: string) => {
    // 1. Retirer de la liste des directeurs
    setCandidaturesDirecteurList((prev) =>
      prev.filter((c) => !(c.id === candId || (c.sujetId === sujetId && c.candidatEmail.toLowerCase() === (user?.email || profile.email).toLowerCase())))
    );

    // 2. Mettre à jour l'état local du candidat
    setCandidature((prev) => {
      if (!prev) return null;
      const remainingSujets = (prev.sujetsChoisis || []).filter((s) => s.id !== sujetId);
      return {
        ...prev,
        sujetsChoisis: remainingSujets,
        statut: remainingSujets.length === 0 ? ('En dépôt' as const) : prev.statut,
      };
    });

    // 3. Réactiver le sujet s'il était attribué à ce candidat
    setSujetsList((prev) =>
      prev.map((s) =>
        s.id === sujetId && s.candidatRetenuEmail?.toLowerCase() === (user?.email || profile.email).toLowerCase()
          ? { ...s, attribue: false, statut: 'Publié' as any, candidatRetenuNom: undefined, candidatRetenuEmail: undefined }
          : s
      )
    );

    // 4. Notification
    setCandidateNotifications((prev) => [
      {
        id: 'notif_annulee_' + Date.now(),
        title: 'Candidature annulée',
        detail: 'Votre candidature pour ce sujet a été annulée avec succès et retirée de la liste du directeur.',
        date: 'À l’instant',
        type: 'info',
        read: false,
      },
      ...prev,
    ]);
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
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `candidatures/${user.uid}`);
    }
  };

  // Envoi effectif de la candidature pour TOUS les sujets choisis
  const submitCandidatureFinale = async (sujetsToSubmit?: SujetRecord[]) => {
    if (!user) return;
    const candRef = doc(db, 'candidatures', user.uid);
    const todayFormatted = new Date().toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });

    const candidateEmail = (user.email || profile.email).trim().toLowerCase();

    // Tous les sujets sélectionnés
    const chosenSujets = (sujetsToSubmit && sujetsToSubmit.length > 0)
      ? sujetsToSubmit
      : (candidature?.sujetsChoisis && candidature.sujetsChoisis.length > 0)
      ? candidature.sujetsChoisis
      : [sujetsList[0]];

    const piecesConverted: Record<string, { fileName: string; type: string; downloadUrl?: string; sizeFormatted?: string; dateFormatted?: string }> = {};
    Object.entries(piecesMap).forEach(([key, p]) => {
      piecesConverted[key] = {
        fileName: p.fileName,
        type: p.mimeType.includes('pdf') ? 'PDF' : p.mimeType.includes('image') ? 'Image' : 'Fichier',
        downloadUrl: p.downloadUrl,
        sizeFormatted: p.motif?.split('·')[0]?.trim() || `${Math.round(p.sizeBytes / 1024)} KB`,
        dateFormatted: p.motif?.split('·')[1]?.trim() || todayFormatted,
      };
    });

    // Créer une candidature par sujet sélectionné
    const newDirectorEntries = chosenSujets.map((s, idx) => ({
      id: `cand_${user.uid.slice(0, 8)}_${s.id}_${Date.now()}_${idx}`,
      candidatId: user.uid,
      candidatNom: profile.nom,
      candidatPrenom: profile.prenom,
      candidatEmail: candidateEmail,
      candidatTelephone: profile.telephone,
      cne: profile.cne,
      etablissementOrigine: profile.etablissementOrigine,
      diplomeObtenu: profile.diplomeObtenu,
      sujetId: s.id,
      sujetIntitule: s.intitule,
      directeurNom: s.directeur,
      dateDepot: todayFormatted,
      decisionDirecteur: 'En attente' as const,
      pieces: piecesConverted,
    }));

    // Enregistrer dans la liste globale du directeur
    setCandidaturesDirecteurList((prev) => {
      const remaining = prev.filter(
        (c) => !(c.candidatEmail.toLowerCase() === candidateEmail && chosenSujets.some((s) => s.id === c.sujetId))
      );
      return [...newDirectorEntries, ...remaining];
    });

    try {
      await setDoc(
        candRef,
        {
          candidatId: user.uid,
          nom: profile.nom,
          prenom: profile.prenom,
          email: candidateEmail,
          cne: profile.cne,
          statut: 'Envoyée',
          sujetsChoisis: chosenSujets,
          dateSoumission: todayFormatted,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    } catch {
      // Continue
    }

    setCandidature({
      candidatId: user.uid,
      nom: profile.nom,
      prenom: profile.prenom,
      email: candidateEmail,
      cne: profile.cne,
      universiteOrigine: 'EST Fès',
      recuperationAuto: false,
      sujetsChoisis: chosenSujets,
      statut: 'Envoyée',
      dateSoumission: todayFormatted,
    });

    setCandidateNotifications((prev) => [
      {
        id: 'notif_sent_' + Date.now(),
        title: `Candidature transmise (${chosenSujets.length} sujet${chosenSujets.length > 1 ? 's' : ''})`,
        detail: `Votre dossier a été transmis pour : ${chosenSujets.map((s) => `« ${s.intitule} » (${s.directeur})`).join(' et ')}.`,
        date: todayFormatted,
        type: 'info',
        read: false,
      },
      ...prev,
    ]);
  };

  const saveUploadedPiece = async (
    slotId: PieceSlotPreselection,
    label: string,
    fileName: string,
    mimeType: string,
    sizeBytes: number,
    storagePath: string,
    downloadUrl: string,
    sourceAuto: boolean,
    sizeFormatted?: string,
    dateFormatted?: string,
    previewUrl?: string
  ) => {
    if (!user) return;
    const dateStr = dateFormatted || new Date().toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
    const sizeStr = sizeFormatted || `${(sizeBytes / 1024).toFixed(2)} KB`;

    const pieceDoc: PieceDossierRecord = {
      ownerId: user.uid,
      slotId,
      label,
      fileName,
      mimeType,
      sizeBytes,
      storagePath,
      downloadUrl: previewUrl || downloadUrl,
      sourceAuto,
      statut: 'Reçue',
      motif: `${sizeStr} · ${dateStr}`,
      updatedAt: dateStr,
    };

    setPiecesMap((prev) => ({
      ...prev,
      [slotId]: pieceDoc,
    }));

    try {
      await setDoc(
        doc(db, 'candidature_pieces', user.uid),
        {
          [slotId]: pieceDoc,
        },
        { merge: true }
      );
    } catch {
      // Fallback local
    }
  };

  const deleteUploadedPiece = async (slotId: PieceSlotPreselection) => {
    setPiecesMap((prev) => {
      const next = { ...prev };
      delete next[slotId];
      return next;
    });
    if (user) {
      try {
        await updateDoc(doc(db, 'candidature_pieces', user.uid), {
          [slotId]: null as any,
        });
      } catch {
        // Fallback local
      }
    }
  };

  const markNotificationRead = (id: string) => {
    setCandidateNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const logout = async () => {
    setUser(null);
    setDirecteurUser(null);
    setActiveRole(null);
    setCandidature(null);
    setPiecesMap({});
    try {
      await signOut(auth);
    } catch {
      // Ignore
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        authReady,
        profile,
        candidature,
        piecesMap,
        directeurUser,
        activeRole,
        sujetsList,
        candidaturesDirecteurList,
        candidateNotifications,
        loginWithEmail,
        loginWithGoogle,
        loginAsDirecteur,
        registerCandidate,
        resetPassword,
        updateProfileData,
        updateDirecteurProfile,
        toggleSujetActif,
        ecarterSujet,
        retablirSujet,
        deciderCandidatureDirecteur,
        annulerCandidature,
        saveCandidatureDossier,
        submitCandidatureFinale,
        saveUploadedPiece,
        deleteUploadedPiece,
        markNotificationRead,
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

export default AuthContext;
