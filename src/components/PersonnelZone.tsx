import React, { useEffect, useMemo, useState } from 'react';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { User as UserIcon } from 'lucide-react';
import { SEED_ADMIN_EMAIL } from '../config/constants';
import { useAuth } from '../context/AuthContext';
import { INITIAL_LABORATOIRES, SPECIALITES_INITIALES } from '../data/initialCatalog';
import {
  auth,
  db,
  handleFirestoreError,
  OperationType,
  provisionPersonnelAuthAccount,
  translateFirebaseAuthError,
} from '../firebase';
import {
  ALL_PERSONNEL_ROLES,
  CANDIDATURE_SLOTS,
  CandidatureRecord,
  PersonnelRecord,
  PersonnelRole,
  PieceDossierRecord,
  PrecontroleIARecord,
  PublicationAdmisRecord,
  REINSCRIPTION_SLOTS,
  ReinscriptionRecord,
  SujetRecord,
} from '../types/cedoc';

const ALL_DOSSIER_STATUTS = [
  'Envoyée',
  'Incomplet',
  'Complet',
  'Présélectionné',
  'Non présélectionné',
  'Convoqué',
  'Admis',
  'Non admis',
  'Inscrit',
];

export const PersonnelZone: React.FC = () => {
  const {
    user,
    personnel,
    activePersonnelRole,
    setActivePersonnelRole,
    loginWithEmail,
    resetPassword,
    logout,
  } = useAuth();

  const [userMenuOpen, setUserMenuOpen] = useState(false);

  // Personnel login state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginMsg, setLoginMsg] = useState<string | null>(null);
  const [loginBusy, setLoginBusy] = useState(false);

  // Role tab state
  const [activeTab, setActiveTab] = useState<string>('accueil');

  useEffect(() => {
    setActiveTab('accueil');
  }, [activePersonnelRole]);

  const handlePersonnelLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginMsg(null);
    setLoginBusy(true);
    const cleanEmail = loginEmail.trim().toLowerCase();
    try {
      await loginWithEmail(cleanEmail, loginPassword);
      setLoginPassword('');
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code ?? '';
      // Cold-start bootstrap for seed admin email if account does not exist yet in Firebase Auth
      if (
        cleanEmail === SEED_ADMIN_EMAIL &&
        (code === 'auth/user-not-found' || code === 'auth/invalid-credential')
      ) {
        try {
          await createUserWithEmailAndPassword(auth, cleanEmail, loginPassword);
          setLoginPassword('');
          setLoginBusy(false);
          return;
        } catch {
          setLoginMsg('Email ou mot de passe incorrect.');
          setLoginBusy(false);
          return;
        }
      }
      setLoginMsg(translateFirebaseAuthError(err));
    } finally {
      setLoginBusy(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!loginEmail.trim()) {
      setLoginMsg('Saisissez votre email.');
      return;
    }
    setLoginBusy(true);
    setLoginMsg(null);
    try {
      await resetPassword(loginEmail);
      setLoginMsg('Lien de réinitialisation envoyé.');
    } catch (err) {
      setLoginMsg(translateFirebaseAuthError(err));
    } finally {
      setLoginBusy(false);
    }
  };

  // 1. Unauthenticated -> Personnel Login ONLY (no account creation button)
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center px-4">
        <section className="w-full max-w-sm bg-white border border-slate-200 rounded-2xl p-6">
          <h1 className="text-lg font-semibold text-slate-900 mb-5">Se connecter</h1>
          <form onSubmit={handlePersonnelLogin} className="space-y-4">
            <input
              type="email"
              required
              maxLength={160}
              placeholder="Email"
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              className="w-full h-11 px-3.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:border-slate-900"
            />
            <input
              type="password"
              required
              minLength={6}
              placeholder="Mot de passe"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              className="w-full h-11 px-3.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:border-slate-900"
            />

            {loginMsg && <p className="text-xs text-slate-700">{loginMsg}</p>}

            <button
              type="submit"
              disabled={loginBusy}
              className="w-full h-11 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 disabled:opacity-50 cursor-pointer"
            >
              Se connecter
            </button>
          </form>

          <div className="mt-4 flex justify-center">
            <button
              type="button"
              onClick={handleForgotPassword}
              className="min-h-[40px] text-xs text-slate-600 hover:text-slate-900 cursor-pointer"
            >
              Mot de passe oublié ?
            </button>
          </div>
        </section>
      </div>
    );
  }

  // 2. Signed in, NOT in personnel -> "Accès réservé au personnel"
  if (!personnel || personnel.roles.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900">
        <header className="h-14 bg-white border-b border-slate-200 px-4">
          <div className="max-w-5xl mx-auto h-full flex items-center justify-between">
            <span className="text-base font-semibold text-slate-900">GCD Platform</span>
            <button
              type="button"
              onClick={logout}
              className="min-h-[40px] px-3 text-xs font-medium text-slate-700 hover:text-slate-950 cursor-pointer"
            >
              Se déconnecter
            </button>
          </div>
        </header>
        <main className="max-w-xl mx-auto px-4 pt-12">
          <p className="text-sm font-medium text-slate-800">Accès réservé au personnel</p>
        </main>
      </div>
    );
  }

  // 3. Multi-role space selector
  if (!activePersonnelRole) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900">
        <header className="h-14 bg-white border-b border-slate-200 px-4">
          <div className="max-w-5xl mx-auto h-full flex items-center justify-between">
            <span className="text-base font-semibold text-slate-900">GCD Platform</span>
            <button
              type="button"
              onClick={logout}
              className="min-h-[40px] px-3 text-xs font-medium text-slate-700 hover:text-slate-950 cursor-pointer"
            >
              Se déconnecter
            </button>
          </div>
        </header>
        <main className="max-w-sm mx-auto px-4 pt-10 space-y-4">
          <h1 className="text-lg font-semibold text-slate-900">Choisir un espace</h1>
          <div className="space-y-2">
            {personnel.roles.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setActivePersonnelRole(r)}
                className="w-full h-12 px-4 rounded-2xl bg-white border border-slate-200 text-left text-sm font-medium text-slate-900 hover:border-slate-900 cursor-pointer"
              >
                {r}
              </button>
            ))}
          </div>
        </main>
      </div>
    );
  }

  const tabsForRole: Array<{ id: string; label: string }> =
    activePersonnelRole === 'Secrétariat CEDoc'
      ? [
          { id: 'accueil', label: 'Accueil' },
          { id: 'dossiers', label: 'Dossiers' },
          { id: 'admis', label: 'Admis' },
          { id: 'reinscriptions', label: 'Réinscriptions' },
        ]
      : activePersonnelRole === 'Jury'
      ? [
          { id: 'accueil', label: 'Accueil' },
          { id: 'resultats', label: 'Résultats' },
        ]
      : activePersonnelRole === 'Directeur de thèse'
      ? [
          { id: 'accueil', label: 'Accueil' },
          { id: 'sujets', label: 'Mes sujets' },
        ]
      : activePersonnelRole === 'Directeur du laboratoire'
      ? [
          { id: 'accueil', label: 'Accueil' },
          { id: 'sujets', label: 'Sujets' },
        ]
      : [
          { id: 'accueil', label: 'Accueil' },
          { id: 'admis', label: 'Admis' },
          { id: 'personnel', label: 'Personnel' },
        ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20">
      <header className="sticky top-0 z-30 h-14 bg-white/95 backdrop-blur border-b border-slate-200 px-4">
        <div className="max-w-5xl mx-auto h-full flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-base font-semibold tracking-tight text-slate-900 whitespace-nowrap">
              {activePersonnelRole}
            </span>
            {personnel.roles.length > 1 && (
              <button
                type="button"
                onClick={() => setActivePersonnelRole(null)}
                className="min-h-[36px] px-2.5 rounded-lg border border-slate-300 text-xs text-slate-700 hover:border-slate-900 whitespace-nowrap cursor-pointer"
              >
                Changer
              </button>
            )}
          </div>

          <div className="relative shrink-0">
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
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 pt-6">
        {activePersonnelRole === 'Secrétariat CEDoc' && (
          <SecretariatWorkspace activeTab={activeTab} />
        )}
        {activePersonnelRole === 'Jury' && <JuryWorkspace activeTab={activeTab} />}
        {activePersonnelRole === 'Directeur de thèse' && (
          <DirecteurTheseWorkspace activeTab={activeTab} personnel={personnel} />
        )}
        {activePersonnelRole === 'Directeur du laboratoire' && (
          <DirecteurLaboWorkspace activeTab={activeTab} personnel={personnel} />
        )}
        {activePersonnelRole === 'Directeur du CEDoc' && (
          <DirecteurCedocWorkspace activeTab={activeTab} currentEmail={personnel.email} />
        )}
      </main>

      <nav
        aria-label="Navigation personnel"
        className="fixed bottom-0 left-0 right-0 z-30 h-14 bg-white/95 backdrop-blur border-t border-slate-200"
      >
        <div
          className="max-w-5xl mx-auto h-full grid items-center"
          style={{ gridTemplateColumns: `repeat(${tabsForRole.length}, minmax(0, 1fr))` }}
        >
          {tabsForRole.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              className={`h-full text-xs font-medium whitespace-nowrap cursor-pointer ${
                activeTab === t.id
                  ? 'text-slate-950 font-semibold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
};

// ============================================================================
// 5.1 SECRÉTARIAT CEDOC WORKSPACE
// ============================================================================

const SecretariatWorkspace: React.FC<{ activeTab: string }> = ({ activeTab }) => {
  const [dossiers, setDossiers] = useState<CandidatureRecord[]>([]);
  const [reinscriptions, setReinscriptions] = useState<ReinscriptionRecord[]>([]);
  const [publication, setPublication] = useState<PublicationAdmisRecord | null>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedPieces, setSelectedPieces] = useState<Record<string, PieceDossierRecord>>({});
  const [precontroles, setPrecontroles] = useState<Record<string, PrecontroleIARecord>>({});
  const [rejectSlot, setRejectSlot] = useState<string | null>(null);
  const [rejectMotif, setRejectMotif] = useState('');
  const [delaiInput, setDelaiInput] = useState('');

  const [selectedReinscId, setSelectedReinscId] = useState<string | null>(null);
  const [reinscPieces, setReinscPieces] = useState<Record<string, PieceDossierRecord>>({});
  const [reinscRejectSlot, setReinscRejectSlot] = useState<string | null>(null);
  const [reinscRejectMotif, setReinscRejectMotif] = useState('');
  const [reinscDelai, setReinscDelai] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'candidatures'), where('statut', 'in', ALL_DOSSIER_STATUTS));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const todayIso = new Date().toISOString().slice(0, 10);
        const list: CandidatureRecord[] = snap.docs.map((d) => {
          const data = d.data();
          const rec: CandidatureRecord = {
            candidatId: d.id,
            nom: String(data.nom ?? ''),
            email: String(data.email ?? ''),
            sujetId: String(data.sujetId ?? ''),
            sujetIntitule: String(data.sujetIntitule ?? ''),
            sujetDescription: String(data.sujetDescription ?? ''),
            sujetDiscipline: String(data.sujetDiscipline ?? ''),
            directeur: String(data.directeur ?? ''),
            directeurEmail: String(data.directeurEmail ?? ''),
            laboratoire: String(data.laboratoire ?? ''),
            universiteOrigine: (data.universiteOrigine as '' | 'EST Fès' | 'Autre') ?? '',
            cne: String(data.cne ?? ''),
            recuperationAuto: Boolean(data.recuperationAuto),
            statut: data.statut,
            nouveauDelai: String(data.nouveauDelai ?? ''),
            convocationDate: String(data.convocationDate ?? ''),
            convocationLieu: String(data.convocationLieu ?? ''),
            recoursDepose: Boolean(data.recoursDepose),
            recoursMotif: String(data.recoursMotif ?? ''),
          };
          if (rec.statut === 'Incomplet' && rec.nouveauDelai && rec.nouveauDelai < todayIso) {
            updateDoc(doc(db, 'candidatures', rec.candidatId), {
              statut: 'Non admis',
              nouveauDelai: rec.nouveauDelai,
              updatedAt: serverTimestamp(),
            }).catch(() => {});
          }
          return rec;
        });
        setDossiers(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'candidatures')
    );
    return () => unsub();
  }, []);

  useEffect(() => {
    const q = query(
      collection(db, 'reinscriptions'),
      where('statut', 'in', ['En dépôt', 'Envoyée', 'Incomplet', 'Validée'])
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        setReinscriptions(
          snap.docs.map((d) => {
            const data = d.data();
            return {
              doctorantId: d.id,
              nom: String(data.nom ?? ''),
              email: String(data.email ?? ''),
              annee: Number(data.annee ?? 2),
              sujetIntitule: String(data.sujetIntitule ?? ''),
              directeur: String(data.directeur ?? ''),
              laboratoire: String(data.laboratoire ?? ''),
              statut: data.statut,
              nouveauDelai: String(data.nouveauDelai ?? ''),
            };
          })
        );
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'reinscriptions')
    );
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, 'publication_admis', 'officielle'),
      (snap) => {
        if (!snap.exists()) {
          setPublication(null);
        } else {
          const d = snap.data();
          setPublication({
            valideeParCedoc: Boolean(d.valideeParCedoc),
            publieeParSecretariat: Boolean(d.publieeParSecretariat),
            admis: Array.isArray(d.admis) ? d.admis.map(String) : [],
          });
        }
      },
      (err) => handleFirestoreError(err, OperationType.GET, 'publication_admis/officielle')
    );
    return () => unsub();
  }, []);

  // Load selected dossier's 5 slots + confidential AI precheck
  const loadDossierDetails = async (dossier: CandidatureRecord) => {
    const pMap: Record<string, PieceDossierRecord> = {};
    const iaMap: Record<string, PrecontroleIARecord> = {};

    await Promise.all(
      CANDIDATURE_SLOTS.map(async (slot) => {
        const pSnap = await getDoc(doc(db, 'candidatures', dossier.candidatId, 'pieces', slot.slotId));
        if (pSnap.exists()) {
          const d = pSnap.data();
          pMap[slot.slotId] = {
            ownerId: String(d.ownerId ?? dossier.candidatId),
            slotId: slot.slotId,
            label: String(d.label ?? slot.label),
            fileName: String(d.fileName ?? ''),
            mimeType: String(d.mimeType ?? ''),
            sizeBytes: Number(d.sizeBytes ?? 0),
            storagePath: String(d.storagePath ?? ''),
            downloadUrl: String(d.downloadUrl ?? ''),
            sourceAuto: Boolean(d.sourceAuto),
            statut: d.statut,
            motif: String(d.motif ?? ''),
          };
        }

        const iaSnap = await getDoc(
          doc(db, 'candidatures', dossier.candidatId, 'precontrole', slot.slotId)
        );
        if (iaSnap.exists()) {
          const idata = iaSnap.data();
          iaMap[slot.slotId] = {
            candidatId: dossier.candidatId,
            slotId: slot.slotId,
            statut: idata.statut,
            motif: String(idata.motif ?? ''),
            fileName: String(idata.fileName ?? ''),
          };
        }
      })
    );

    setSelectedPieces({ ...pMap });
    setPrecontroles({ ...iaMap });

    // Run confidential AI pre-check on any uploaded piece not yet evaluated for its current fileName
    for (const slot of CANDIDATURE_SLOTS) {
      const piece = pMap[slot.slotId];
      if (!piece) continue;
      const existingIa = iaMap[slot.slotId];
      if (existingIa && existingIa.fileName === piece.fileName) continue;

      try {
        const resp = await fetch('/api/verify-document', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            label: piece.label,
            fileName: piece.fileName,
            mimeType: piece.mimeType,
            downloadUrl: piece.downloadUrl,
            candidatNom: dossier.nom,
            sourceAuto: piece.sourceAuto,
          }),
        });
        const result = (await resp.json()) as {
          status?: 'Conforme' | 'Douteux' | 'Non conforme';
          motif?: string;
        };
        const st = result.status ?? 'Douteux';
        const mt = (result.motif ?? 'Vérification manuelle requise.').slice(0, 480);

        const iaRef = doc(db, 'candidatures', dossier.candidatId, 'precontrole', slot.slotId);
        if (!existingIa) {
          await setDoc(iaRef, {
            candidatId: dossier.candidatId,
            slotId: slot.slotId,
            statut: st,
            motif: mt,
            fileName: piece.fileName.slice(0, 180),
            updatedAt: serverTimestamp(),
          });
        } else {
          await updateDoc(iaRef, {
            statut: st,
            motif: mt,
            fileName: piece.fileName.slice(0, 180),
            updatedAt: serverTimestamp(),
          });
        }
        iaMap[slot.slotId] = {
          candidatId: dossier.candidatId,
          slotId: slot.slotId,
          statut: st,
          motif: mt,
          fileName: piece.fileName,
        };
        setPrecontroles({ ...iaMap });
      } catch {
        // Non-blocking: defaults to manual verification
      }
    }
  };

  const selectedDossier = dossiers.find((d) => d.candidatId === selectedId) ?? null;

  useEffect(() => {
    if (selectedDossier) {
      loadDossierDetails(selectedDossier);
    }
  }, [selectedDossier?.candidatId, selectedDossier?.statut]);

  const handlePieceDecision = async (
    candidatId: string,
    slotId: string,
    statut: 'Conforme' | 'Non conforme',
    motif: string
  ) => {
    try {
      await updateDoc(doc(db, 'candidatures', candidatId, 'pieces', slotId), {
        statut,
        motif: statut === 'Non conforme' ? motif.trim().slice(0, 500) : '',
        updatedAt: serverTimestamp(),
      });
      setSelectedPieces((prev) =>
        prev[slotId]
          ? {
              ...prev,
              [slotId]: {
                ...prev[slotId],
                statut,
                motif: statut === 'Non conforme' ? motif.trim() : '',
              },
            }
          : prev
      );
      setRejectSlot(null);
      setRejectMotif('');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `candidatures/${candidatId}/pieces/${slotId}`);
    }
  };

  const handleDeclarerComplet = async (dossier: CandidatureRecord) => {
    try {
      await updateDoc(doc(db, 'candidatures', dossier.candidatId), {
        statut: 'Complet',
        nouveauDelai: '',
        updatedAt: serverTimestamp(),
      });
      setSelectedId(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `candidatures/${dossier.candidatId}`);
    }
  };

  const handleDeclarerIncomplet = async (dossier: CandidatureRecord) => {
    if (!delaiInput) return;
    try {
      await updateDoc(doc(db, 'candidatures', dossier.candidatId), {
        statut: 'Incomplet',
        nouveauDelai: delaiInput,
        updatedAt: serverTimestamp(),
      });
      setDelaiInput('');
      setSelectedId(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `candidatures/${dossier.candidatId}`);
    }
  };

  const handlePublierAdmis = async () => {
    if (!publication?.valideeParCedoc || publication.publieeParSecretariat) return;
    try {
      await updateDoc(doc(db, 'publication_admis', 'officielle'), {
        publieeParSecretariat: true,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'publication_admis/officielle');
    }
  };

  const handleInscrireCandidat = async (candidatId: string) => {
    try {
      await updateDoc(doc(db, 'candidatures', candidatId), {
        statut: 'Inscrit',
        nouveauDelai: '',
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `candidatures/${candidatId}`);
    }
  };

  // Load selected reinscription pieces
  const selectedReinsc = reinscriptions.find((r) => r.doctorantId === selectedReinscId) ?? null;

  useEffect(() => {
    if (!selectedReinsc) return;
    Promise.all(
      REINSCRIPTION_SLOTS.map(async (slot) => {
        const snap = await getDoc(
          doc(db, 'reinscriptions', selectedReinsc.doctorantId, 'pieces', slot.slotId)
        );
        if (!snap.exists()) return null;
        const d = snap.data();
        return {
          slotId: slot.slotId,
          rec: {
            ownerId: selectedReinsc.doctorantId,
            slotId: slot.slotId,
            label: String(d.label ?? slot.label),
            fileName: String(d.fileName ?? ''),
            mimeType: String(d.mimeType ?? ''),
            sizeBytes: Number(d.sizeBytes ?? 0),
            storagePath: String(d.storagePath ?? ''),
            downloadUrl: String(d.downloadUrl ?? ''),
            sourceAuto: false,
            statut: d.statut,
            motif: String(d.motif ?? ''),
          } as PieceDossierRecord,
        };
      })
    ).then((items) => {
      const m: Record<string, PieceDossierRecord> = {};
      items.forEach((it) => {
        if (it) m[it.slotId] = it.rec;
      });
      setReinscPieces(m);
    });
  }, [selectedReinsc?.doctorantId]);

  if (activeTab === 'accueil') {
    const aControler = dossiers.filter((d) => d.statut === 'Envoyée').length;
    const incomplets = dossiers.filter((d) => d.statut === 'Incomplet').length;
    const reinscAttente = reinscriptions.filter((r) => r.statut === 'Envoyée').length;

    return (
      <section className="space-y-6">
        <h1 className="text-xl font-semibold text-slate-900">Accueil</h1>
        {dossiers.length === 0 && reinscriptions.length === 0 ? (
          <p className="text-sm text-slate-600">Aucun dossier reçu.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-5">
              <p className="text-2xl font-semibold tabular-nums text-slate-900">{aControler}</p>
              <p className="text-xs text-slate-500 mt-1">Dossiers à contrôler</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-5">
              <p className="text-2xl font-semibold tabular-nums text-slate-900">{incomplets}</p>
              <p className="text-xs text-slate-500 mt-1">Incomplets</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-5">
              <p className="text-2xl font-semibold tabular-nums text-slate-900">{reinscAttente}</p>
              <p className="text-xs text-slate-500 mt-1">Réinscriptions</p>
            </div>
          </div>
        )}
      </section>
    );
  }

  if (activeTab === 'dossiers') {
    const listToVerify = dossiers.filter((d) =>
      ['Envoyée', 'Incomplet', 'Complet'].includes(d.statut)
    );
    const allSlotsConforme = CANDIDATURE_SLOTS.every(
      (s) => selectedPieces[s.slotId]?.statut === 'Conforme'
    );

    return (
      <section className="space-y-6">
        <h1 className="text-xl font-semibold text-slate-900">Dossiers</h1>

        {listToVerify.length === 0 ? (
          <p className="text-sm text-slate-600">Aucun dossier.</p>
        ) : !selectedDossier ? (
          <div className="bg-white border border-slate-200 rounded-2xl divide-y divide-slate-100">
            {listToVerify.map((d) => (
              <button
                key={d.candidatId}
                type="button"
                onClick={() => setSelectedId(d.candidatId)}
                className="w-full min-h-[56px] px-4 py-3 flex items-center justify-between gap-4 text-left hover:bg-slate-50 cursor-pointer"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{d.nom}</p>
                  <p className="text-xs text-slate-500 truncate">
                    {d.sujetIntitule}
                    {d.recoursDepose ? ' · Recours' : ''}
                  </p>
                </div>
                <span className="text-xs text-slate-600 shrink-0">{d.statut}</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-slate-900">{selectedDossier.nom}</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {selectedDossier.universiteOrigine} · CNE {selectedDossier.cne} ·{' '}
                  {selectedDossier.statut}
                </p>
                <p className="text-sm text-slate-700 mt-2">{selectedDossier.sujetIntitule}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedId(null)}
                className="min-h-[40px] px-3 rounded-xl border border-slate-300 text-xs text-slate-700 cursor-pointer"
              >
                Retour
              </button>
            </div>

            <div className="divide-y divide-slate-100 border-t border-slate-100">
              {CANDIDATURE_SLOTS.map((slot) => {
                const piece = selectedPieces[slot.slotId];
                const ia = precontroles[slot.slotId];
                return (
                  <div key={slot.slotId} className="py-3.5 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900">{slot.label}</p>
                        {piece ? (
                          <p className="text-xs text-slate-500">
                            {piece.downloadUrl ? (
                              <a
                                href={piece.downloadUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="underline hover:text-slate-900"
                              >
                                {piece.fileName}
                              </a>
                            ) : (
                              piece.fileName
                            )}{' '}
                            · {piece.statut}
                          </p>
                        ) : (
                          <p className="text-xs text-slate-400">Manquante</p>
                        )}
                        {ia && (
                          <p className="text-xs text-slate-600 mt-0.5">
                            IA : {ia.statut} — {ia.motif}
                          </p>
                        )}
                      </div>

                      {piece && selectedDossier.statut !== 'Complet' && (
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() =>
                              handlePieceDecision(
                                selectedDossier.candidatId,
                                slot.slotId,
                                'Conforme',
                                ''
                              )
                            }
                            className="h-9 px-3 rounded-xl border border-slate-300 text-xs font-medium text-slate-800 hover:border-slate-900 cursor-pointer"
                          >
                            Conforme
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setRejectSlot(slot.slotId);
                              setRejectMotif(piece.motif || '');
                            }}
                            className="h-9 px-3 rounded-xl border border-slate-300 text-xs font-medium text-slate-800 hover:border-slate-900 cursor-pointer"
                          >
                            Non conforme
                          </button>
                        </div>
                      )}
                    </div>

                    {rejectSlot === slot.slotId && (
                      <div className="flex items-center gap-2 pt-1">
                        <input
                          type="text"
                          placeholder="Motif"
                          maxLength={500}
                          value={rejectMotif}
                          onChange={(e) => setRejectMotif(e.target.value)}
                          className="flex-1 h-10 px-3 rounded-xl border border-slate-300 text-xs"
                        />
                        <button
                          type="button"
                          disabled={!rejectMotif.trim()}
                          onClick={() =>
                            handlePieceDecision(
                              selectedDossier.candidatId,
                              slot.slotId,
                              'Non conforme',
                              rejectMotif
                            )
                          }
                          className="h-10 px-3.5 rounded-xl bg-slate-900 text-white text-xs font-medium disabled:opacity-40 cursor-pointer"
                        >
                          Valider
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {selectedDossier.statut !== 'Complet' && (
              <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    aria-label="Nouveau délai"
                    value={delaiInput}
                    onChange={(e) => setDelaiInput(e.target.value)}
                    className="h-10 px-3 rounded-xl border border-slate-300 text-xs tabular-nums"
                  />
                  <button
                    type="button"
                    disabled={!delaiInput}
                    onClick={() => handleDeclarerIncomplet(selectedDossier)}
                    className="h-10 px-4 rounded-xl border border-slate-300 text-xs font-medium text-slate-800 disabled:opacity-40 cursor-pointer"
                  >
                    Déclarer incomplet
                  </button>
                </div>

                <button
                  type="button"
                  disabled={!allSlotsConforme}
                  onClick={() => handleDeclarerComplet(selectedDossier)}
                  className="h-10 px-5 rounded-xl bg-slate-900 text-white text-xs font-medium disabled:opacity-40 cursor-pointer"
                >
                  Déclarer complet
                </button>
              </div>
            )}
          </div>
        )}
      </section>
    );
  }

  if (activeTab === 'admis') {
    const admisDossiers = dossiers.filter(
      (d) => d.statut === 'Admis' || d.statut === 'Inscrit'
    );

    return (
      <section className="space-y-6">
        <h1 className="text-xl font-semibold text-slate-900">Admis</h1>

        {publication?.valideeParCedoc && !publication.publieeParSecretariat && (
          <button
            type="button"
            onClick={handlePublierAdmis}
            className="h-11 px-5 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 cursor-pointer"
          >
            Publier la liste des admis
          </button>
        )}

        {admisDossiers.length === 0 ? (
          <p className="text-sm text-slate-600">Aucun candidat admis.</p>
        ) : (
          <div className="bg-white border border-slate-200 rounded-2xl divide-y divide-slate-100">
            {admisDossiers.map((d) => (
              <div
                key={d.candidatId}
                className="px-4 py-3.5 flex items-center justify-between gap-4"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{d.nom}</p>
                  <p className="text-xs text-slate-500 truncate">{d.sujetIntitule}</p>
                </div>

                {d.statut === 'Admis' ? (
                  <button
                    type="button"
                    onClick={() => handleInscrireCandidat(d.candidatId)}
                    className="h-9 px-3.5 rounded-xl bg-slate-900 text-white text-xs font-medium shrink-0 cursor-pointer"
                  >
                    Inscrire
                  </button>
                ) : (
                  <span className="text-xs text-slate-600 shrink-0">Inscrit</span>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    );
  }

  // Réinscriptions tab
  return (
    <section className="space-y-6">
      <h1 className="text-xl font-semibold text-slate-900">Réinscriptions</h1>

      {reinscriptions.length === 0 ? (
        <p className="text-sm text-slate-600">Aucune réinscription.</p>
      ) : !selectedReinsc ? (
        <div className="bg-white border border-slate-200 rounded-2xl divide-y divide-slate-100">
          {reinscriptions.map((r) => (
            <button
              key={r.doctorantId}
              type="button"
              onClick={() => setSelectedReinscId(r.doctorantId)}
              className="w-full min-h-[56px] px-4 py-3 flex items-center justify-between gap-4 text-left hover:bg-slate-50 cursor-pointer"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate">
                  {r.nom} · {r.annee}e année
                </p>
                <p className="text-xs text-slate-500 truncate">{r.sujetIntitule}</p>
              </div>
              <span className="text-xs text-slate-600 shrink-0">{r.statut}</span>
            </button>
          ))}
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                {selectedReinsc.nom} · {selectedReinsc.annee}e année
              </h2>
              <p className="text-xs text-slate-500">{selectedReinsc.statut}</p>
            </div>
            <button
              type="button"
              onClick={() => setSelectedReinscId(null)}
              className="min-h-[40px] px-3 rounded-xl border border-slate-300 text-xs text-slate-700 cursor-pointer"
            >
              Retour
            </button>
          </div>

          <div className="divide-y divide-slate-100 border-t border-slate-100">
            {REINSCRIPTION_SLOTS.map((slot) => {
              const p = reinscPieces[slot.slotId];
              return (
                <div key={slot.slotId} className="py-3 space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900">{slot.label}</p>
                      <p className="text-xs text-slate-500">
                        {p ? `${p.fileName} · ${p.statut}` : 'Manquante'}
                      </p>
                    </div>
                    {p && selectedReinsc.statut !== 'Validée' && (
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={async () => {
                            await updateDoc(
                              doc(
                                db,
                                'reinscriptions',
                                selectedReinsc.doctorantId,
                                'pieces',
                                slot.slotId
                              ),
                              { statut: 'Conforme', motif: '', updatedAt: serverTimestamp() }
                            );
                            setReinscPieces((prev) => ({
                              ...prev,
                              [slot.slotId]: { ...p, statut: 'Conforme', motif: '' },
                            }));
                          }}
                          className="h-9 px-3 rounded-xl border border-slate-300 text-xs text-slate-800 cursor-pointer"
                        >
                          Conforme
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setReinscRejectSlot(slot.slotId);
                            setReinscRejectMotif(p.motif || '');
                          }}
                          className="h-9 px-3 rounded-xl border border-slate-300 text-xs text-slate-800 cursor-pointer"
                        >
                          Non conforme
                        </button>
                      </div>
                    )}
                  </div>

                  {reinscRejectSlot === slot.slotId && p && (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Motif"
                        value={reinscRejectMotif}
                        onChange={(e) => setReinscRejectMotif(e.target.value)}
                        className="flex-1 h-10 px-3 rounded-xl border border-slate-300 text-xs"
                      />
                      <button
                        type="button"
                        disabled={!reinscRejectMotif.trim()}
                        onClick={async () => {
                          await updateDoc(
                            doc(
                              db,
                              'reinscriptions',
                              selectedReinsc.doctorantId,
                              'pieces',
                              slot.slotId
                            ),
                            {
                              statut: 'Non conforme',
                              motif: reinscRejectMotif.trim().slice(0, 500),
                              updatedAt: serverTimestamp(),
                            }
                          );
                          setReinscPieces((prev) => ({
                            ...prev,
                            [slot.slotId]: {
                              ...p,
                              statut: 'Non conforme',
                              motif: reinscRejectMotif.trim(),
                            },
                          }));
                          setReinscRejectSlot(null);
                        }}
                        className="h-10 px-3.5 rounded-xl bg-slate-900 text-white text-xs cursor-pointer"
                      >
                        Valider
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {selectedReinsc.statut !== 'Validée' && (
            <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={reinscDelai}
                  onChange={(e) => setReinscDelai(e.target.value)}
                  className="h-10 px-3 rounded-xl border border-slate-300 text-xs tabular-nums"
                />
                <button
                  type="button"
                  disabled={!reinscDelai}
                  onClick={async () => {
                    await updateDoc(doc(db, 'reinscriptions', selectedReinsc.doctorantId), {
                      statut: 'Incomplet',
                      nouveauDelai: reinscDelai,
                      updatedAt: serverTimestamp(),
                    });
                    setSelectedReinscId(null);
                  }}
                  className="h-10 px-4 rounded-xl border border-slate-300 text-xs text-slate-800 disabled:opacity-40 cursor-pointer"
                >
                  Déclarer incomplet
                </button>
              </div>

              <button
                type="button"
                onClick={async () => {
                  await updateDoc(doc(db, 'reinscriptions', selectedReinsc.doctorantId), {
                    statut: 'Validée',
                    nouveauDelai: '',
                    updatedAt: serverTimestamp(),
                  });
                  setSelectedReinscId(null);
                }}
                className="h-10 px-5 rounded-xl bg-slate-900 text-white text-xs font-medium cursor-pointer"
              >
                Valider
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
};

// ============================================================================
// 5.2 JURY WORKSPACE
// ============================================================================

const JuryWorkspace: React.FC<{ activeTab: string }> = ({ activeTab }) => {
  const [dossiers, setDossiers] = useState<CandidatureRecord[]>([]);
  const [convocDate, setConvocDate] = useState<Record<string, string>>({});
  const [convocLieu, setConvocLieu] = useState<Record<string, string>>({});

  useEffect(() => {
    const q = query(
      collection(db, 'candidatures'),
      where('statut', 'in', [
        'Complet',
        'Présélectionné',
        'Non présélectionné',
        'Convoqué',
        'Admis',
        'Non admis',
        'Inscrit',
      ])
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        setDossiers(
          snap.docs.map((d) => {
            const data = d.data();
            return {
              candidatId: d.id,
              nom: String(data.nom ?? ''),
              email: String(data.email ?? ''),
              sujetId: String(data.sujetId ?? ''),
              sujetIntitule: String(data.sujetIntitule ?? ''),
              sujetDescription: String(data.sujetDescription ?? ''),
              sujetDiscipline: String(data.sujetDiscipline ?? ''),
              directeur: String(data.directeur ?? ''),
              directeurEmail: String(data.directeurEmail ?? ''),
              laboratoire: String(data.laboratoire ?? ''),
              universiteOrigine: (data.universiteOrigine as '' | 'EST Fès' | 'Autre') ?? '',
              cne: String(data.cne ?? ''),
              recuperationAuto: Boolean(data.recuperationAuto),
              statut: data.statut,
              nouveauDelai: String(data.nouveauDelai ?? ''),
              convocationDate: String(data.convocationDate ?? ''),
              convocationLieu: String(data.convocationLieu ?? ''),
              recoursDepose: Boolean(data.recoursDepose),
              recoursMotif: String(data.recoursMotif ?? ''),
            };
          })
        );
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'candidatures')
    );
    return () => unsub();
  }, []);

  const updateDecision = async (
    candidatId: string,
    statut: CandidatureRecord['statut'],
    date = '',
    lieu = ''
  ) => {
    try {
      await updateDoc(doc(db, 'candidatures', candidatId), {
        statut,
        convocationDate: date.slice(0, 40),
        convocationLieu: lieu.slice(0, 160),
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `candidatures/${candidatId}`);
    }
  };

  if (activeTab === 'accueil') {
    const complets = dossiers.filter((d) => d.statut === 'Complet').length;
    const convoques = dossiers.filter((d) => d.statut === 'Convoqué').length;
    const admis = dossiers.filter((d) => d.statut === 'Admis' || d.statut === 'Inscrit').length;

    return (
      <section className="space-y-6">
        <h1 className="text-xl font-semibold text-slate-900">Accueil</h1>
        {dossiers.length === 0 ? (
          <p className="text-sm text-slate-600">Aucun dossier complet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-5">
              <p className="text-2xl font-semibold tabular-nums text-slate-900">{complets}</p>
              <p className="text-xs text-slate-500 mt-1">Complets</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-5">
              <p className="text-2xl font-semibold tabular-nums text-slate-900">{convoques}</p>
              <p className="text-xs text-slate-500 mt-1">Convoqués</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-5">
              <p className="text-2xl font-semibold tabular-nums text-slate-900">{admis}</p>
              <p className="text-xs text-slate-500 mt-1">Admis</p>
            </div>
          </div>
        )}
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <h1 className="text-xl font-semibold text-slate-900">Résultats</h1>

      {dossiers.length === 0 ? (
        <p className="text-sm text-slate-600">Aucun dossier.</p>
      ) : (
        <div className="space-y-3">
          {dossiers.map((d) => (
            <div
              key={d.candidatId}
              className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{d.nom}</p>
                  <p className="text-xs text-slate-500">{d.sujetIntitule}</p>
                </div>
                <span className="text-xs text-slate-600 shrink-0">{d.statut}</span>
              </div>

              {d.statut === 'Complet' && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => updateDecision(d.candidatId, 'Présélectionné')}
                    className="h-9 px-3.5 rounded-xl bg-slate-900 text-white text-xs font-medium cursor-pointer"
                  >
                    Présélectionner
                  </button>
                  <button
                    type="button"
                    onClick={() => updateDecision(d.candidatId, 'Non présélectionné')}
                    className="h-9 px-3.5 rounded-xl border border-slate-300 text-xs text-slate-700 cursor-pointer"
                  >
                    Non présélectionné
                  </button>
                </div>
              )}

              {d.statut === 'Présélectionné' && (
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="datetime-local"
                    aria-label="Date de convocation"
                    value={convocDate[d.candidatId] ?? ''}
                    onChange={(e) =>
                      setConvocDate((prev) => ({ ...prev, [d.candidatId]: e.target.value }))
                    }
                    className="h-10 px-3 rounded-xl border border-slate-300 text-xs tabular-nums"
                  />
                  <input
                    type="text"
                    placeholder="Salle / Lieu"
                    maxLength={160}
                    value={convocLieu[d.candidatId] ?? ''}
                    onChange={(e) =>
                      setConvocLieu((prev) => ({ ...prev, [d.candidatId]: e.target.value }))
                    }
                    className="h-10 px-3 rounded-xl border border-slate-300 text-xs"
                  />
                  <button
                    type="button"
                    disabled={
                      !(convocDate[d.candidatId] ?? '').trim() ||
                      !(convocLieu[d.candidatId] ?? '').trim()
                    }
                    onClick={() =>
                      updateDecision(
                        d.candidatId,
                        'Convoqué',
                        convocDate[d.candidatId],
                        convocLieu[d.candidatId]
                      )
                    }
                    className="h-10 px-4 rounded-xl bg-slate-900 text-white text-xs font-medium disabled:opacity-40 cursor-pointer"
                  >
                    Convoquer
                  </button>
                </div>
              )}

              {d.statut === 'Convoqué' && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      updateDecision(
                        d.candidatId,
                        'Admis',
                        d.convocationDate,
                        d.convocationLieu
                      )
                    }
                    className="h-9 px-4 rounded-xl bg-slate-900 text-white text-xs font-medium cursor-pointer"
                  >
                    Admis
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      updateDecision(
                        d.candidatId,
                        'Non admis',
                        d.convocationDate,
                        d.convocationLieu
                      )
                    }
                    className="h-9 px-4 rounded-xl border border-slate-300 text-xs text-slate-700 cursor-pointer"
                  >
                    Non admis
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

// ============================================================================
// 5.3 DIRECTEUR DE THÈSE WORKSPACE
// ============================================================================

const DirecteurTheseWorkspace: React.FC<{ activeTab: string; personnel: PersonnelRecord }> = ({
  activeTab,
  personnel,
}) => {
  const [mySujets, setMySujets] = useState<SujetRecord[]>([]);
  const [myCandidats, setMyCandidats] = useState<CandidatureRecord[]>([]);
  const [intitule, setIntitule] = useState('');
  const [discipline, setDiscipline] = useState('');
  const [discFocus, setDiscFocus] = useState(false);
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const qSujets = query(
      collection(db, 'sujets'),
      where('directeurEmail', '==', personnel.email)
    );
    const unsub1 = onSnapshot(
      qSujets,
      (snap) => {
        setMySujets(
          snap.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              intitule: String(data.intitule ?? ''),
              description: String(data.description ?? ''),
              discipline: String(data.discipline ?? ''),
              directeur: String(data.directeur ?? ''),
              directeurEmail: String(data.directeurEmail ?? ''),
              laboratoire: String(data.laboratoire ?? ''),
              statut: data.statut,
            };
          })
        );
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'sujets')
    );

    const qCands = query(
      collection(db, 'candidatures'),
      where('directeurEmail', '==', personnel.email)
    );
    const unsub2 = onSnapshot(
      qCands,
      (snap) => {
        setMyCandidats(
          snap.docs.map((d) => {
            const data = d.data();
            return {
              candidatId: d.id,
              nom: String(data.nom ?? ''),
              email: String(data.email ?? ''),
              sujetId: String(data.sujetId ?? ''),
              sujetIntitule: String(data.sujetIntitule ?? ''),
              sujetDescription: String(data.sujetDescription ?? ''),
              sujetDiscipline: String(data.sujetDiscipline ?? ''),
              directeur: String(data.directeur ?? ''),
              directeurEmail: String(data.directeurEmail ?? ''),
              laboratoire: String(data.laboratoire ?? ''),
              universiteOrigine: (data.universiteOrigine as '' | 'EST Fès' | 'Autre') ?? '',
              cne: String(data.cne ?? ''),
              recuperationAuto: Boolean(data.recuperationAuto),
              statut: data.statut,
              nouveauDelai: String(data.nouveauDelai ?? ''),
              convocationDate: String(data.convocationDate ?? ''),
              convocationLieu: String(data.convocationLieu ?? ''),
              recoursDepose: Boolean(data.recoursDepose),
              recoursMotif: String(data.recoursMotif ?? ''),
            };
          })
        );
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'candidatures')
    );

    return () => {
      unsub1();
      unsub2();
    };
  }, [personnel.email]);

  const disciplineSuggestions = useMemo(() => {
    const q = discipline.trim().toLowerCase();
    const pool = Array.from(
      new Set([...SPECIALITES_INITIALES, ...mySujets.map((s) => s.discipline)])
    );
    if (!q) return pool;
    return pool.filter((d) => d.toLowerCase().includes(q));
  }, [discipline, mySujets]);

  const handleProposeSujet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!personnel.laboratoire) return;
    setSaving(true);
    const newId = `sujet_${Date.now()}`;
    const directeurDisplay =
      personnel.nom.trim().length >= 2 ? personnel.nom.trim() : personnel.email.split('@')[0];
    try {
      await setDoc(doc(db, 'sujets', newId), {
        intitule: intitule.trim().slice(0, 240),
        description: description.trim().slice(0, 1200),
        discipline: discipline.trim().slice(0, 120),
        directeur: directeurDisplay.slice(0, 120),
        directeurEmail: personnel.email,
        laboratoire: personnel.laboratoire,
        statut: 'En attente',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setIntitule('');
      setDiscipline('');
      setDescription('');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `sujets/${newId}`);
    } finally {
      setSaving(false);
    }
  };

  if (activeTab === 'accueil') {
    const publies = mySujets.filter((s) => s.statut === 'Publié').length;
    return (
      <section className="space-y-6">
        <h1 className="text-xl font-semibold text-slate-900">Accueil</h1>
        <div className="grid grid-cols-2 gap-4 max-w-md">
          <div className="bg-white border border-slate-200 rounded-2xl p-5">
            <p className="text-2xl font-semibold tabular-nums text-slate-900">{publies}</p>
            <p className="text-xs text-slate-500 mt-1">Sujets publiés</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-5">
            <p className="text-2xl font-semibold tabular-nums text-slate-900">
              {myCandidats.length}
            </p>
            <p className="text-xs text-slate-500 mt-1">Candidatures</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-6 max-w-2xl">
      <h1 className="text-xl font-semibold text-slate-900">Mes sujets</h1>

      <form
        onSubmit={handleProposeSujet}
        className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3"
      >
        <input
          type="text"
          required
          minLength={5}
          maxLength={240}
          placeholder="Intitulé du sujet"
          value={intitule}
          onChange={(e) => setIntitule(e.target.value)}
          className="w-full h-11 px-3.5 rounded-xl border border-slate-300 text-sm"
        />

        <div className="relative">
          <input
            type="text"
            required
            minLength={2}
            maxLength={120}
            placeholder="Discipline"
            value={discipline}
            onFocus={() => setDiscFocus(true)}
            onBlur={() => setTimeout(() => setDiscFocus(false), 150)}
            onChange={(e) => setDiscipline(e.target.value)}
            className="w-full h-11 px-3.5 rounded-xl border border-slate-300 text-sm"
          />
          {discFocus && disciplineSuggestions.length > 0 && (
            <ul className="absolute left-0 right-0 mt-1 max-h-44 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-sm divide-y divide-slate-100 z-20">
              {disciplineSuggestions.map((d) => (
                <li key={d}>
                  <button
                    type="button"
                    onMouseDown={() => {
                      setDiscipline(d);
                      setDiscFocus(false);
                    }}
                    className="w-full min-h-[40px] px-3.5 text-left text-xs text-slate-800 hover:bg-slate-50 cursor-pointer"
                  >
                    {d}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <textarea
          rows={3}
          required
          minLength={10}
          maxLength={1200}
          placeholder="Description courte"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full p-3.5 rounded-xl border border-slate-300 text-sm"
        />

        <button
          type="submit"
          disabled={saving || !personnel.laboratoire}
          className="h-11 px-5 rounded-xl bg-slate-900 text-white text-sm font-medium disabled:opacity-50 cursor-pointer"
        >
          Proposer le sujet
        </button>
      </form>

      {mySujets.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl divide-y divide-slate-100">
          {mySujets.map((s) => (
            <div key={s.id} className="px-4 py-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate">{s.intitule}</p>
                <p className="text-xs text-slate-500">{s.discipline}</p>
              </div>
              <span className="text-xs text-slate-600 shrink-0">{s.statut}</span>
            </div>
          ))}
        </div>
      )}

      {myCandidats.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl divide-y divide-slate-100">
          {myCandidats.map((c) => (
            <div key={c.candidatId} className="px-4 py-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate">{c.nom}</p>
                <p className="text-xs text-slate-500 truncate">{c.sujetIntitule}</p>
              </div>
              <span className="text-xs text-slate-600 shrink-0">{c.statut}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

// ============================================================================
// 5.4 DIRECTEUR DU LABORATOIRE WORKSPACE
// ============================================================================

const DirecteurLaboWorkspace: React.FC<{ activeTab: string; personnel: PersonnelRecord }> = ({
  activeTab,
  personnel,
}) => {
  const [labSujets, setLabSujets] = useState<SujetRecord[]>([]);

  useEffect(() => {
    if (!personnel.laboratoire) return;
    const q = query(
      collection(db, 'sujets'),
      where('laboratoire', '==', personnel.laboratoire),
      where('statut', 'in', ['En attente', 'Publié', 'Refusé'])
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        setLabSujets(
          snap.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              intitule: String(data.intitule ?? ''),
              description: String(data.description ?? ''),
              discipline: String(data.discipline ?? ''),
              directeur: String(data.directeur ?? ''),
              directeurEmail: String(data.directeurEmail ?? ''),
              laboratoire: String(data.laboratoire ?? ''),
              statut: data.statut,
            };
          })
        );
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'sujets')
    );
    return () => unsub();
  }, [personnel.laboratoire]);

  const handleValidate = async (sujetId: string, statut: 'Publié' | 'Refusé') => {
    try {
      await updateDoc(doc(db, 'sujets', sujetId), {
        statut,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `sujets/${sujetId}`);
    }
  };

  if (activeTab === 'accueil') {
    const attente = labSujets.filter((s) => s.statut === 'En attente').length;
    const publies = labSujets.filter((s) => s.statut === 'Publié').length;
    return (
      <section className="space-y-6">
        <h1 className="text-xl font-semibold text-slate-900">Accueil</h1>
        <div className="grid grid-cols-2 gap-4 max-w-md">
          <div className="bg-white border border-slate-200 rounded-2xl p-5">
            <p className="text-2xl font-semibold tabular-nums text-slate-900">{attente}</p>
            <p className="text-xs text-slate-500 mt-1">En attente</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-5">
            <p className="text-2xl font-semibold tabular-nums text-slate-900">{publies}</p>
            <p className="text-xs text-slate-500 mt-1">Publiés</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <h1 className="text-xl font-semibold text-slate-900">Sujets</h1>
      {labSujets.length === 0 ? (
        <p className="text-sm text-slate-600">Aucun sujet.</p>
      ) : (
        <div className="space-y-3">
          {labSujets.map((s) => (
            <div key={s.id} className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{s.intitule}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {s.discipline} · {s.directeur}
                  </p>
                </div>
                <span className="text-xs text-slate-600 shrink-0">{s.statut}</span>
              </div>
              {s.statut === 'En attente' && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleValidate(s.id, 'Publié')}
                    className="h-9 px-4 rounded-xl bg-slate-900 text-white text-xs font-medium cursor-pointer"
                  >
                    Valider
                  </button>
                  <button
                    type="button"
                    onClick={() => handleValidate(s.id, 'Refusé')}
                    className="h-9 px-4 rounded-xl border border-slate-300 text-xs text-slate-700 cursor-pointer"
                  >
                    Refuser
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

// ============================================================================
// 5.5 DIRECTEUR DU CEDOC WORKSPACE
// ============================================================================

const DirecteurCedocWorkspace: React.FC<{ activeTab: string; currentEmail: string }> = ({
  activeTab,
  currentEmail,
}) => {
  const [sujetsCount, setSujetsCount] = useState(0);
  const [dossiers, setDossiers] = useState<CandidatureRecord[]>([]);
  const [staffList, setStaffList] = useState<PersonnelRecord[]>([]);
  const [publication, setPublication] = useState<PublicationAdmisRecord | null>(null);

  // Add personnel form
  const [staffEmail, setStaffEmail] = useState('');
  const [staffNom, setStaffNom] = useState('');
  const [staffRoles, setStaffRoles] = useState<PersonnelRole[]>([]);
  const [staffLabo, setStaffLabo] = useState('');
  const [staffMsg, setStaffMsg] = useState<string | null>(null);
  const [staffBusy, setStaffBusy] = useState(false);

  useEffect(() => {
    const unsub1 = onSnapshot(
      query(collection(db, 'sujets'), where('statut', 'in', ['En attente', 'Publié', 'Refusé'])),
      (snap) => {
        setSujetsCount(snap.docs.filter((d) => d.data().statut === 'Publié').length);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'sujets')
    );

    const unsub2 = onSnapshot(
      query(collection(db, 'candidatures'), where('statut', 'in', ALL_DOSSIER_STATUTS)),
      (snap) => {
        setDossiers(
          snap.docs.map((d) => {
            const data = d.data();
            return {
              candidatId: d.id,
              nom: String(data.nom ?? ''),
              email: String(data.email ?? ''),
              sujetId: String(data.sujetId ?? ''),
              sujetIntitule: String(data.sujetIntitule ?? ''),
              sujetDescription: String(data.sujetDescription ?? ''),
              sujetDiscipline: String(data.sujetDiscipline ?? ''),
              directeur: String(data.directeur ?? ''),
              directeurEmail: String(data.directeurEmail ?? ''),
              laboratoire: String(data.laboratoire ?? ''),
              universiteOrigine: (data.universiteOrigine as '' | 'EST Fès' | 'Autre') ?? '',
              cne: String(data.cne ?? ''),
              recuperationAuto: Boolean(data.recuperationAuto),
              statut: data.statut,
              nouveauDelai: String(data.nouveauDelai ?? ''),
              convocationDate: String(data.convocationDate ?? ''),
              convocationLieu: String(data.convocationLieu ?? ''),
              recoursDepose: Boolean(data.recoursDepose),
              recoursMotif: String(data.recoursMotif ?? ''),
            };
          })
        );
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'candidatures')
    );

    const unsub3 = onSnapshot(
      collection(db, 'personnel'),
      (snap) => {
        setStaffList(
          snap.docs.map((d) => {
            const data = d.data();
            return {
              email: d.id,
              nom: String(data.nom ?? ''),
              roles: Array.isArray(data.roles) ? (data.roles as PersonnelRole[]) : [],
              laboratoire: String(data.laboratoire ?? ''),
            };
          })
        );
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'personnel')
    );

    const unsub4 = onSnapshot(
      doc(db, 'publication_admis', 'officielle'),
      (snap) => {
        if (!snap.exists()) {
          setPublication(null);
        } else {
          const d = snap.data();
          setPublication({
            valideeParCedoc: Boolean(d.valideeParCedoc),
            publieeParSecretariat: Boolean(d.publieeParSecretariat),
            admis: Array.isArray(d.admis) ? d.admis.map(String) : [],
          });
        }
      },
      (err) => handleFirestoreError(err, OperationType.GET, 'publication_admis/officielle')
    );

    return () => {
      unsub1();
      unsub2();
      unsub3();
      unsub4();
    };
  }, []);

  const admisList = useMemo(
    () => dossiers.filter((d) => d.statut === 'Admis' || d.statut === 'Inscrit'),
    [dossiers]
  );

  const handleValiderListeAdmis = async () => {
    const lines = admisList.map((d) => `${d.nom} · ${d.sujetIntitule}`.slice(0, 300));
    const pubRef = doc(db, 'publication_admis', 'officielle');
    try {
      const snap = await getDoc(pubRef);
      if (!snap.exists()) {
        await setDoc(pubRef, {
          valideeParCedoc: true,
          publieeParSecretariat: false,
          admis: lines,
          updatedAt: serverTimestamp(),
        });
      } else {
        await updateDoc(pubRef, {
          valideeParCedoc: true,
          publieeParSecretariat: Boolean(snap.data().publieeParSecretariat),
          admis: lines,
          updatedAt: serverTimestamp(),
        });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'publication_admis/officielle');
    }
  };

  const needsLabo =
    staffRoles.includes('Directeur de thèse') ||
    staffRoles.includes('Directeur du laboratoire');

  const toggleRole = (r: PersonnelRole) => {
    setStaffRoles((prev) => (prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]));
  };

  const handleSaveStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailLower = staffEmail.trim().toLowerCase();
    if (!emailLower || staffRoles.length === 0) {
      setStaffMsg('Sélectionnez au moins un rôle.');
      return;
    }
    if (needsLabo && !staffLabo) {
      setStaffMsg('Sélectionnez un laboratoire.');
      return;
    }
    setStaffBusy(true);
    setStaffMsg(null);
    try {
      const pRef = doc(db, 'personnel', emailLower);
      const existing = await getDoc(pRef);
      const payload = {
        nom: staffNom.trim().slice(0, 120),
        roles: staffRoles.slice(0, 5),
        laboratoire: needsLabo ? staffLabo : '',
        updatedAt: serverTimestamp(),
      };
      if (!existing.exists()) {
        await setDoc(pRef, { email: emailLower, ...payload });
      } else {
        await updateDoc(pRef, payload);
      }

      if (emailLower !== currentEmail) {
        await provisionPersonnelAuthAccount(emailLower).catch(() => {});
      }

      setStaffEmail('');
      setStaffNom('');
      setStaffRoles([]);
      setStaffLabo('');
      setStaffMsg('Compte enregistré et invitation envoyée.');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `personnel/${emailLower}`);
    } finally {
      setStaffBusy(false);
    }
  };

  const handleDeleteStaff = async (emailLower: string) => {
    if (emailLower === currentEmail) return;
    try {
      await deleteDoc(doc(db, 'personnel', emailLower));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `personnel/${emailLower}`);
    }
  };

  if (activeTab === 'accueil') {
    return (
      <section className="space-y-6">
        <h1 className="text-xl font-semibold text-slate-900">Accueil</h1>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5">
            <p className="text-2xl font-semibold tabular-nums text-slate-900">{sujetsCount}</p>
            <p className="text-xs text-slate-500 mt-1">Sujets publiés</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-5">
            <p className="text-2xl font-semibold tabular-nums text-slate-900">
              {admisList.length}
            </p>
            <p className="text-xs text-slate-500 mt-1">Admis</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-5">
            <p className="text-2xl font-semibold tabular-nums text-slate-900">
              {staffList.length}
            </p>
            <p className="text-xs text-slate-500 mt-1">Personnel</p>
          </div>
        </div>
      </section>
    );
  }

  if (activeTab === 'admis') {
    return (
      <section className="space-y-6">
        <h1 className="text-xl font-semibold text-slate-900">Admis</h1>

        {admisList.length === 0 ? (
          <p className="text-sm text-slate-600">Aucun candidat admis.</p>
        ) : (
          <>
            <div className="bg-white border border-slate-200 rounded-2xl divide-y divide-slate-100">
              {admisList.map((d) => (
                <div
                  key={d.candidatId}
                  className="px-4 py-3.5 flex items-center justify-between gap-4"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{d.nom}</p>
                    <p className="text-xs text-slate-500 truncate">{d.sujetIntitule}</p>
                  </div>
                  <span className="text-xs text-slate-600 shrink-0">{d.statut}</span>
                </div>
              ))}
            </div>

            {!publication?.valideeParCedoc ? (
              <button
                type="button"
                onClick={handleValiderListeAdmis}
                className="h-11 px-5 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 cursor-pointer"
              >
                Valider la liste des admis
              </button>
            ) : (
              <p className="text-xs text-slate-600">Liste validée</p>
            )}
          </>
        )}
      </section>
    );
  }

  // Personnel management tab
  return (
    <section className="space-y-6 max-w-2xl">
      <h1 className="text-xl font-semibold text-slate-900">Personnel</h1>

      <form
        onSubmit={handleSaveStaff}
        className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4"
      >
        <input
          type="email"
          required
          maxLength={160}
          placeholder="Email"
          value={staffEmail}
          onChange={(e) => setStaffEmail(e.target.value)}
          className="w-full h-11 px-3.5 rounded-xl border border-slate-300 text-sm"
        />

        <input
          type="text"
          maxLength={120}
          placeholder="Nom complet (ex. Pr. ...)"
          value={staffNom}
          onChange={(e) => setStaffNom(e.target.value)}
          className="w-full h-11 px-3.5 rounded-xl border border-slate-300 text-sm"
        />

        <div className="flex flex-wrap gap-2">
          {ALL_PERSONNEL_ROLES.map((r) => {
            const checked = staffRoles.includes(r);
            return (
              <button
                key={r}
                type="button"
                onClick={() => toggleRole(r)}
                className={`h-10 px-3.5 rounded-xl border text-xs font-medium cursor-pointer ${
                  checked
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-700 border-slate-300'
                }`}
              >
                {r}
              </button>
            );
          })}
        </div>

        {needsLabo && (
          <select
            aria-label="Laboratoire"
            required
            value={staffLabo}
            onChange={(e) => setStaffLabo(e.target.value)}
            className="w-full h-11 px-3 rounded-xl border border-slate-300 bg-white text-sm"
          >
            <option value="">Laboratoire</option>
            {INITIAL_LABORATOIRES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.code} — {l.nom}
              </option>
            ))}
          </select>
        )}

        {staffMsg && <p className="text-xs text-slate-700">{staffMsg}</p>}

        <button
          type="submit"
          disabled={staffBusy}
          className="h-11 px-5 rounded-xl bg-slate-900 text-white text-sm font-medium disabled:opacity-50 cursor-pointer"
        >
          Ajouter
        </button>
      </form>

      <div className="bg-white border border-slate-200 rounded-2xl divide-y divide-slate-100">
        {staffList.map((p) => (
          <div
            key={p.email}
            className="px-4 py-3.5 flex items-center justify-between gap-4"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">
                {p.nom ? `${p.nom} · ${p.email}` : p.email}
              </p>
              <p className="text-xs text-slate-500 truncate">
                {p.roles.join(' · ')}
                {p.laboratoire ? ` · ${p.laboratoire}` : ''}
              </p>
            </div>

            {p.email !== currentEmail && (
              <button
                type="button"
                onClick={() => handleDeleteStaff(p.email)}
                className="min-h-[36px] px-3 rounded-lg border border-slate-300 text-xs text-slate-700 hover:border-slate-900 shrink-0 cursor-pointer"
              >
                Supprimer
              </button>
            )}
          </div>
        ))}
      </div>
    </section>
  );
};
