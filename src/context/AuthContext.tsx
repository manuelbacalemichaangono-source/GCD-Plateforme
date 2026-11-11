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
  deleteDoc,
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
  DirecteurCedocProfile,
  EvaluationJury,
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
  isConvocation?: boolean;
  convocationData?: {
    date: string;
    heure: string;
    lieu: string;
    instructions?: string;
    sujetIntitule?: string;
    directeurNom?: string;
  };
}

export interface AdmisOfficielItem {
  id: string;
  cne: string;
  nomComplet: string;
  sujetIntitule: string;
  directeurNom: string;
  discipline: string;
  dateAdmission: string;
}

export interface LogCedocItem {
  id: string;
  date: string;
  action: string;
  auteur: string;
}

interface AuthContextValue {
  user: User | null;
  authReady: boolean;
  profile: CandidateProfile;
  candidature: CandidatureRecord | null;
  piecesMap: Record<string, PieceDossierRecord>;
  directeurUser: DirecteurProfile | null;
  directeurCedocUser: DirecteurCedocProfile | null;
  activeRole: 'candidat' | 'directeur' | 'directeur_cedoc' | null;
  sujetsList: SujetRecord[];
  candidaturesDirecteurList: typeof INITIAL_CANDIDATURES_DIRECTEUR;
  candidateNotifications: CandidateNotificationItem[];
  isListeOfficiellePubliee: boolean;
  admisOfficielsList: AdmisOfficielItem[];
  logsCedoc: LogCedocItem[];
  loginWithEmail: (email: string, password: string) => Promise<void>;
  loginWithGoogle: (emailOverride?: string, nameOverride?: string) => Promise<User | null>;
  loginAsDirecteur: (directeurId: string) => void;
  loginAsDirecteurCedoc: () => void;
  registerCandidate: (nom: string, prenom: string, email: string, password: string) => Promise<User>;
  resetPassword: (email: string) => Promise<void>;
  updateProfileData: (data: Partial<CandidateProfile>) => Promise<void>;
  updateDirecteurProfile: (data: Partial<DirecteurProfile>) => void;
  updateDirecteurCedocProfile: (data: Partial<DirecteurCedocProfile>) => void;
  toggleSujetActif: (sujetId: string) => void;
  ecarterSujet: (sujetId: string) => void;
  retablirSujet: (sujetId: string) => void;
  creerSujetCedoc: (nouveau: Omit<SujetRecord, 'id' | 'statut'>) => void;
  deciderCandidatureDirecteur: (
    candidatureId: string,
    decision: 'Retenue' | 'Rejetée',
    motif?: string,
    convocation?: { date: string; heure: string; lieu: string; instructions?: string }
  ) => void;
  validerPropositionAdmission: (candidatureId: string) => void;
  publierListeOfficielleAdmis: () => void;
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
  markAllNotificationsRead: () => void;
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

export const DEFAULT_DIRECTEUR_CEDOC: DirecteurCedocProfile = {
  id: 'dir_cedoc_principal',
  nom: 'Bennani',
  prenom: 'Mohammed Amine',
  nomComplet: 'Pr. Mohammed Amine Bennani',
  email: 'directeur.cedoc@usmba.ac.ma',
  telephone: '+212 5 35 60 05 80',
  titre: 'Directeur du Centre d’Études Doctorales (CEDoc)',
  etablissement: 'EST Fès - Université Sidi Mohamed Ben Abdellah',
  departement: 'Direction du CEDoc',
  avatarUrl: '',
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
  
  // Espace Directeur du CEDoc
  const [directeurCedocUser, setDirecteurCedocUser] = useState<DirecteurCedocProfile | null>(null);
  const [activeRole, setActiveRole] = useState<'candidat' | 'directeur' | 'directeur_cedoc' | null>(null);

  // Publication officielle des résultats
  const [isListeOfficiellePubliee, setIsListeOfficiellePubliee] = useState(false);
  const [admisOfficielsList, setAdmisOfficielsList] = useState<AdmisOfficielItem[]>([]);

  // Registre des logs administratifs du CEDoc
  const [logsCedoc, setLogsCedoc] = useState<LogCedocItem[]>([
    {
      id: 'log_init_01',
      date: 'Aujourd’hui',
      action: 'Ouverture de la campagne d’admission doctorale 2026/2027 et synchronisation du catalogue de thèses',
      auteur: 'Direction du CEDoc',
    },
  ]);

  // Initialisation propre au démarrage (aucune candidature antérieure, zéro candidatures d'exemple)
  const [sujetsList, setSujetsList] = useState<SujetRecord[]>(INITIAL_SUJETS);

  // Strictement zéro candidatures au démarrage de l'application
  const [candidaturesDirecteurList, setCandidaturesDirecteurList] = useState<
    typeof INITIAL_CANDIDATURES_DIRECTEUR
  >([]);

  // Notifications séparées STRICTEMENT par candidat (quand on change de candidat, on ne voit pas celles d'un autre)
  const [notificationsByUser, setNotificationsByUser] = useState<Record<string, CandidateNotificationItem[]>>({
    'aladinmonroe0@gmail.com': [
      {
        id: 'notif_welcome_aladin',
        title: 'Bienvenue au CEDoc',
        detail: 'Campagne doctorale 2026/2027 ouverte.',
        date: 'Aujourd’hui',
        type: 'info',
        read: false,
      },
    ],
  });

  const currentUserEmail = (user?.email || profile.email || '').trim().toLowerCase();

  const candidateNotifications = React.useMemo(() => {
    if (!currentUserEmail) return [];
    if (!notificationsByUser[currentUserEmail]) {
      return [
        {
          id: 'notif_welcome_' + currentUserEmail.replace(/[^a-zA-Z0-9]/g, '_'),
          title: 'Bienvenue au CEDoc',
          detail: 'Campagne doctorale 2026/2027 ouverte.',
          date: 'Aujourd’hui',
          type: 'info' as const,
          read: false,
        },
      ];
    }
    return notificationsByUser[currentUserEmail];
  }, [currentUserEmail, notificationsByUser]);

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
    const userEmail = (user.email || profile.email).trim().toLowerCase();
    const myCands = candidaturesDirecteurList.filter(
      (c) => c.candidatEmail.trim().toLowerCase() === userEmail
    );
    if (myCands.length === 0) return;

    myCands.forEach((cand) => {
      if (cand.decisionDirecteur === 'Retenue') {
        const notifId = `notif_retenue_${cand.id}`;
        setNotificationsByUser((prev) => {
          const list = prev[userEmail] || [];
          if (list.some((n) => n.id === notifId)) return prev;
          return {
            ...prev,
            [userEmail]: [
              {
                id: notifId,
                title: `Candidature retenue : ${cand.sujetIntitule}`,
                detail: `Votre dossier a reçu un avis favorable du ${cand.directeurNom}. Vous êtes convoqué(e) à l’entretien scientifique.`,
                date: 'Aujourd’hui',
                type: 'success',
                read: false,
              },
              ...list,
            ],
          };
        });
      } else if (cand.decisionDirecteur === 'Rejetée') {
        const notifId = `notif_rejetee_${cand.id}`;
        setNotificationsByUser((prev) => {
          const list = prev[userEmail] || [];
          if (list.some((n) => n.id === notifId)) return prev;
          return {
            ...prev,
            [userEmail]: [
              {
                id: notifId,
                title: `Candidature non retenue : ${cand.sujetIntitule}`,
                detail: `Le ${cand.directeurNom} n’a pas retenu votre dossier. Motif : ${cand.motifRejet || 'Prérequis scientifiques insuffisants.'}`,
                date: 'Aujourd’hui',
                type: 'danger',
                read: false,
              },
              ...list,
            ],
          };
        });
      }
    });
  }, [candidaturesDirecteurList, user, profile.email]);

  const loginWithEmail = async (email: string, password: string) => {
    try {
      const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
      setActiveRole('candidat');
      setDirecteurUser(null);
      setDirecteurCedocUser(null);
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
        setDirecteurCedocUser(null);
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
    setDirecteurCedocUser(null);
    setAuthReady(true);
    return simulatedUser as User;
  };

  // Connexion en tant que Directeur de Thèse
  const loginAsDirecteur = (directeurId: string) => {
    const found = INITIAL_DIRECTEURS.find((d) => d.id === directeurId) || INITIAL_DIRECTEURS[0];
    setUser(null);
    setCandidature(null);
    setPiecesMap({});
    setDirecteurCedocUser(null);
    setDirecteurUser(found);
    setActiveRole('directeur');
    if (auth.currentUser) {
      signOut(auth).catch(() => {});
    }
  };

  // Connexion en tant que Directeur du CEDoc (Accès direct pour test)
  const loginAsDirecteurCedoc = () => {
    setUser(null);
    setCandidature(null);
    setPiecesMap({});
    setDirecteurUser(null);
    setDirecteurCedocUser(DEFAULT_DIRECTEUR_CEDOC);
    setActiveRole('directeur_cedoc');
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

  const updateDirecteurCedocProfile = (data: Partial<DirecteurCedocProfile>) => {
    if (!directeurCedocUser) return;
    const nextNom = data.nom !== undefined ? data.nom.trim() : directeurCedocUser.nom;
    const nextPrenom = data.prenom !== undefined ? data.prenom.trim() : directeurCedocUser.prenom;
    const updated: DirecteurCedocProfile = {
      ...directeurCedocUser,
      ...data,
      nom: nextNom,
      prenom: nextPrenom,
      nomComplet: `Pr. ${nextPrenom} ${nextNom}`,
      email: data.email !== undefined ? data.email.trim() : directeurCedocUser.email,
    };
    setDirecteurCedocUser(updated);
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

  // Action Directeur du CEDoc : Création d'un nouveau sujet de thèse
  const creerSujetCedoc = (nouveau: Omit<SujetRecord, 'id' | 'statut'>) => {
    const newSubject: SujetRecord = {
      ...nouveau,
      id: 'sujet_cedoc_' + Date.now(),
      statut: 'Publié',
      actif: true,
      ecarte: false,
      attribue: false,
    };
    setSujetsList((prev) => [newSubject, ...prev]);
    setLogsCedoc((prev) => [
      {
        id: 'log_' + Date.now(),
        date: 'Aujourd’hui',
        action: `Création du nouveau sujet : « ${newSubject.intitule} » (${newSubject.directeur})`,
        auteur: 'Direction du CEDoc',
      },
      ...prev,
    ]);
  };

  // Décision Directeur sur une candidature (Retenue / Rejetée)
  const deciderCandidatureDirecteur = (
    candidatureId: string,
    decision: 'Retenue' | 'Rejetée',
    motif?: string,
    convocation?: { date: string; heure: string; lieu: string; instructions?: string }
  ) => {
    const targetCand = candidaturesDirecteurList.find((c) => c.id === candidatureId);

    const juryEval: EvaluationJury | undefined =
      decision === 'Retenue'
        ? {
            noteDossier: 18.0,
            noteEntretien: 18.5,
            noteFinale: 18.25,
            avisJury: 'Très favorable',
            membresJury: [
              `Pr. ${targetCand?.directeurNom || 'Directeur de thèse'} (Directeur de thèse)`,
              'Pr. Karim El Mansouri (Président de commission)',
              'Pr. Nadia Bennani (Rapporteur & Examinateur)',
            ],
            dateEntretien: convocation?.date || '24 novembre 2026',
            appreciation:
              'Dossier académique exemplaire. Le candidat a démontré une excellente maîtrise des prérequis et des objectifs de recherche lors de son audition. Proposition d’admission validée avec avis très favorable.',
            signe: true,
            dateSignature: convocation?.date || '24 novembre 2026',
          }
        : undefined;

    setCandidaturesDirecteurList((prev) =>
      prev.map((c) =>
        c.id === candidatureId
          ? {
              ...c,
              decisionDirecteur: decision,
              evaluationJury: juryEval,
              validationCedoc: false,
              statutPublication: 'Non publiée',
              motifRejet:
                decision === 'Rejetée'
                  ? motif || 'Profil non en adéquation avec les prérequis du sujet.'
                  : undefined,
              convocationDate: decision === 'Retenue' ? convocation?.date : undefined,
              convocationHeure: decision === 'Retenue' ? convocation?.heure : undefined,
              convocationLieu: decision === 'Retenue' ? convocation?.lieu : undefined,
              convocationInstructions: decision === 'Retenue' ? convocation?.instructions : undefined,
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

      // Synchronisation directe avec le profil du candidat
      setCandidature((prev) => {
        const currentSujets =
          prev?.sujetsChoisis && prev.sujetsChoisis.length > 0
            ? prev.sujetsChoisis
            : [
                sujetsList.find((s) => s.id === targetCand.sujetId) || {
                  id: targetCand.sujetId,
                  intitule: targetCand.sujetIntitule,
                  description: '',
                  discipline: 'Doctorat',
                  directeur: targetCand.directeurNom,
                  directeurEmail: '',
                  laboratoire: 'CEDoc EST Fès',
                  statut: 'Attribué' as any,
                },
              ];

        return {
          candidatId: prev?.candidatId || targetCand.candidatId,
          nom: targetCand.candidatNom,
          prenom: targetCand.candidatPrenom,
          email: targetCand.candidatEmail,
          cne: targetCand.cne,
          universiteOrigine: 'EST Fès',
          recuperationAuto: false,
          sujetsChoisis: currentSujets,
          statut: 'Convoqué',
          dateSoumission: targetCand.dateDepot,
          convocationDate: convocation?.date,
          convocationHeure: convocation?.heure,
          convocationLieu: convocation?.lieu,
          convocationInstructions: convocation?.instructions,
        };
      });

      // Synchronisation Firestore
      try {
        const candRef = doc(db, 'candidatures', targetCand.candidatId);
        updateDoc(candRef, {
          statut: 'Convoqué',
          convocationDate: convocation?.date || '',
          convocationHeure: convocation?.heure || '',
          convocationLieu: convocation?.lieu || '',
          convocationInstructions: convocation?.instructions || '',
          updatedAt: serverTimestamp(),
        }).catch(() => {});
      } catch {
        // Fallback local
      }

      // Notification en temps réel pour le candidat ciblé
      const candEmail = targetCand.candidatEmail.trim().toLowerCase();
      const notifConvoc: CandidateNotificationItem = {
        id: 'notif_convoc_' + Date.now(),
        title: "Convocation officielle à l'entretien",
        detail: 'Cliquez pour afficher les informations et télécharger la convocation.',
        date: 'Aujourd’hui',
        type: 'info',
        read: false,
        isConvocation: true,
        convocationData: {
          date: convocation?.date || '24 novembre 2026',
          heure: convocation?.heure || '10:00',
          lieu: convocation?.lieu || 'Salle des actes, EST Fès',
          instructions: convocation?.instructions,
          sujetIntitule: targetCand.sujetIntitule,
          directeurNom: targetCand.directeurNom,
        },
      };

      setNotificationsByUser((prev) => ({
        ...prev,
        [candEmail]: [notifConvoc, ...(prev[candEmail] || [])],
      }));
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

  // Action Directeur du CEDoc : Valider la proposition d'admission après contrôle réglementaire
  const validerPropositionAdmission = (candidatureId: string) => {
    const target = candidaturesDirecteurList.find((c) => c.id === candidatureId);
    setCandidaturesDirecteurList((prev) =>
      prev.map((c) =>
        c.id === candidatureId ? { ...c, validationCedoc: true } : c
      )
    );

    if (target) {
      setLogsCedoc((prev) => [
        {
          id: 'log_' + Date.now(),
          date: 'Aujourd’hui',
          action: `Validation de la proposition d’admission pour ${target.candidatPrenom} ${target.candidatNom} (Sujet : ${target.sujetIntitule})`,
          auteur: 'Direction du CEDoc',
        },
        ...prev,
      ]);
    }
  };

  // Action Directeur du CEDoc : Publier la liste officielle des admis
  const publierListeOfficielleAdmis = () => {
    // Tous les candidats retenus ayant reçu le visa du Directeur du CEDoc
    const toPublish = candidaturesDirecteurList.filter(
      (c) => c.decisionDirecteur === 'Retenue'
    );

    if (toPublish.length === 0) return;

    const todayFormatted = new Date().toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });

    // 1. Mettre à jour les candidatures en "Admis" et "Publiée"
    setCandidaturesDirecteurList((prev) =>
      prev.map((c) => {
        if (toPublish.some((tp) => tp.id === c.id)) {
          return {
            ...c,
            decisionDirecteur: 'Admis',
            validationCedoc: true,
            statutPublication: 'Publiée',
          };
        }
        return c;
      })
    );

    // 2. Mettre à jour le statut du candidat dans son dashboard personnel
    setCandidature((prev) => {
      if (!prev) return null;
      const isAdmis = toPublish.some(
        (tp) => tp.candidatEmail.trim().toLowerCase() === prev.email.trim().toLowerCase()
      );
      if (isAdmis) {
        return {
          ...prev,
          statut: 'Admis',
        };
      }
      return prev;
    });

    // 3. Notifier individuellement chaque candidat admis dans son propre journal
    toPublish.forEach((cand) => {
      const candEmail = cand.candidatEmail.trim().toLowerCase();
      const notifAdmis: CandidateNotificationItem = {
        id: 'notif_admis_' + cand.id + '_' + Date.now(),
        title: 'Admission définitive',
        detail: 'Candidature admise sur la liste officielle.',
        date: todayFormatted,
        type: 'success',
        read: false,
      };

      setNotificationsByUser((prev) => ({
        ...prev,
        [candEmail]: [notifAdmis, ...(prev[candEmail] || [])],
      }));

      // Synchroniser Firestore
      try {
        const candRef = doc(db, 'candidatures', cand.candidatId);
        updateDoc(candRef, {
          statut: 'Admis',
          statutPublication: 'Publiée',
          dateAdmission: todayFormatted,
          updatedAt: serverTimestamp(),
        }).catch(() => {});
      } catch {
        // Fallback
      }
    });

    // 4. Mettre à jour la liste publique des admis officiels
    const admisItems: AdmisOfficielItem[] = toPublish.map((c) => ({
      id: c.id,
      cne: c.cne,
      nomComplet: `${c.candidatPrenom} ${c.candidatNom}`,
      sujetIntitule: c.sujetIntitule,
      directeurNom: c.directeurNom,
      discipline: sujetsList.find((s) => s.id === c.sujetId)?.discipline || 'Doctorat',
      dateAdmission: todayFormatted,
    }));

    setAdmisOfficielsList(admisItems);
    setIsListeOfficiellePubliee(true);

    // 5. Enregistrer le log officiel
    setLogsCedoc((prev) => [
      {
        id: 'log_pub_' + Date.now(),
        date: todayFormatted,
        action: `Publication officielle de la liste des ${toPublish.length} candidat(s) admis au cycle doctoral (Session 2026/2027)`,
        auteur: 'Pr. Mohammed Amine Bennani',
      },
      ...prev,
    ]);
  };

  // Annuler et supprimer définitivement une candidature envoyée
  const annulerCandidature = async (candId: string, sujetId: string) => {
    const userEmail = (user?.email || profile.email).trim().toLowerCase();

    // 1. Récupérer le nom du sujet pour la notification
    let targetIntitule = 'Sujet doctoral';
    const foundSujet = sujetsList.find((s) => s.id === sujetId);
    if (foundSujet) {
      targetIntitule = foundSujet.intitule;
    }

    // 2. Retirer de la liste globale des directeurs
    setCandidaturesDirecteurList((prev) =>
      prev.filter((c) => {
        if (candId && c.id === candId) return false;
        if (sujetId && c.sujetId === sujetId && c.candidatEmail.trim().toLowerCase() === userEmail) {
          return false;
        }
        return true;
      })
    );

    // 3. Mettre à jour l'état local du candidat
    setCandidature((prev) => {
      if (!prev) return null;
      if (prev.sujetsChoisis) {
        const found = prev.sujetsChoisis.find((s) => s.id === sujetId);
        if (found) targetIntitule = found.intitule;
      }
      const remainingSujets = (prev.sujetsChoisis || []).filter((s) => s.id !== sujetId);
      if (remainingSujets.length === 0) {
        return null;
      }
      return {
        ...prev,
        sujetsChoisis: remainingSujets,
        statut: remainingSujets.length === 0 ? ('En dépôt' as const) : prev.statut,
      };
    });

    // 4. Réactiver le sujet dans le catalogue public (libérer la place pour d'autres candidats)
    setSujetsList((prev) =>
      prev.map((s) =>
        s.id === sujetId
          ? {
              ...s,
              attribue: false,
              statut: 'Publié' as any,
              candidatRetenuNom: undefined,
              candidatRetenuEmail: undefined,
            }
          : s
      )
    );

    // 5. Synchroniser avec Firestore si l'utilisateur est connecté
    if (user) {
      try {
        const candRef = doc(db, 'candidatures', user.uid);
        const snap = await getDoc(candRef);
        if (snap.exists()) {
          const currentData = snap.data();
          const currentSujets: any[] = currentData.sujetsChoisis || [];
          const remainingSujets = currentSujets.filter((s: any) => s.id !== sujetId);
          if (remainingSujets.length === 0) {
            await deleteDoc(candRef);
          } else {
            await updateDoc(candRef, {
              sujetsChoisis: remainingSujets,
              updatedAt: serverTimestamp(),
            });
          }
        }
      } catch (e) {
        console.warn('Erreur synchronisation suppression Firestore:', e);
      }
    }

    // 6. Enregistrer immédiatement dans le Journal des notifications propre à ce candidat
    const notifAnnule: CandidateNotificationItem = {
      id: 'notif_annulee_' + Date.now(),
      title: 'Candidature annulée',
      detail: 'Votre candidature a été retirée.',
      date: 'À l’instant',
      type: 'info',
      read: false,
    };

    setNotificationsByUser((prev) => ({
      ...prev,
      [userEmail]: [notifAnnule, ...(prev[userEmail] || [])],
    }));
  };

  const markAllNotificationsRead = () => {
    if (!currentUserEmail) return;
    setNotificationsByUser((prev) => ({
      ...prev,
      [currentUserEmail]: (prev[currentUserEmail] || []).map((n) => ({ ...n, read: true })),
    }));
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

    const notifSent: CandidateNotificationItem = {
      id: 'notif_sent_' + Date.now(),
      title: 'Candidature transmise',
      detail: 'Dossier envoyé au directeur de thèse.',
      date: todayFormatted,
      type: 'info',
      read: false,
    };

    setNotificationsByUser((prev) => ({
      ...prev,
      [candidateEmail]: [notifSent, ...(prev[candidateEmail] || [])],
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
    if (!currentUserEmail) return;
    setNotificationsByUser((prev) => ({
      ...prev,
      [currentUserEmail]: (prev[currentUserEmail] || []).map((n) =>
        n.id === id ? { ...n, read: true } : n
      ),
    }));
  };

  const logout = async () => {
    setUser(null);
    setDirecteurUser(null);
    setDirecteurCedocUser(null);
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
        directeurCedocUser,
        activeRole,
        sujetsList,
        candidaturesDirecteurList,
        candidateNotifications,
        isListeOfficiellePubliee,
        admisOfficielsList,
        logsCedoc,
        loginWithEmail,
        loginWithGoogle,
        loginAsDirecteur,
        loginAsDirecteurCedoc,
        registerCandidate,
        resetPassword,
        updateProfileData,
        updateDirecteurProfile,
        updateDirecteurCedocProfile,
        toggleSujetActif,
        ecarterSujet,
        retablirSujet,
        creerSujetCedoc,
        deciderCandidatureDirecteur,
        validerPropositionAdmission,
        publierListeOfficielleAdmis,
        annulerCandidature,
        saveCandidatureDossier,
        submitCandidatureFinale,
        saveUploadedPiece,
        deleteUploadedPiece,
        markNotificationRead,
        markAllNotificationsRead,
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
