import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import {
  CandidatureReceptor,
  CandidatureSlot,
  CANDIDATURE_SLOT_LABELS,
  ReinscriptionRecord,
  ReinscriptionSlot,
  REINSCRIPTION_SLOT_LABELS,
} from "../types/cedoc";

export const ScolariteScreen: React.FC = () => {
  const { apiFetch } = useAuth();
  const [candidatures, setCandidatures] = useState<CandidatureReceptor[]>([]);
  const [reinscriptions, setReinscriptions] = useState<ReinscriptionRecord[]>(
    []
  );
  const [cedocGlobalValidated, setCedocGlobalValidated] = useState(false);
  const [officialListPublished, setOfficialListPublished] = useState(false);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [rejectMotifs, setRejectMotifs] = useState<Record<string, string>>({});
  const [newDeadlines, setNewDeadlines] = useState<Record<string, string>>({});
  const [reinscRejectMotifs, setReinscRejectMotifs] = useState<
    Record<string, string>
  >({});
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const data = await apiFetch<{
        candidatures: CandidatureReceptor[];
        reinscriptions: ReinscriptionRecord[];
        cedocGlobalValidated: boolean;
        officialListPublished: boolean;
      }>("/api/scolarite/data");
      setCandidatures(data.candidatures || []);
      setReinscriptions(data.reinscriptions || []);
      setCedocGlobalValidated(Boolean(data.cedocGlobalValidated));
      setOfficialListPublished(Boolean(data.officialListPublished));
      if (!expandedId && data.candidatures?.length) {
        const toProcess =
          data.candidatures.find((c) => c.status === "En dépôt") ||
          data.candidatures[0];
        setExpandedId(toProcess.id);
      }
    } catch (err: any) {
      setError(err?.message || "Erreur de chargement.");
    }
  }, [apiFetch, expandedId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handlePieceDecision = async (
    candidatureId: string,
    slot: CandidatureSlot,
    decision: "Conforme" | "Non conforme"
  ) => {
    const key = `${candidatureId}_${slot}`;
    const motif = (rejectMotifs[key] || "").trim();
    if (decision === "Non conforme" && !motif) {
      setError("Saisissez le motif avant de rejeter la pièce.");
      return;
    }
    setError(null);
    setBusyKey(key);
    try {
      const res = await apiFetch<{ candidature: CandidatureReceptor }>(
        "/api/scolarite/piece-decision",
        {
          method: "POST",
          body: JSON.stringify({ candidatureId, slot, decision, motif }),
        }
      );
      setCandidatures((prev) =>
        prev.map((c) => (c.id === candidatureId ? res.candidature : c))
      );
    } catch (err: any) {
      setError(err?.message || "Erreur.");
    } finally {
      setBusyKey(null);
    }
  };

  const handleRecheckAi = async (
    candidatureId: string,
    slot: CandidatureSlot
  ) => {
    const key = `ai_${candidatureId}_${slot}`;
    setError(null);
    setBusyKey(key);
    try {
      const res = await apiFetch<{ candidature: CandidatureReceptor }>(
        "/api/scolarite/recheck-ai",
        {
          method: "POST",
          body: JSON.stringify({ candidatureId, slot }),
        }
      );
      setCandidatures((prev) =>
        prev.map((c) => (c.id === candidatureId ? res.candidature : c))
      );
    } catch (err: any) {
      setError(err?.message || "Erreur IA.");
    } finally {
      setBusyKey(null);
    }
  };

  const handleDossierCompleteness = async (
    candidatureId: string,
    action: "Complet" | "Incomplet"
  ) => {
    const nouveauDelai = newDeadlines[candidatureId] || "2026-11-25";
    setError(null);
    setBusyKey(`comp_${candidatureId}`);
    try {
      const res = await apiFetch<{ candidature: CandidatureReceptor }>(
        "/api/scolarite/dossier-completeness",
        {
          method: "POST",
          body: JSON.stringify({
            candidatureId,
            action,
            nouveauDelai: action === "Incomplet" ? nouveauDelai : "",
          }),
        }
      );
      setCandidatures((prev) =>
        prev.map((c) => (c.id === candidatureId ? res.candidature : c))
      );
    } catch (err: any) {
      setError(err?.message || "Action impossible.");
    } finally {
      setBusyKey(null);
    }
  };

  const handlePublierAdmis = async () => {
    setError(null);
    setBusyKey("publier");
    try {
      const res = await apiFetch<{
        officialListPublished: boolean;
        candidatures: CandidatureReceptor[];
      }>("/api/scolarite/publier-admis", {
        method: "POST",
      });
      setOfficialListPublished(res.officialListPublished);
      setCandidatures(res.candidatures);
    } catch (err: any) {
      setError(err?.message || "Publication impossible.");
    } finally {
      setBusyKey(null);
    }
  };

  const handleInscrire = async (candidatureId: string) => {
    setError(null);
    setBusyKey(`insc_${candidatureId}`);
    try {
      const res = await apiFetch<{ candidature: CandidatureReceptor }>(
        "/api/scolarite/inscrire",
        {
          method: "POST",
          body: JSON.stringify({ candidatureId }),
        }
      );
      setCandidatures((prev) =>
        prev.map((c) => (c.id === candidatureId ? res.candidature : c))
      );
    } catch (err: any) {
      setError(err?.message || "Inscription impossible.");
    } finally {
      setBusyKey(null);
    }
  };

  const handleReinscPiece = async (
    reinscriptionId: string,
    slot: ReinscriptionSlot,
    decision: "Conforme" | "Non conforme"
  ) => {
    const key = `rp_${reinscriptionId}_${slot}`;
    const motif = (reinscRejectMotifs[key] || "").trim();
    if (decision === "Non conforme" && !motif) {
      setError("Saisissez le motif avant de rejeter la pièce.");
      return;
    }
    setError(null);
    setBusyKey(key);
    try {
      const res = await apiFetch<{ reinscription: ReinscriptionRecord }>(
        "/api/scolarite/reinscription-piece",
        {
          method: "POST",
          body: JSON.stringify({ reinscriptionId, slot, decision, motif }),
        }
      );
      setReinscriptions((prev) =>
        prev.map((r) => (r.id === reinscriptionId ? res.reinscription : r))
      );
    } catch (err: any) {
      setError(err?.message || "Erreur.");
    } finally {
      setBusyKey(null);
    }
  };

  const handleReinscStatus = async (
    reinscriptionId: string,
    status: ReinscriptionRecord["status"]
  ) => {
    setError(null);
    setBusyKey(`rs_${reinscriptionId}`);
    try {
      const res = await apiFetch<{ reinscription: ReinscriptionRecord }>(
        "/api/scolarite/reinscription-status",
        {
          method: "POST",
          body: JSON.stringify({ reinscriptionId, status }),
        }
      );
      setReinscriptions((prev) =>
        prev.map((r) => (r.id === reinscriptionId ? res.reinscription : r))
      );
    } catch (err: any) {
      setError(err?.message || "Action impossible.");
    } finally {
      setBusyKey(null);
    }
  };

  const admittedList = candidatures.filter(
    (c) => c.status === "Admis" || c.status === "Inscrit"
  );

  return (
    <div className="space-y-6 text-xs">
      {error && (
        <div className="p-2.5 bg-red-50 border border-red-200 text-red-800 rounded">
          {error}
        </div>
      )}

      {/* SECTION 1 : DOSSIERS À TRAITER */}
      <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200">
          <h1 className="text-sm font-bold text-slate-900">
            Dossiers à traiter
          </h1>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                <th className="py-2.5 px-4 font-semibold">Candidat</th>
                <th className="py-2.5 px-3 font-semibold">Sujet</th>
                <th className="py-2.5 px-3 font-semibold">État</th>
                <th className="py-2.5 px-3 font-semibold">Délai</th>
                <th className="py-2.5 px-4 font-semibold text-right">Dossier</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {candidatures.map((cand) => {
                const isExpanded = expandedId === cand.id;
                const allConforme = cand.pieces.every(
                  (p) => p.status === "Conforme"
                );

                return (
                  <React.Fragment key={cand.id}>
                    <tr className="hover:bg-slate-50/70">
                      <td className="py-2.5 px-4 font-semibold text-slate-900">
                        {cand.candidateName}
                        {cand.recoursMotif && (
                          <div className="text-[11px] font-normal text-amber-800 mt-0.5">
                            Recours : {cand.recoursMotif}
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-slate-800">
                        <span className="font-mono text-slate-500 mr-1.5">
                          {cand.subjectCode}
                        </span>
                        {cand.subjectTitle}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-900">
                        {cand.status}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-700">
                        {cand.nouveauDelai || cand.delai}
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedId(isExpanded ? null : cand.id)
                          }
                          className="font-semibold text-slate-900 underline"
                        >
                          {isExpanded ? "Masquer" : "Contrôler les pièces"}
                        </button>
                      </td>
                    </tr>

                    {isExpanded && (
                      <tr>
                        <td colSpan={5} className="bg-slate-50 px-4 py-4">
                          <div className="space-y-3">
                            <div className="bg-white border border-slate-200 rounded divide-y divide-slate-200">
                              {cand.pieces.map((p) => {
                                const mKey = `${cand.id}_${p.slot}`;
                                return (
                                  <div
                                    key={p.slot}
                                    className="p-3 grid grid-cols-1 lg:grid-cols-12 gap-3 items-start"
                                  >
                                    <div className="lg:col-span-4 space-y-0.5">
                                      <div className="font-semibold text-slate-900">
                                        {CANDIDATURE_SLOT_LABELS[p.slot]}
                                      </div>
                                      <div className="text-slate-600">
                                        {p.status === "Manquante"
                                          ? "Manquante"
                                          : `${p.source} — ${p.fileName}`}
                                      </div>
                                      <div className="font-semibold text-slate-800">
                                        État pièce : {p.status}
                                        {p.status === "Non conforme" &&
                                          p.motif &&
                                          ` (${p.motif})`}
                                      </div>
                                    </div>

                                    {/* Pré-contrôle IA (exclusivement visible ici) */}
                                    <div className="lg:col-span-4 space-y-1">
                                      <div className="text-[11px] font-medium text-slate-500">
                                        Pré-contrôle IA
                                      </div>
                                      {p.status === "Manquante" ? (
                                        <span className="text-slate-400">—</span>
                                      ) : (
                                        <div>
                                          <span
                                            className={`font-semibold ${
                                              p.aiStatus === "Conforme"
                                                ? "text-emerald-700"
                                                : p.aiStatus === "Douteux"
                                                ? "text-amber-700"
                                                : "text-red-700"
                                            }`}
                                          >
                                            {p.aiStatus || "En attente"}
                                          </span>
                                          {p.aiMotif && (
                                            <p className="text-slate-600 mt-0.5">
                                              {p.aiMotif}
                                            </p>
                                          )}
                                          <button
                                            type="button"
                                            disabled={busyKey !== null}
                                            onClick={() =>
                                              handleRecheckAi(cand.id, p.slot)
                                            }
                                            className="text-[11px] text-slate-500 hover:text-slate-900 underline mt-0.5"
                                          >
                                            Relancer l'analyse IA
                                          </button>
                                        </div>
                                      )}
                                    </div>

                                    {/* Décision humaine (Valider / Rejeter + motif) */}
                                    <div className="lg:col-span-4 space-y-1.5">
                                      {p.status !== "Manquante" && (
                                        <>
                                          <div className="flex flex-wrap gap-2">
                                            <button
                                              type="button"
                                              disabled={busyKey !== null}
                                              onClick={() =>
                                                handlePieceDecision(
                                                  cand.id,
                                                  p.slot,
                                                  "Conforme"
                                                )
                                              }
                                              className="px-2.5 py-1 bg-slate-900 text-white font-semibold rounded hover:bg-slate-800 disabled:opacity-50"
                                            >
                                              Valider
                                            </button>
                                            <button
                                              type="button"
                                              disabled={busyKey !== null}
                                              onClick={() =>
                                                handlePieceDecision(
                                                  cand.id,
                                                  p.slot,
                                                  "Non conforme"
                                                )
                                              }
                                              className="px-2.5 py-1 border border-red-300 text-red-700 bg-white hover:bg-red-50 font-semibold rounded disabled:opacity-50"
                                            >
                                              Rejeter
                                            </button>
                                          </div>
                                          <input
                                            type="text"
                                            placeholder="Motif en cas de rejet"
                                            value={
                                              rejectMotifs[mKey] ?? p.motif ?? ""
                                            }
                                            onChange={(e) =>
                                              setRejectMotifs((prev) => ({
                                                ...prev,
                                                [mKey]: e.target.value,
                                              }))
                                            }
                                            className="w-full px-2.5 py-1 border border-slate-300 rounded bg-white"
                                          />
                                        </>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>

                            {/* Actions de complétude sur le dossier */}
                            <div className="flex flex-wrap items-end justify-between gap-3 pt-1">
                              <button
                                type="button"
                                disabled={!allConforme || busyKey !== null}
                                onClick={() =>
                                  handleDossierCompleteness(cand.id, "Complet")
                                }
                                className="px-3.5 py-1.5 bg-slate-900 text-white font-semibold rounded hover:bg-slate-800 disabled:opacity-40"
                              >
                                Déclarer complet
                              </button>

                              <div className="flex flex-wrap items-end gap-2">
                                <div>
                                  <label className="block text-[11px] font-medium text-slate-600 mb-0.5">
                                    Nouveau délai
                                  </label>
                                  <input
                                    type="date"
                                    value={
                                      newDeadlines[cand.id] ||
                                      cand.nouveauDelai ||
                                      "2026-11-25"
                                    }
                                    onChange={(e) =>
                                      setNewDeadlines((prev) => ({
                                        ...prev,
                                        [cand.id]: e.target.value,
                                      }))
                                    }
                                    className="px-2.5 py-1 border border-slate-300 rounded bg-white"
                                  />
                                </div>
                                <button
                                  type="button"
                                  disabled={busyKey !== null}
                                  onClick={() =>
                                    handleDossierCompleteness(
                                      cand.id,
                                      "Incomplet"
                                    )
                                  }
                                  className="px-3.5 py-1.5 border border-slate-400 bg-white hover:bg-slate-100 text-slate-900 font-semibold rounded"
                                >
                                  Déclarer incomplet
                                </button>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* SECTION 2 : PUBLIER LES ADMIS & RÉINSCRIPTIONS */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Publier les admis */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-bold text-slate-900">
              Publier les admis
            </h2>
            <button
              type="button"
              disabled={!cedocGlobalValidated || officialListPublished || busyKey !== null}
              onClick={handlePublierAdmis}
              className="px-3.5 py-1.5 bg-slate-900 text-white font-semibold rounded hover:bg-slate-800 disabled:opacity-40"
            >
              {officialListPublished
                ? "Liste publiée"
                : "Publier les admis"}
            </button>
          </div>

          <div className="text-slate-600">
            Validation Directeur du CEDoc :{" "}
            <strong className="text-slate-900">
              {cedocGlobalValidated ? "Validée" : "En attente"}
            </strong>
          </div>

          {admittedList.length === 0 ? (
            <div className="text-slate-500 pt-1">
              Aucun candidat à l'état Admis.
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-1.5 pr-2 font-medium">Candidat</th>
                  <th className="py-1.5 px-2 font-medium">Sujet</th>
                  <th className="py-1.5 pl-2 font-medium text-right">État</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {admittedList.map((a) => (
                  <tr key={a.id}>
                    <td className="py-2 pr-2 font-semibold text-slate-900">
                      {a.candidateName}
                    </td>
                    <td className="py-2 px-2 text-slate-700">{a.subjectCode}</td>
                    <td className="py-2 pl-2 text-right">
                      {a.status === "Admis" && officialListPublished ? (
                        <button
                          type="button"
                          onClick={() => handleInscrire(a.id)}
                          className="px-2.5 py-1 bg-slate-900 text-white font-semibold rounded"
                        >
                          Inscrire
                        </button>
                      ) : (
                        <span className="font-semibold text-slate-800">
                          {a.status}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Réinscriptions */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
          <h2 className="text-sm font-bold text-slate-900">Réinscriptions</h2>
          {reinscriptions.map((rec) => {
            const allOk = rec.pieces.every((p) => p.status === "Conforme");
            return (
              <div
                key={rec.id}
                className="border border-slate-200 rounded p-3 space-y-2.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <strong className="text-slate-900">
                      {rec.doctorantName}
                    </strong>{" "}
                    <span className="text-slate-500">({rec.yearLabel})</span>
                  </div>
                  <span className="font-semibold text-slate-900">
                    {rec.status}
                  </span>
                </div>

                <div className="divide-y divide-slate-100">
                  {rec.pieces.map((p) => {
                    const rKey = `rp_${rec.id}_${p.slot}`;
                    return (
                      <div
                        key={p.slot}
                        className="py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                      >
                        <div>
                          <div className="font-medium text-slate-800">
                            {REINSCRIPTION_SLOT_LABELS[p.slot]}
                          </div>
                          <div className="text-slate-500">
                            {p.status} {p.fileName ? `— ${p.fileName}` : ""}
                          </div>
                        </div>

                        {p.status !== "Manquante" && (
                          <div className="flex flex-wrap items-center gap-1.5">
                            <input
                              type="text"
                              placeholder="Motif rejet"
                              value={reinscRejectMotifs[rKey] ?? p.motif ?? ""}
                              onChange={(e) =>
                                setReinscRejectMotifs((prev) => ({
                                  ...prev,
                                  [rKey]: e.target.value,
                                }))
                              }
                              className="px-2 py-1 border border-slate-300 rounded w-32"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                handleReinscPiece(rec.id, p.slot, "Conforme")
                              }
                              className="px-2 py-1 bg-slate-900 text-white font-semibold rounded"
                            >
                              Valider
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                handleReinscPiece(
                                  rec.id,
                                  p.slot,
                                  "Non conforme"
                                )
                              }
                              className="px-2 py-1 border border-red-300 text-red-700 rounded font-semibold"
                            >
                              Rejeter
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="flex gap-2 pt-1 border-t border-slate-100">
                  <button
                    type="button"
                    disabled={!allOk || busyKey !== null}
                    onClick={() => handleReinscStatus(rec.id, "Réinscrit")}
                    className="px-3 py-1 bg-slate-900 text-white font-semibold rounded disabled:opacity-40"
                  >
                    Valider la réinscription
                  </button>
                  <button
                    type="button"
                    disabled={busyKey !== null}
                    onClick={() => handleReinscStatus(rec.id, "Incomplet")}
                    className="px-3 py-1 border border-slate-300 text-slate-800 font-semibold rounded"
                  >
                    Déclarer incomplet
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};
