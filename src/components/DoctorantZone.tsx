import React, { useEffect, useState } from 'react';
import {
  collection,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { User as UserIcon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { db, handleFirestoreError, OperationType } from '../firebase';
import {
  PieceDossierRecord,
  PieceSlotReinscription,
  REINSCRIPTION_SLOTS,
  ReinscriptionRecord,
} from '../types/cedoc';
import { uploadDossierFile, validateCandidateFile } from '../utils/storageHelper';

type DoctorantTab = 'accueil' | 'reinscription';

export const DoctorantZone: React.FC = () => {
  const { user, candidature, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<DoctorantTab>('accueil');
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const [reinscription, setReinscription] = useState<ReinscriptionRecord | null>(null);
  const [annee, setAnnee] = useState<number>(2);
  const [piecesMap, setPiecesMap] = useState<Record<string, PieceDossierRecord>>({});
  const [uploadingSlot, setUploadingSlot] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user) return;
    const refDoc = doc(db, 'reinscriptions', user.uid);
    const unsub = onSnapshot(
      refDoc,
      (snap) => {
        if (!snap.exists()) {
          setReinscription(null);
        } else {
          const d = snap.data();
          setReinscription({
            doctorantId: String(d.doctorantId ?? user.uid),
            nom: String(d.nom ?? ''),
            email: String(d.email ?? ''),
            annee: Number(d.annee ?? 2),
            sujetIntitule: String(d.sujetIntitule ?? ''),
            directeur: String(d.directeur ?? ''),
            laboratoire: String(d.laboratoire ?? ''),
            statut: d.statut,
            nouveauDelai: String(d.nouveauDelai ?? ''),
          });
          setAnnee(Number(d.annee ?? 2));
        }
      },
      (err) => {
        handleFirestoreError(err, OperationType.GET, `reinscriptions/${user.uid}`);
      }
    );
    return () => unsub();
  }, [user?.uid]);

  useEffect(() => {
    if (!user) return;
    const qPieces = query(
      collection(db, 'reinscriptions', user.uid, 'pieces'),
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
            sourceAuto: false,
            statut: data.statut,
            motif: String(data.motif ?? ''),
          };
        });
        setPiecesMap(next);
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, `reinscriptions/${user.uid}/pieces`);
      }
    );
    return () => unsub();
  }, [user?.uid]);

  const ensureReinscriptionCreated = async (): Promise<void> => {
    if (!user || reinscription || !candidature) return;
    await setDoc(doc(db, 'reinscriptions', user.uid), {
      doctorantId: user.uid,
      nom: candidature.nom.slice(0, 120),
      email: candidature.email.slice(0, 160),
      annee,
      sujetIntitule: candidature.sujetIntitule.slice(0, 240),
      directeur: candidature.directeur.slice(0, 120),
      laboratoire: candidature.laboratoire.slice(0, 80),
      statut: 'En dépôt',
      nouveauDelai: '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  };

  const handleUploadPiece = async (
    slotId: PieceSlotReinscription,
    label: string,
    file: File | undefined
  ) => {
    if (!file || !user) return;
    const vErr = validateCandidateFile(file);
    if (vErr) {
      setErrorMsg(vErr);
      return;
    }
    setErrorMsg(null);
    setUploadingSlot(slotId);
    try {
      await ensureReinscriptionCreated();
      const uploaded = await uploadDossierFile('reinscriptions', user.uid, slotId, file);
      const pRef = doc(db, 'reinscriptions', user.uid, 'pieces', slotId);
      if (!piecesMap[slotId]) {
        await setDoc(pRef, {
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
        await updateDoc(pRef, {
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
      handleFirestoreError(err, OperationType.WRITE, `reinscriptions/${user.uid}/pieces/${slotId}`);
    } finally {
      setUploadingSlot(null);
    }
  };

  const allSlotsUploaded = REINSCRIPTION_SLOTS.every((s) => {
    const p = piecesMap[s.slotId];
    return Boolean(p && p.statut !== 'Manquante');
  });

  const canModify =
    !reinscription ||
    reinscription.statut === 'En dépôt' ||
    reinscription.statut === 'Envoyée' ||
    reinscription.statut === 'Incomplet';

  const handleSubmitReinscription = async () => {
    if (!user || !reinscription) return;
    setSubmitting(true);
    try {
      await updateDoc(doc(db, 'reinscriptions', user.uid), {
        annee,
        statut: 'Envoyée',
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `reinscriptions/${user.uid}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20">
      <header className="sticky top-0 z-30 h-14 bg-white/95 backdrop-blur border-b border-slate-200 px-4">
        <div className="max-w-5xl mx-auto h-full flex items-center justify-between gap-4">
          <span className="text-base font-semibold tracking-tight text-slate-900 whitespace-nowrap">
            GCD Platform
          </span>

          <div className="relative">
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

      <main className="max-w-xl mx-auto px-4 pt-6">
        {activeTab === 'accueil' ? (
          <section className="space-y-6">
            <h1 className="text-xl font-semibold tracking-tight text-slate-900">Accueil</h1>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white border border-slate-200 rounded-2xl p-5">
                <p className="text-2xl font-semibold tabular-nums text-slate-900">
                  {reinscription ? `${reinscription.annee}e` : '2e'}
                </p>
                <p className="text-xs text-slate-500 mt-1">Année</p>
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl p-5">
                <p className="text-base font-semibold text-slate-900">
                  {reinscription ? reinscription.statut : 'Non déposée'}
                </p>
                <p className="text-xs text-slate-500 mt-1">Réinscription</p>
              </div>
            </div>
          </section>
        ) : (
          <section className="space-y-6">
            <h1 className="text-xl font-semibold tracking-tight text-slate-900">
              Ma réinscription
            </h1>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
              {reinscription && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">Statut</span>
                  <span className="font-semibold text-slate-900">{reinscription.statut}</span>
                </div>
              )}

              {reinscription?.nouveauDelai && reinscription.statut === 'Incomplet' && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">Délai</span>
                  <span className="tabular-nums text-slate-900">
                    {reinscription.nouveauDelai}
                  </span>
                </div>
              )}

              <div>
                <select
                  aria-label="Année de thèse"
                  disabled={!canModify}
                  value={annee}
                  onChange={(e) => setAnnee(Number(e.target.value))}
                  className="w-full h-11 px-3 rounded-xl border border-slate-300 bg-white text-sm text-slate-900"
                >
                  {[2, 3, 4, 5, 6].map((yr) => (
                    <option key={yr} value={yr}>
                      {yr}e année
                    </option>
                  ))}
                </select>
              </div>

              <div className="divide-y divide-slate-100">
                {REINSCRIPTION_SLOTS.map((slot) => {
                  const existing = piecesMap[slot.slotId];
                  const isBusy = uploadingSlot === slot.slotId;
                  return (
                    <div key={slot.slotId} className="py-3 space-y-1">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-900">{slot.label}</p>
                          {existing && (
                            <p className="text-xs text-slate-500 truncate">
                              {existing.fileName} · {existing.statut}
                            </p>
                          )}
                        </div>

                        {canModify && (
                          <label className="min-h-[40px] px-3.5 rounded-xl border border-slate-300 text-xs font-medium text-slate-800 hover:border-slate-900 flex items-center justify-center shrink-0 whitespace-nowrap cursor-pointer">
                            {isBusy ? '...' : existing ? 'Remplacer' : 'Choisir un fichier'}
                            <input
                              type="file"
                              accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                              className="hidden"
                              disabled={isBusy}
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                e.target.value = '';
                                handleUploadPiece(slot.slotId, slot.label, f);
                              }}
                            />
                          </label>
                        )}
                      </div>
                      {existing?.statut === 'Non conforme' && existing.motif && (
                        <p className="text-xs text-red-600">{existing.motif}</p>
                      )}
                    </div>
                  );
                })}
              </div>

              {errorMsg && <p className="text-xs text-red-600">{errorMsg}</p>}

              {allSlotsUploaded &&
                (!reinscription ||
                  reinscription.statut === 'En dépôt' ||
                  reinscription.statut === 'Incomplet') && (
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={handleSubmitReinscription}
                    className="w-full h-11 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 disabled:opacity-50 cursor-pointer"
                  >
                    Envoyer ma réinscription
                  </button>
                )}
            </div>
          </section>
        )}
      </main>

      <nav
        aria-label="Navigation doctorant"
        className="fixed bottom-0 left-0 right-0 z-30 h-14 bg-white/95 backdrop-blur border-t border-slate-200"
      >
        <div className="max-w-5xl mx-auto h-full grid grid-cols-2 items-center">
          <button
            type="button"
            onClick={() => setActiveTab('accueil')}
            className={`h-full text-xs font-medium whitespace-nowrap cursor-pointer ${
              activeTab === 'accueil'
                ? 'text-slate-950 font-semibold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Accueil
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('reinscription')}
            className={`h-full text-xs font-medium whitespace-nowrap cursor-pointer ${
              activeTab === 'reinscription'
                ? 'text-slate-950 font-semibold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Ma réinscription
          </button>
        </div>
      </nav>
    </div>
  );
};
