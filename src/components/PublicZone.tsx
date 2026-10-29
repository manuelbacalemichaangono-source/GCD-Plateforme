import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { User as UserIcon, X, Search } from 'lucide-react';
import { PRESENTATION_CEDOC } from '../config/constants';
import { useAuth } from '../context/AuthContext';
import { INITIAL_SUJETS } from '../data/initialCatalog';
import {
  db,
  handleFirestoreError,
  OperationType,
  translateFirebaseAuthError,
} from '../firebase';
import {
  CANDIDATURE_SLOTS,
  PieceDossierRecord,
  PieceSlotCandidature,
  PublicationAdmisRecord,
  SujetRecord,
} from '../types/cedoc';
import {
  AdvancedFilters,
  computeSelectiveCascade,
  computeSmartSuggestions,
  SmartSuggestion,
  subjectMatchesExpression,
} from '../utils/facetedSubjectSearch';
import { uploadDossierFile, validateCandidateFile } from '../utils/storageHelper';

type PublicTab = 'accueil' | 'recherche' | 'candidature' | 'suivi';
type AuthSheetMode = null | 'login' | 'register';

function renderHighlightedText(text: string, start: number, length: number) {
  if (length <= 0 || start < 0 || start >= text.length) {
    return <span>{text}</span>;
  }
  const end = Math.min(text.length, start + length);
  return (
    <span>
      {text.slice(0, start)}
      <strong className="font-semibold text-slate-950">{text.slice(start, end)}</strong>
      {text.slice(end)}
    </span>
  );
}

function isPartnerApiEligible(origine: '' | 'EST Fès' | 'Autre', cne: string): boolean {
  const clean = cne.trim();
  if (!clean) return false;
  if (origine === 'EST Fès') return clean.length >= 4;
  if (origine === 'Autre') return /^[A-Za-z]{1,2}\d{6,10}$/.test(clean);
  return false;
}

export const PublicZone: React.FC = () => {
  const {
    user,
    candidature,
    loginWithEmail,
    registerCandidat,
    resetPassword,
    logout,
  } = useAuth();

  const [activeTab, setActiveTab] = useState<PublicTab>('accueil');
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  // Auth modal/screen state
  const [authMode, setAuthMode] = useState<AuthSheetMode>(null);
  const [authNom, setAuthNom] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const [authBusy, setAuthBusy] = useState(false);

  // Pending subject when visitor clicks "Choisir ce sujet" before account creation
  const [pendingSujet, setPendingSujet] = useState<SujetRecord | null>(null);
  const prevUidRef = useRef<string | null>(null);

  // Published subjects (Firestore + initial fallback before first seed)
  const [publishedSubjects, setPublishedSubjects] = useState<SujetRecord[]>(INITIAL_SUJETS);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [selectedExpression, setSelectedExpression] = useState<string | null>(null);
  const [submittedFreeQuery, setSubmittedFreeQuery] = useState<string | null>(null);
  const [openSujetIds, setOpenSujetIds] = useState<string[]>([]);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [manualFilters, setManualFilters] = useState<AdvancedFilters>({
    discipline: '',
    laboratoire: '',
    directeur: '',
  });
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  // Candidature wizard state
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3>(1);
  const [origineInput, setOrigineInput] = useState<'' | 'EST Fès' | 'Autre'>('');
  const [cneInput, setCneInput] = useState('');
  const [piecesMap, setPiecesMap] = useState<Record<string, PieceDossierRecord>>({});
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadingSlot, setUploadingSlot] = useState<string | null>(null);
  const [savingStep, setSavingStep] = useState(false);

  // Suivi state
  const [publicationAdmis, setPublicationAdmis] = useState<PublicationAdmisRecord | null>(null);
  const [recoursOpen, setRecoursOpen] = useState(false);
  const [recoursText, setRecoursText] = useState('');
  const [recoursBusy, setRecoursBusy] = useState(false);

  // Load published subjects from Firestore (and check catalog_meta/seeded_v1)
  useEffect(() => {
    let unsub: (() => void) | null = null;
    let active = true;

    const setup = async () => {
      let isSeeded = false;
      try {
        const metaSnap = await getDoc(doc(db, 'catalog_meta', 'seeded_v1'));
        isSeeded = metaSnap.exists();
      } catch {
        isSeeded = false;
      }

      const q = query(collection(db, 'sujets'), where('statut', '==', 'Publié'));
      unsub = onSnapshot(
        q,
        (snap) => {
          if (!active) return;
          const docs: SujetRecord[] = snap.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              intitule: String(data.intitule ?? ''),
              description: String(data.description ?? ''),
              discipline: String(data.discipline ?? ''),
              directeur: String(data.directeur ?? ''),
              directeurEmail: String(data.directeurEmail ?? ''),
              laboratoire: String(data.laboratoire ?? ''),
              statut: 'Publié',
            };
          });
          if (docs.length > 0 || isSeeded) {
            setPublishedSubjects(docs);
          } else {
            setPublishedSubjects(INITIAL_SUJETS);
          }
        },
        (err) => {
          handleFirestoreError(err, OperationType.LIST, 'sujets');
        }
      );
    };

    setup();
    return () => {
      active = false;
      if (unsub) unsub();
    };
  }, [user?.uid]);

  // Sync form inputs when candidature loads
  useEffect(() => {
    if (candidature) {
      setOrigineInput(candidature.universiteOrigine || '');
      setCneInput(candidature.cne || '');
    } else {
      setOrigineInput('');
      setCneInput('');
    }
  }, [candidature?.candidatId, candidature?.universiteOrigine, candidature?.cne]);

  // Subscribe to candidate's pieces when signed in
  useEffect(() => {
    if (!user) {
      setPiecesMap({});
      return;
    }
    const qPieces = query(
      collection(db, 'candidatures', user.uid, 'pieces'),
      where('ownerId', '==', user.uid)
    );
    const unsub = onSnapshot(
      qPieces,
      (snap) => {
        const next: Record<string, PieceDossierRecord> = {};
        snap.docs.forEach((d) => {
          const data = d.data();
          next[d.id] = {
            ownerId: String(data.ownerId ?? user.uid),
            slotId: String(data.slotId ?? d.id),
            label: String(data.label ?? ''),
            fileName: String(data.fileName ?? ''),
            mimeType: String(data.mimeType ?? ''),
            sizeBytes: Number(data.sizeBytes ?? 0),
            storagePath: String(data.storagePath ?? ''),
            downloadUrl: String(data.downloadUrl ?? ''),
            sourceAuto: Boolean(data.sourceAuto),
            statut: data.statut,
            motif: String(data.motif ?? ''),
          };
        });
        setPiecesMap(next);
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, `candidatures/${user.uid}/pieces`);
      }
    );
    return () => unsub();
  }, [user?.uid]);

  // Check official admitted list when on Suivi
  useEffect(() => {
    if (activeTab !== 'suivi') return;
    let cancelled = false;
    getDoc(doc(db, 'publication_admis', 'officielle'))
      .then((snap) => {
        if (cancelled) return;
        if (snap.exists()) {
          const d = snap.data();
          if (d.publieeParSecretariat === true) {
            setPublicationAdmis({
              valideeParCedoc: Boolean(d.valideeParCedoc),
              publieeParSecretariat: true,
              admis: Array.isArray(d.admis) ? d.admis.map(String) : [],
            });
            return;
          }
        }
        setPublicationAdmis(null);
      })
      .catch(() => {
        if (!cancelled) setPublicationAdmis(null);
      });
    return () => {
      cancelled = true;
    };
  }, [activeTab]);

  // Persist chosen subject helper
  const saveChosenSujetForUser = async (uid: string, email: string, nom: string, sujet: SujetRecord) => {
    const candRef = doc(db, 'candidatures', uid);
    try {
      const existingSnap = await getDoc(candRef);
      if (!existingSnap.exists()) {
        await setDoc(candRef, {
          candidatId: uid,
          nom: (nom || email.split('@')[0] || 'Candidat').slice(0, 120),
          email: email.toLowerCase().slice(0, 160),
          sujetId: sujet.id,
          sujetIntitule: sujet.intitule.slice(0, 240),
          sujetDescription: sujet.description.slice(0, 1200),
          sujetDiscipline: sujet.discipline.slice(0, 120),
          directeur: sujet.directeur.slice(0, 120),
          directeurEmail: sujet.directeurEmail.toLowerCase().slice(0, 160),
          laboratoire: sujet.laboratoire.slice(0, 80),
          universiteOrigine: '',
          cne: '',
          recuperationAuto: false,
          statut: 'Compte créé',
          nouveauDelai: '',
          convocationDate: '',
          convocationLieu: '',
          recoursDepose: false,
          recoursMotif: '',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } else {
        const curStatut = existingSnap.data().statut;
        if (curStatut === 'Compte créé' || curStatut === 'En dépôt') {
          await updateDoc(candRef, {
            sujetId: sujet.id,
            sujetIntitule: sujet.intitule.slice(0, 240),
            sujetDescription: sujet.description.slice(0, 1200),
            sujetDiscipline: sujet.discipline.slice(0, 120),
            directeur: sujet.directeur.slice(0, 120),
            directeurEmail: sujet.directeurEmail.toLowerCase().slice(0, 160),
            laboratoire: sujet.laboratoire.slice(0, 80),
            updatedAt: serverTimestamp(),
          });
        } else {
          setActiveTab('suivi');
          return;
        }
      }
      setWizardStep(1);
      setActiveTab('candidature');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `candidatures/${uid}`);
    }
  };

  // Handle post-authentication routing
  useEffect(() => {
    const currentUid = user?.uid ?? null;
    if (currentUid && prevUidRef.current !== currentUid) {
      prevUidRef.current = currentUid;
      setAuthMode(null);
      if (pendingSujet) {
        const chosen = pendingSujet;
        setPendingSujet(null);
        saveChosenSujetForUser(
          currentUid,
          user?.email ?? authEmail,
          user?.displayName || authNom || 'Candidat',
          chosen
        );
      } else {
        getDoc(doc(db, 'candidatures', currentUid))
          .then((snap) => {
            setActiveTab(snap.exists() ? 'suivi' : 'accueil');
          })
          .catch(() => setActiveTab('accueil'));
      }
    } else if (!currentUid) {
      prevUidRef.current = null;
      if (activeTab === 'candidature' || activeTab === 'suivi') {
        setActiveTab('accueil');
      }
    }
  }, [user?.uid]);

  // Smart suggestions & selective cascade
  const suggestions = useMemo(
    () => computeSmartSuggestions(publishedSubjects, searchQuery),
    [publishedSubjects, searchQuery]
  );

  const cascade = useMemo(
    () => computeSelectiveCascade(publishedSubjects, manualFilters),
    [publishedSubjects, manualFilters]
  );

  const expressionMatchedSubjects = useMemo(() => {
    const expr = selectedExpression ?? submittedFreeQuery;
    if (!expr) return [];
    return publishedSubjects.filter((s) => subjectMatchesExpression(s, expr));
  }, [publishedSubjects, selectedExpression, submittedFreeQuery]);

  const openSujets = useMemo(
    () =>
      openSujetIds
        .map((id) => publishedSubjects.find((s) => s.id === id))
        .filter((s): s is SujetRecord => Boolean(s)),
    [openSujetIds, publishedSubjects]
  );

  const handleOpenSujetPanel = (sujetId: string) => {
    setSuggestionsOpen(false);
    setOpenSujetIds((prev) => {
      if (prev.includes(sujetId)) return prev;
      if (prev.length < 2) return [...prev, sujetId];
      return [prev[0], sujetId];
    });
  };

  const handleCloseSujetPanel = (sujetId: string) => {
    setOpenSujetIds((prev) => prev.filter((id) => id !== sujetId));
  };

  const handleSuggestionClick = (item: SmartSuggestion) => {
    setSuggestionsOpen(false);
    if (item.kind === 'sujet' && item.sujetId) {
      setSearchQuery('');
      handleOpenSujetPanel(item.sujetId);
    } else {
      setSearchQuery(item.text);
      setSelectedExpression(item.text);
      setSubmittedFreeQuery(null);
    }
  };

  const handleChoisirSujet = async (sujet: SujetRecord) => {
    if (!user) {
      setPendingSujet(sujet);
      setAuthMessage(null);
      setAuthMode('register');
      return;
    }
    await saveChosenSujetForUser(
      user.uid,
      user.email ?? '',
      user.displayName || candidature?.nom || 'Candidat',
      sujet
    );
  };

  // Auth form handlers
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthMessage(null);
    setAuthBusy(true);
    try {
      if (authMode === 'register') {
        if (!authNom.trim()) {
          setAuthMessage('Saisissez votre nom complet.');
          setAuthBusy(false);
          return;
        }
        await registerCandidat(authNom, authEmail, authPassword);
      } else if (authMode === 'login') {
        await loginWithEmail(authEmail, authPassword);
      }
      setAuthPassword('');
    } catch (err) {
      setAuthMessage(translateFirebaseAuthError(err));
    } finally {
      setAuthBusy(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!authEmail.trim()) {
      setAuthMessage('Saisissez votre email.');
      return;
    }
    setAuthBusy(true);
    setAuthMessage(null);
    try {
      await resetPassword(authEmail);
      setAuthMessage('Lien de réinitialisation envoyé.');
    } catch (err) {
      setAuthMessage(translateFirebaseAuthError(err));
    } finally {
      setAuthBusy(false);
    }
  };

  // Step 2 save handler (Université d'origine + CNE + automatic academic retrieval)
  const handleSaveStep2 = async () => {
    if (!user || !candidature) return;
    if (!origineInput || !cneInput.trim()) {
      setUploadError("Renseignez l'université d'origine et le CNE.");
      return;
    }
    setUploadError(null);
    setSavingStep(true);
    const autoOk = isPartnerApiEligible(origineInput, cneInput);
    try {
      await updateDoc(doc(db, 'candidatures', user.uid), {
        universiteOrigine: origineInput,
        cne: cneInput.trim().slice(0, 40),
        recuperationAuto: autoOk,
        statut: candidature.statut === 'Compte créé' ? 'En dépôt' : candidature.statut,
        updatedAt: serverTimestamp(),
      });

      if (autoOk) {
        const autoSlots: Array<{ slotId: PieceSlotCandidature; label: string }> = [
          { slotId: 'diplome', label: 'Diplôme Master / Ingénieur' },
          { slotId: 'releves', label: 'Relevés de notes' },
        ];
        for (const item of autoSlots) {
          const pieceRef = doc(db, 'candidatures', user.uid, 'pieces', item.slotId);
          await setDoc(pieceRef, {
            ownerId: user.uid,
            slotId: item.slotId,
            label: item.label,
            fileName: `${item.slotId}_${cneInput.trim()}.pdf`,
            mimeType: 'application/pdf',
            sizeBytes: 1024,
            storagePath: `auto/${user.uid}/${item.slotId}`,
            downloadUrl: '',
            sourceAuto: true,
            statut: 'Reçue',
            motif: '',
            updatedAt: serverTimestamp(),
          });
        }
      }

      setWizardStep(3);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `candidatures/${user.uid}`);
    } finally {
      setSavingStep(false);
    }
  };

  // File upload handler on Step 3 or post-submission replacement
  const handlePieceFileSelect = async (
    slotId: PieceSlotCandidature,
    label: string,
    file: File | undefined
  ) => {
    if (!file || !user || !candidature) return;
    const validationErr = validateCandidateFile(file);
    if (validationErr) {
      setUploadError(validationErr);
      return;
    }
    setUploadError(null);
    setUploadingSlot(slotId);
    try {
      const uploaded = await uploadDossierFile('candidatures', user.uid, slotId, file);
      const pieceRef = doc(db, 'candidatures', user.uid, 'pieces', slotId);
      const existing = piecesMap[slotId];
      if (!existing) {
        await setDoc(pieceRef, {
          ownerId: user.uid,
          slotId,
          label,
          fileName: uploaded.fileName,
          mimeType: uploaded.mimeType,
          sizeBytes: uploaded.sizeBytes,
          storagePath: uploaded.storagePath,
          downloadUrl: uploaded.downloadUrl,
          sourceAuto: false,
          statut: 'Reçue',
          motif: '',
          updatedAt: serverTimestamp(),
        });
      } else {
        await updateDoc(pieceRef, {
          fileName: uploaded.fileName,
          mimeType: uploaded.mimeType,
          sizeBytes: uploaded.sizeBytes,
          storagePath: uploaded.storagePath,
          downloadUrl: uploaded.downloadUrl,
          sourceAuto: false,
          statut: 'Reçue',
          motif: '',
          updatedAt: serverTimestamp(),
        });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `candidatures/${user.uid}/pieces/${slotId}`);
    } finally {
      setUploadingSlot(null);
    }
  };

  const handleSubmitCandidature = async () => {
    if (!user || !candidature) return;
    setSavingStep(true);
    try {
      await updateDoc(doc(db, 'candidatures', user.uid), {
        statut: 'Envoyée',
        updatedAt: serverTimestamp(),
      });
      setActiveTab('suivi');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `candidatures/${user.uid}`);
    } finally {
      setSavingStep(false);
    }
  };

  const handleResubmitAfterReplacement = async () => {
    if (!user || !candidature) return;
    setSavingStep(true);
    try {
      await updateDoc(doc(db, 'candidatures', user.uid), {
        statut: 'Envoyée',
        updatedAt: serverTimestamp(),
      });
      setActiveTab('suivi');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `candidatures/${user.uid}`);
    } finally {
      setSavingStep(false);
    }
  };

  const handleSubmitRecours = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !candidature || recoursText.trim().length < 3) return;
    setRecoursBusy(true);
    try {
      await updateDoc(doc(db, 'candidatures', user.uid), {
        recoursDepose: true,
        recoursMotif: recoursText.trim().slice(0, 800),
        updatedAt: serverTimestamp(),
      });
      setRecoursOpen(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `candidatures/${user.uid}`);
    } finally {
      setRecoursBusy(false);
    }
  };

  const todayIso = new Date().toISOString().slice(0, 10);
  const isIncompletExpired =
    candidature?.statut === 'Incomplet' &&
    Boolean(candidature.nouveauDelai) &&
    candidature.nouveauDelai < todayIso;

  const effectiveSuiviStatut = isIncompletExpired ? 'Non admis' : candidature?.statut;

  const visibleManualSlots = useMemo(() => {
    const auto = Boolean(candidature?.recuperationAuto);
    return CANDIDATURE_SLOTS.filter((s) => !(auto && s.autoEligible));
  }, [candidature?.recuperationAuto]);

  const allRequiredPiecesPresent = useMemo(() => {
    if (!candidature) return false;
    return CANDIDATURE_SLOTS.every((s) => {
      if (candidature.recuperationAuto && s.autoEligible) return true;
      const p = piecesMap[s.slotId];
      return Boolean(p && p.statut !== 'Manquante');
    });
  }, [candidature, piecesMap]);

  const canSendCandidature =
    Boolean(candidature?.sujetId) &&
    Boolean(candidature?.universiteOrigine) &&
    Boolean(candidature?.cne?.trim()) &&
    allRequiredPiecesPresent;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20">
      {/* Sticky Minimal Top Header */}
      <header className="sticky top-0 z-30 h-14 bg-white/95 backdrop-blur border-b border-slate-200 px-4">
        <div className="max-w-5xl mx-auto h-full flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => {
              setAuthMode(null);
              setActiveTab('accueil');
            }}
            className="text-base font-semibold tracking-tight text-slate-900 whitespace-nowrap shrink-0 cursor-pointer"
          >
            GCD Platform
          </button>

          <div className="relative shrink-0">
            {!user ? (
              <button
                type="button"
                onClick={() => {
                  setPendingSujet(null);
                  setAuthMessage(null);
                  setAuthMode('login');
                }}
                className="min-h-[40px] px-3 text-sm font-medium text-slate-700 hover:text-slate-950 whitespace-nowrap cursor-pointer"
              >
                Se connecter
              </button>
            ) : (
              <>
                <button
                  type="button"
                  aria-label="Compte"
                  onClick={() => setUserMenuOpen((v) => !v)}
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full text-slate-700 hover:bg-slate-100 cursor-pointer"
                >
                  <UserIcon className="w-5 h-5" />
                </button>
                {userMenuOpen && (
                  <div className="absolute right-0 mt-1 w-44 bg-white border border-slate-200 rounded-xl shadow-sm py-1 z-40">
                    <button
                      type="button"
                      onClick={async () => {
                        setUserMenuOpen(false);
                        await logout();
                      }}
                      className="w-full min-h-[44px] px-4 text-left text-sm text-slate-800 hover:bg-slate-50 whitespace-nowrap cursor-pointer"
                    >
                      Se déconnecter
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 pt-6">
        {authMode !== null ? (
          <section className="max-w-sm mx-auto bg-white border border-slate-200 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-5">
              <h1 className="text-lg font-semibold text-slate-900">
                {authMode === 'register' ? 'Créer un compte' : 'Se connecter'}
              </h1>
              <button
                type="button"
                aria-label="Fermer"
                onClick={() => {
                  setAuthMode(null);
                  setPendingSujet(null);
                  setAuthMessage(null);
                }}
                className="min-h-[44px] min-w-[44px] -mr-2 flex items-center justify-center text-slate-500 hover:text-slate-900 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAuthSubmit} className="space-y-4">
              {authMode === 'register' && (
                <input
                  type="text"
                  required
                  maxLength={120}
                  placeholder="Nom complet"
                  value={authNom}
                  onChange={(e) => setAuthNom(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:border-slate-900"
                />
              )}
              <input
                type="email"
                required
                maxLength={160}
                placeholder="Email"
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:border-slate-900"
              />
              <input
                type="password"
                required
                minLength={6}
                placeholder="Mot de passe"
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:border-slate-900"
              />

              {authMessage && (
                <p className="text-xs text-slate-700">{authMessage}</p>
              )}

              <button
                type="submit"
                disabled={authBusy}
                className="w-full h-11 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 disabled:opacity-50 cursor-pointer"
              >
                {authMode === 'register' ? 'Créer un compte' : 'Se connecter'}
              </button>
            </form>

            <div className="mt-4 flex flex-col items-center gap-2">
              {authMode === 'login' ? (
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="min-h-[40px] text-xs text-slate-600 hover:text-slate-900 cursor-pointer"
                >
                  Mot de passe oublié ?
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setAuthMessage(null);
                    setAuthMode('login');
                  }}
                  className="min-h-[40px] text-xs text-slate-600 hover:text-slate-900 cursor-pointer"
                >
                  Se connecter
                </button>
              )}
            </div>
          </section>
        ) : activeTab === 'accueil' ? (
          /* ================= 3.1 ACCUEIL ================= */
          <section className="max-w-2xl mx-auto pt-6 space-y-6">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
              CEDoc — EST Fès
            </h1>
            <p className="text-base leading-relaxed text-slate-700">
              {PRESENTATION_CEDOC}
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setActiveTab('recherche');
                setTimeout(() => searchInputRef.current?.focus(), 20);
              }}
              className="relative"
            >
              <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                placeholder="Rechercher un sujet..."
                value={searchQuery}
                onChange={(e) => {
                  const val = e.target.value;
                  setSearchQuery(val);
                  setSuggestionsOpen(true);
                  setActiveTab('recherche');
                  setTimeout(() => searchInputRef.current?.focus(), 20);
                }}
                className="w-full h-12 pl-11 pr-4 bg-white border border-slate-300 rounded-2xl text-sm focus:outline-none focus:border-slate-900"
              />
            </form>
          </section>
        ) : activeTab === 'recherche' ? (
          /* ================= 3.2 RECHERCHE ================= */
          <section className="space-y-6">
            <h1 className="text-xl font-semibold tracking-tight text-slate-900">
              Recherche
            </h1>

            {/* Search bar + Smart Suggestions */}
            <div className="space-y-3">
              <div className="relative max-w-2xl">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    setSuggestionsOpen(false);
                    if (searchQuery.trim().length >= 2) {
                      setSelectedExpression(null);
                      setSubmittedFreeQuery(searchQuery.trim());
                    }
                  }}
                >
                  <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    ref={searchInputRef}
                    type="search"
                    placeholder="Saisissez un thème ou un intitulé..."
                    value={searchQuery}
                    onFocus={() => setSuggestionsOpen(true)}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSearchQuery(val);
                      setSuggestionsOpen(true);
                      if (!val.trim()) {
                        setSelectedExpression(null);
                        setSubmittedFreeQuery(null);
                      }
                    }}
                    className="w-full h-12 pl-11 pr-10 bg-white border border-slate-300 rounded-2xl text-sm focus:outline-none focus:border-slate-900"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      aria-label="Effacer"
                      onClick={() => {
                        setSearchQuery('');
                        setSelectedExpression(null);
                        setSubmittedFreeQuery(null);
                        setSuggestionsOpen(false);
                      }}
                      className="min-h-[44px] min-w-[44px] absolute right-1 top-1/2 -translate-y-1/2 flex items-center justify-center text-slate-400 hover:text-slate-800 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </form>

                {/* Dropdown up to 8 smart suggestions (ONLY text, bold match) */}
                {suggestionsOpen && suggestions.length > 0 && (
                  <ul className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-2xl shadow-sm divide-y divide-slate-100 z-20 overflow-hidden">
                    {suggestions.map((item, idx) => (
                      <li key={`${item.kind}-${idx}-${item.text}`}>
                        <button
                          type="button"
                          onClick={() => handleSuggestionClick(item)}
                          className="w-full min-h-[44px] px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50 cursor-pointer"
                        >
                          {renderHighlightedText(item.text, item.matchStart, item.matchLength)}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <button
                  type="button"
                  onClick={() => setAdvancedOpen((v) => !v)}
                  className="min-h-[40px] px-3.5 rounded-xl border border-slate-300 bg-white text-xs font-medium text-slate-700 hover:border-slate-900 whitespace-nowrap cursor-pointer"
                >
                  Recherche avancée
                </button>
              </div>

              {/* Selective Bidirectional Cascade Filters (NO counters, NO langue) */}
              {advancedOpen && (
                <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 max-w-3xl">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <select
                      aria-label="Discipline"
                      value={cascade.effectiveFilters.discipline}
                      onChange={(e) => {
                        const val = e.target.value;
                        setManualFilters((prev) =>
                          val === ''
                            ? { ...prev, discipline: '' }
                            : { ...prev, discipline: val }
                        );
                      }}
                      className="h-11 px-3 rounded-xl border border-slate-300 bg-white text-sm text-slate-800 focus:outline-none focus:border-slate-900"
                    >
                      <option value="">Discipline</option>
                      {cascade.options.disciplines.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>

                    <select
                      aria-label="Laboratoire"
                      value={cascade.effectiveFilters.laboratoire}
                      onChange={(e) => {
                        const val = e.target.value;
                        setManualFilters((prev) =>
                          val === ''
                            ? { ...prev, laboratoire: '' }
                            : { ...prev, laboratoire: val }
                        );
                      }}
                      className="h-11 px-3 rounded-xl border border-slate-300 bg-white text-sm text-slate-800 focus:outline-none focus:border-slate-900"
                    >
                      <option value="">Laboratoire</option>
                      {cascade.options.laboratoires.map((l) => (
                        <option key={l} value={l}>
                          {l}
                        </option>
                      ))}
                    </select>

                    <select
                      aria-label="Directeur de thèse"
                      value={cascade.effectiveFilters.directeur}
                      onChange={(e) => {
                        const val = e.target.value;
                        setManualFilters((prev) =>
                          val === ''
                            ? { ...prev, directeur: '' }
                            : { ...prev, directeur: val }
                        );
                      }}
                      className="h-11 px-3 rounded-xl border border-slate-300 bg-white text-sm text-slate-800 focus:outline-none focus:border-slate-900"
                    >
                      <option value="">Directeur de thèse</option>
                      {cascade.options.directeurs.map((dir) => (
                        <option key={dir} value={dir}>
                          {dir}
                        </option>
                      ))}
                    </select>
                  </div>

                  {(manualFilters.discipline ||
                    manualFilters.laboratoire ||
                    manualFilters.directeur) && (
                    <div>
                      <button
                        type="button"
                        onClick={() =>
                          setManualFilters({ discipline: '', laboratoire: '', directeur: '' })
                        }
                        className="min-h-[36px] text-xs text-slate-600 hover:text-slate-950 cursor-pointer"
                      >
                        Réinitialiser
                      </button>
                    </div>
                  )}

                  {cascade.matchedSubjects.length > 0 && (
                    <ul className="divide-y divide-slate-100 border-t border-slate-100 pt-2">
                      {cascade.matchedSubjects.map((s) => (
                        <li key={s.id}>
                          <button
                            type="button"
                            onClick={() => handleOpenSujetPanel(s.id)}
                            className="w-full min-h-[44px] py-2.5 text-left text-sm text-slate-900 hover:text-slate-600 cursor-pointer"
                          >
                            {s.intitule}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>

            {/* Matching titles list when an expression/discipline suggestion was selected */}
            {(selectedExpression || submittedFreeQuery) && (
              <div className="bg-white border border-slate-200 rounded-2xl divide-y divide-slate-100 max-w-3xl">
                {expressionMatchedSubjects.length === 0 ? (
                  <p className="px-4 py-3 text-sm text-slate-600">Aucun sujet trouvé.</p>
                ) : (
                  expressionMatchedSubjects.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => handleOpenSujetPanel(s.id)}
                      className="w-full min-h-[48px] px-4 py-3 text-left text-sm text-slate-900 hover:bg-slate-50 cursor-pointer block"
                    >
                      {s.intitule}
                    </button>
                  ))
                )}
              </div>
            )}

            {/* Opened Subject Panels (1 or 2 side-by-side, each with × and Choisir ce sujet) */}
            {openSujets.length > 0 && (
              <div
                className={`grid grid-cols-1 ${
                  openSujets.length === 2 ? 'md:grid-cols-2' : 'max-w-2xl'
                } gap-4 items-stretch`}
              >
                {openSujets.map((sujet) => (
                  <article
                    key={sujet.id}
                    className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col justify-between gap-5"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <h2 className="text-base font-semibold text-slate-900 leading-snug">
                          {sujet.intitule}
                        </h2>
                        <button
                          type="button"
                          aria-label="Fermer"
                          onClick={() => handleCloseSujetPanel(sujet.id)}
                          className="min-h-[44px] min-w-[44px] -mt-2 -mr-2 flex items-center justify-center text-slate-400 hover:text-slate-900 shrink-0 cursor-pointer"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>

                      <p className="text-sm text-slate-700 leading-relaxed">
                        {sujet.description}
                      </p>

                      <div className="text-xs text-slate-500 flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span>{sujet.discipline}</span>
                        <span aria-hidden="true">·</span>
                        <span>{sujet.directeur}</span>
                        <span aria-hidden="true">·</span>
                        <span>{sujet.laboratoire}</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleChoisirSujet(sujet)}
                      className="w-full h-11 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 cursor-pointer"
                    >
                      Choisir ce sujet
                    </button>
                  </article>
                ))}
              </div>
            )}
          </section>
        ) : activeTab === 'candidature' ? (
          /* ================= 3.4 CANDIDATURE ================= */
          <section className="max-w-xl mx-auto space-y-6">
            <h1 className="text-xl font-semibold tracking-tight text-slate-900">
              Candidature
            </h1>

            {!candidature || !candidature.sujetId ? (
              <p className="text-sm text-slate-700">Aucun sujet choisi</p>
            ) : candidature.statut === 'Compte créé' || candidature.statut === 'En dépôt' ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-5">
                {wizardStep === 1 && (
                  <>
                    <h2 className="text-base font-semibold text-slate-900">Sujet</h2>
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-slate-900">
                        {candidature.sujetIntitule}
                      </p>
                      <p className="text-sm text-slate-700 leading-relaxed">
                        {candidature.sujetDescription}
                      </p>
                      <p className="text-xs text-slate-500">
                        {candidature.directeur} · {candidature.laboratoire}
                      </p>
                    </div>
                    <div className="flex items-center justify-between gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setActiveTab('recherche')}
                        className="h-11 px-4 rounded-xl border border-slate-300 text-sm text-slate-700 hover:border-slate-900 whitespace-nowrap cursor-pointer"
                      >
                        Changer de sujet
                      </button>
                      <button
                        type="button"
                        onClick={() => setWizardStep(2)}
                        className="h-11 px-5 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 whitespace-nowrap cursor-pointer"
                      >
                        Suivant
                      </button>
                    </div>
                  </>
                )}

                {wizardStep === 2 && (
                  <>
                    <h2 className="text-base font-semibold text-slate-900">Informations</h2>
                    <div className="space-y-3">
                      <select
                        aria-label="Université d'origine"
                        value={origineInput}
                        onChange={(e) =>
                          setOrigineInput(e.target.value as '' | 'EST Fès' | 'Autre')
                        }
                        className="w-full h-11 px-3 rounded-xl border border-slate-300 bg-white text-sm text-slate-900 focus:outline-none focus:border-slate-900"
                      >
                        <option value="">Université d'origine</option>
                        <option value="EST Fès">EST Fès</option>
                        <option value="Autre">Autre</option>
                      </select>

                      <input
                        type="text"
                        maxLength={40}
                        placeholder="CNE / Identifiant étudiant"
                        value={cneInput}
                        onChange={(e) => setCneInput(e.target.value)}
                        className="w-full h-11 px-3.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:border-slate-900"
                      />
                    </div>

                    {uploadError && <p className="text-xs text-red-600">{uploadError}</p>}

                    <div className="flex items-center justify-between gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setUploadError(null);
                          setWizardStep(1);
                        }}
                        className="h-11 px-4 rounded-xl border border-slate-300 text-sm text-slate-700 hover:border-slate-900 whitespace-nowrap cursor-pointer"
                      >
                        Précédent
                      </button>
                      <button
                        type="button"
                        disabled={savingStep}
                        onClick={handleSaveStep2}
                        className="h-11 px-5 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 disabled:opacity-50 whitespace-nowrap cursor-pointer"
                      >
                        Suivant
                      </button>
                    </div>
                  </>
                )}

                {wizardStep === 3 && (
                  <>
                    <h2 className="text-base font-semibold text-slate-900">Documents</h2>

                    <div className="divide-y divide-slate-100">
                      {visibleManualSlots.map((slot) => {
                        const existing = piecesMap[slot.slotId];
                        const isBusy = uploadingSlot === slot.slotId;
                        return (
                          <div
                            key={slot.slotId}
                            className="py-3 flex items-center justify-between gap-3"
                          >
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-slate-900">{slot.label}</p>
                              {existing && (
                                <p className="text-xs text-slate-500 truncate">
                                  {existing.fileName}
                                </p>
                              )}
                            </div>

                            <label className="min-h-[40px] px-3.5 rounded-xl border border-slate-300 text-xs font-medium text-slate-800 hover:border-slate-900 flex items-center justify-center shrink-0 whitespace-nowrap cursor-pointer">
                              {isBusy
                                ? '...'
                                : existing
                                ? 'Remplacer'
                                : 'Choisir un fichier'}
                              <input
                                type="file"
                                accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                                className="hidden"
                                disabled={isBusy}
                                onChange={(e) => {
                                  const f = e.target.files?.[0];
                                  e.target.value = '';
                                  handlePieceFileSelect(slot.slotId, slot.label, f);
                                }}
                              />
                            </label>
                          </div>
                        );
                      })}
                    </div>

                    {uploadError && <p className="text-xs text-red-600">{uploadError}</p>}

                    <div className="flex items-center justify-between gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setUploadError(null);
                          setWizardStep(2);
                        }}
                        className="h-11 px-4 rounded-xl border border-slate-300 text-sm text-slate-700 hover:border-slate-900 whitespace-nowrap cursor-pointer"
                      >
                        Précédent
                      </button>

                      {canSendCandidature && (
                        <button
                          type="button"
                          disabled={savingStep}
                          onClick={handleSubmitCandidature}
                          className="h-11 px-5 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 disabled:opacity-50 whitespace-nowrap cursor-pointer"
                        >
                          Envoyer ma candidature
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            ) : (candidature.statut === 'Envoyée' ||
                (candidature.statut === 'Incomplet' && !isIncompletExpired)) ? (
              /* Post-submission replacement allowed before Complet or within nouveauDelai */
              <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
                <h2 className="text-base font-semibold text-slate-900">Documents</h2>
                <div className="divide-y divide-slate-100">
                  {visibleManualSlots.map((slot) => {
                    const existing = piecesMap[slot.slotId];
                    const isBusy = uploadingSlot === slot.slotId;
                    const canReplace =
                      candidature.statut === 'Envoyée' ||
                      (candidature.statut === 'Incomplet' &&
                        (!existing || existing.statut === 'Non conforme' || existing.statut === 'Reçue'));

                    return (
                      <div
                        key={slot.slotId}
                        className="py-3 flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-900">{slot.label}</p>
                          {existing && (
                            <p className="text-xs text-slate-500 truncate">{existing.fileName}</p>
                          )}
                        </div>

                        {canReplace && (
                          <label className="min-h-[40px] px-3.5 rounded-xl border border-slate-300 text-xs font-medium text-slate-800 hover:border-slate-900 flex items-center justify-center shrink-0 whitespace-nowrap cursor-pointer">
                            {isBusy ? '...' : 'Remplacer'}
                            <input
                              type="file"
                              accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                              className="hidden"
                              disabled={isBusy}
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                e.target.value = '';
                                handlePieceFileSelect(slot.slotId, slot.label, f);
                              }}
                            />
                          </label>
                        )}
                      </div>
                    );
                  })}
                </div>

                {uploadError && <p className="text-xs text-red-600">{uploadError}</p>}

                {candidature.statut === 'Incomplet' &&
                  CANDIDATURE_SLOTS.every((s) => {
                    if (candidature.recuperationAuto && s.autoEligible) return true;
                    const p = piecesMap[s.slotId];
                    return p && p.statut !== 'Non conforme' && p.statut !== 'Manquante';
                  }) && (
                    <button
                      type="button"
                      disabled={savingStep}
                      onClick={handleResubmitAfterReplacement}
                      className="w-full h-11 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 disabled:opacity-50 cursor-pointer"
                    >
                      Envoyer ma candidature
                    </button>
                  )}
              </div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-2">
                <p className="text-sm font-medium text-slate-900">{candidature.sujetIntitule}</p>
                <p className="text-xs text-slate-500">
                  {candidature.directeur} · {candidature.laboratoire}
                </p>
              </div>
            )}
          </section>
        ) : (
          /* ================= 3.5 SUIVI (READ-ONLY) ================= */
          <section className="max-w-xl mx-auto space-y-6">
            <h1 className="text-xl font-semibold tracking-tight text-slate-900">Suivi</h1>

            {!candidature ? (
              <p className="text-sm text-slate-700">Aucune candidature</p>
            ) : (
              <div className="space-y-5">
                <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="text-slate-600">Statut</span>
                    <span className="font-semibold text-slate-900">{effectiveSuiviStatut}</span>
                  </div>

                  {candidature.nouveauDelai && effectiveSuiviStatut === 'Incomplet' && (
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <span className="text-slate-600">Délai</span>
                      <span className="tabular-nums text-slate-900">
                        {candidature.nouveauDelai}
                      </span>
                    </div>
                  )}

                  {candidature.convocationDate && (
                    <div className="pt-2 border-t border-slate-100 text-sm space-y-1">
                      <p className="font-medium text-slate-900">Convocation</p>
                      <p className="text-slate-700 tabular-nums">
                        {candidature.convocationDate}
                        {candidature.convocationLieu ? ` · ${candidature.convocationLieu}` : ''}
                      </p>
                    </div>
                  )}

                  {(effectiveSuiviStatut === 'Admis' ||
                    effectiveSuiviStatut === 'Non admis' ||
                    effectiveSuiviStatut === 'Non présélectionné') && (
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 text-sm">
                      <span className="text-slate-600">Résultat</span>
                      <span className="font-semibold text-slate-900">{effectiveSuiviStatut}</span>
                    </div>
                  )}

                  <div className="pt-2 border-t border-slate-100 divide-y divide-slate-100">
                    {CANDIDATURE_SLOTS.map((slot) => {
                      const p = piecesMap[slot.slotId];
                      const st = p ? p.statut : 'Manquante';
                      return (
                        <div key={slot.slotId} className="py-2.5 space-y-1">
                          <div className="flex items-center justify-between gap-3 text-sm">
                            <span className="text-slate-800">{slot.label}</span>
                            <span className="text-slate-600 shrink-0">{st}</span>
                          </div>
                          {p?.statut === 'Non conforme' && p.motif && (
                            <p className="text-xs text-red-600">{p.motif}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {effectiveSuiviStatut === 'Non admis' && !isIncompletExpired && (
                    <div className="pt-3 border-t border-slate-100">
                      {candidature.recoursDepose ? (
                        <p className="text-xs text-slate-600">Recours enregistré</p>
                      ) : !recoursOpen ? (
                        <button
                          type="button"
                          onClick={() => setRecoursOpen(true)}
                          className="h-10 px-4 rounded-xl border border-slate-300 text-xs font-medium text-slate-800 hover:border-slate-900 cursor-pointer"
                        >
                          Recours
                        </button>
                      ) : (
                        <form onSubmit={handleSubmitRecours} className="space-y-3">
                          <textarea
                            rows={3}
                            required
                            maxLength={800}
                            placeholder="Motif du recours"
                            value={recoursText}
                            onChange={(e) => setRecoursText(e.target.value)}
                            className="w-full p-3 rounded-xl border border-slate-300 text-sm focus:outline-none focus:border-slate-900"
                          />
                          <div className="flex items-center gap-2">
                            <button
                              type="submit"
                              disabled={recoursBusy}
                              className="h-10 px-4 rounded-xl bg-slate-900 text-white text-xs font-medium cursor-pointer"
                            >
                              Envoyer
                            </button>
                            <button
                              type="button"
                              onClick={() => setRecoursOpen(false)}
                              className="h-10 px-4 rounded-xl border border-slate-300 text-xs text-slate-700 cursor-pointer"
                            >
                              Annuler
                            </button>
                          </div>
                        </form>
                      )}
                    </div>
                  )}
                </div>

                {publicationAdmis?.publieeParSecretariat && publicationAdmis.admis.length > 0 && (
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
                    <h2 className="text-base font-semibold text-slate-900">Liste des admis</h2>
                    <ul className="divide-y divide-slate-100 text-sm text-slate-800">
                      {publicationAdmis.admis.map((line, i) => (
                        <li key={i} className="py-2">
                          {line}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </section>
        )}
      </main>

      {/* Fixed Bottom Tab Bar */}
      <nav
        aria-label="Navigation principale"
        className="fixed bottom-0 left-0 right-0 z-30 h-14 bg-white/95 backdrop-blur border-t border-slate-200"
      >
        <div
          className={`max-w-5xl mx-auto h-full grid ${
            user ? 'grid-cols-4' : 'grid-cols-2'
          } items-center`}
        >
          <button
            type="button"
            onClick={() => {
              setAuthMode(null);
              setActiveTab('accueil');
            }}
            className={`h-full text-xs font-medium whitespace-nowrap cursor-pointer ${
              activeTab === 'accueil' && authMode === null
                ? 'text-slate-950 font-semibold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Accueil
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthMode(null);
              setActiveTab('recherche');
            }}
            className={`h-full text-xs font-medium whitespace-nowrap cursor-pointer ${
              activeTab === 'recherche' && authMode === null
                ? 'text-slate-950 font-semibold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Recherche
          </button>
          {user && (
            <>
              <button
                type="button"
                onClick={() => {
                  setAuthMode(null);
                  setActiveTab('candidature');
                }}
                className={`h-full text-xs font-medium whitespace-nowrap cursor-pointer ${
                  activeTab === 'candidature' && authMode === null
                    ? 'text-slate-950 font-semibold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Candidature
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthMode(null);
                  setActiveTab('suivi');
                }}
                className={`h-full text-xs font-medium whitespace-nowrap cursor-pointer ${
                  activeTab === 'suivi' && authMode === null
                    ? 'text-slate-950 font-semibold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Suivi
              </button>
            </>
          )}
        </div>
      </nav>
    </div>
  );
};
