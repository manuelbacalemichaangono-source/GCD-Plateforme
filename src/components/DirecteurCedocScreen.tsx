import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { CandidaturePublic } from "../types/cedoc";

export const DirecteurCedocScreen: React.FC = () => {
  const { apiFetch } = useAuth();
  const [admitted, setAdmitted] = useState<CandidaturePublic[]>([]);
  const [cedocGlobalValidated, setCedocGlobalValidated] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const data = await apiFetch<{
        admitted: CandidaturePublic[];
        cedocGlobalValidated: boolean;
      }>("/api/directeur-cedoc/admis");
      setAdmitted(data.admitted || []);
      setCedocGlobalValidated(Boolean(data.cedocGlobalValidated));
    } catch (err: any) {
      setError(err?.message || "Erreur de chargement.");
    }
  }, [apiFetch]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleValidate = async () => {
    setError(null);
    setBusy(true);
    try {
      const res = await apiFetch<{
        cedocGlobalValidated: boolean;
        admitted: CandidaturePublic[];
      }>("/api/directeur-cedoc/valider", {
        method: "POST",
      });
      setCedocGlobalValidated(res.cedocGlobalValidated);
      setAdmitted(res.admitted);
    } catch (err: any) {
      setError(err?.message || "Validation impossible.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4 text-xs">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-base font-bold text-slate-900">
          Validation de la liste finale des admis
        </h1>

        <button
          type="button"
          disabled={admitted.length === 0 || cedocGlobalValidated || busy}
          onClick={handleValidate}
          className="px-4 py-2 bg-slate-900 text-white font-semibold rounded hover:bg-slate-800 disabled:opacity-40"
        >
          {cedocGlobalValidated
            ? "Liste finale validée"
            : "Valider la liste finale des admis"}
        </button>
      </div>

      {error && (
        <div className="p-2.5 bg-red-50 border border-red-200 text-red-800 rounded">
          {error}
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        {admitted.length === 0 ? (
          <div className="p-6 text-center text-slate-500">
            Aucun candidat à l'état Admis en attente de validation.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                  <th className="py-2.5 px-4 font-semibold">Candidat</th>
                  <th className="py-2.5 px-3 font-semibold">Sujet</th>
                  <th className="py-2.5 px-3 font-semibold">Laboratoire</th>
                  <th className="py-2.5 px-4 font-semibold">Directeur</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {admitted.map((a) => (
                  <tr key={a.id}>
                    <td className="py-2.5 px-4 font-semibold text-slate-900">
                      {a.candidateName}
                    </td>
                    <td className="py-2.5 px-3 text-slate-800">
                      {a.subjectCode} — {a.subjectTitle}
                    </td>
                    <td className="py-2.5 px-3 text-slate-700">
                      {a.laboratory}
                    </td>
                    <td className="py-2.5 px-4 text-slate-800">
                      {a.thesisDirector}
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
