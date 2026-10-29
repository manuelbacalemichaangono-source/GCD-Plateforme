import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { CandidaturePublic } from "../types/cedoc";

export const JuryScreen: React.FC = () => {
  const { apiFetch } = useAuth();
  const [dossiers, setDossiers] = useState<CandidaturePublic[]>([]);
  const [convDates, setConvDates] = useState<Record<string, string>>({});
  const [convLieux, setConvLieux] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadDossiers = useCallback(async () => {
    try {
      const data = await apiFetch<{ dossiers: CandidaturePublic[] }>(
        "/api/jury/dossiers"
      );
      setDossiers(data.dossiers || []);
    } catch (err: any) {
      setError(err?.message || "Erreur de chargement.");
    }
  }, [apiFetch]);

  useEffect(() => {
    loadDossiers();
  }, [loadDossiers]);

  const handleDecision = async (
    candidatureId: string,
    action:
      | "Présélectionné"
      | "Non présélectionné"
      | "Convoqué"
      | "Admis"
      | "Non admis"
  ) => {
    setError(null);
    setBusyId(candidatureId);
    try {
      const res = await apiFetch<{ candidature: CandidaturePublic }>(
        "/api/jury/decision",
        {
          method: "POST",
          body: JSON.stringify({
            candidatureId,
            action,
            convocationDate: convDates[candidatureId] || "18/11/2026 à 09h30",
            convocationLieu:
              convLieux[candidatureId] || "Salle de réunion CEDoc — EST Fès",
          }),
        }
      );
      setDossiers((prev) =>
        prev.map((d) => (d.id === candidatureId ? res.candidature : d))
      );
    } catch (err: any) {
      setError(err?.message || "Décision impossible.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-4 text-xs">
      <h1 className="text-base font-bold text-slate-900">
        Saisie des résultats
      </h1>

      {error && (
        <div className="p-2.5 bg-red-50 border border-red-200 text-red-800 rounded">
          {error}
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        {dossiers.length === 0 ? (
          <div className="p-6 text-slate-500 text-center">
            Aucun dossier déclaré Complet pour le moment.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                  <th className="py-2.5 px-4 font-semibold">Candidat</th>
                  <th className="py-2.5 px-3 font-semibold">Sujet</th>
                  <th className="py-2.5 px-3 font-semibold">État</th>
                  <th className="py-2.5 px-3 font-semibold">Convocation</th>
                  <th className="py-2.5 px-4 font-semibold">Décision</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 align-top">
                {dossiers.map((d) => (
                  <tr key={d.id}>
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      {d.candidateName}
                    </td>
                    <td className="py-3 px-3 text-slate-800">
                      <span className="font-mono text-slate-500 mr-1.5">
                        {d.subjectCode}
                      </span>
                      {d.subjectTitle}
                    </td>
                    <td className="py-3 px-3 font-semibold text-slate-900">
                      {d.status}
                    </td>
                    <td className="py-3 px-3">
                      {["Présélectionné", "Convoqué"].includes(d.status) ? (
                        <div className="flex flex-col gap-1.5 max-w-xs">
                          <input
                            type="text"
                            placeholder="Date et heure (ex. 18/11/2026 09h30)"
                            value={
                              convDates[d.id] ??
                              (d.convocationDate || "18/11/2026 à 09h30")
                            }
                            onChange={(e) =>
                              setConvDates((prev) => ({
                                ...prev,
                                [d.id]: e.target.value,
                              }))
                            }
                            className="px-2 py-1 border border-slate-300 rounded bg-white"
                          />
                          <input
                            type="text"
                            placeholder="Lieu"
                            value={
                              convLieux[d.id] ??
                              (d.convocationLieu ||
                                "Salle CEDoc — EST Fès")
                            }
                            onChange={(e) =>
                              setConvLieux((prev) => ({
                                ...prev,
                                [d.id]: e.target.value,
                              }))
                            }
                            className="px-2 py-1 border border-slate-300 rounded bg-white"
                          />
                          <button
                            type="button"
                            disabled={busyId === d.id}
                            onClick={() => handleDecision(d.id, "Convoqué")}
                            className="self-start px-2.5 py-1 border border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-900 font-semibold rounded"
                          >
                            Notifier la convocation
                          </button>
                        </div>
                      ) : d.convocationDate ? (
                        <div className="text-slate-700">
                          {d.convocationDate} — {d.convocationLieu}
                        </div>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1.5">
                        {["Complet", "Présélectionné", "Non présélectionné"].includes(
                          d.status
                        ) && (
                          <>
                            <button
                              type="button"
                              disabled={busyId === d.id}
                              onClick={() =>
                                handleDecision(d.id, "Présélectionné")
                              }
                              className="px-2.5 py-1 bg-slate-900 text-white font-semibold rounded hover:bg-slate-800"
                            >
                              Présélectionné
                            </button>
                            <button
                              type="button"
                              disabled={busyId === d.id}
                              onClick={() =>
                                handleDecision(d.id, "Non présélectionné")
                              }
                              className="px-2.5 py-1 border border-slate-300 text-slate-800 font-semibold rounded hover:bg-slate-50"
                            >
                              Non présélectionné
                            </button>
                          </>
                        )}

                        {["Présélectionné", "Convoqué", "Admis", "Non admis"].includes(
                          d.status
                        ) && (
                          <>
                            <button
                              type="button"
                              disabled={busyId === d.id}
                              onClick={() => handleDecision(d.id, "Admis")}
                              className="px-2.5 py-1 bg-emerald-700 text-white font-semibold rounded hover:bg-emerald-800"
                            >
                              Admis
                            </button>
                            <button
                              type="button"
                              disabled={busyId === d.id}
                              onClick={() => handleDecision(d.id, "Non admis")}
                              className="px-2.5 py-1 border border-red-300 text-red-700 font-semibold rounded hover:bg-red-50"
                            >
                              Non admis
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
