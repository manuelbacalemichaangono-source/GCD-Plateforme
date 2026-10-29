import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { ThesisSubject, SubjectStatus } from "../types/cedoc";

export const DirecteurLaboScreen: React.FC = () => {
  const { apiFetch } = useAuth();
  const [laboratory, setLaboratory] = useState("");
  const [subjects, setSubjects] = useState<ThesisSubject[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadSubjects = useCallback(async () => {
    try {
      const data = await apiFetch<{
        laboratory: string;
        subjects: ThesisSubject[];
      }>("/api/directeur-labo/sujets");
      setLaboratory(data.laboratory || "");
      setSubjects(data.subjects || []);
    } catch (err: any) {
      setError(err?.message || "Erreur de chargement.");
    }
  }, [apiFetch]);

  useEffect(() => {
    loadSubjects();
  }, [loadSubjects]);

  const handleStatusChange = async (
    subjectId: string,
    status: SubjectStatus
  ) => {
    setError(null);
    setBusyId(subjectId);
    try {
      const res = await apiFetch<{ subject: ThesisSubject }>(
        "/api/directeur-labo/statut",
        {
          method: "POST",
          body: JSON.stringify({ subjectId, status }),
        }
      );
      setSubjects((prev) =>
        prev.map((s) => (s.id === subjectId ? res.subject : s))
      );
    } catch (err: any) {
      setError(err?.message || "Action impossible.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-4 text-xs">
      <h1 className="text-base font-bold text-slate-900">
        Sujets du laboratoire {laboratory ? `(${laboratory})` : ""}
      </h1>

      {error && (
        <div className="p-2.5 bg-red-50 border border-red-200 text-red-800 rounded">
          {error}
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                <th className="py-2.5 px-4 font-semibold">Code</th>
                <th className="py-2.5 px-3 font-semibold">Intitulé</th>
                <th className="py-2.5 px-3 font-semibold">Directeur</th>
                <th className="py-2.5 px-3 font-semibold">Discipline</th>
                <th className="py-2.5 px-3 font-semibold">Statut</th>
                <th className="py-2.5 px-4 font-semibold text-right">
                  Décision
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {subjects.map((s) => (
                <tr key={s.id}>
                  <td className="py-2.5 px-4 font-mono text-slate-700">
                    {s.code}
                  </td>
                  <td className="py-2.5 px-3 font-semibold text-slate-900">
                    {s.title}
                  </td>
                  <td className="py-2.5 px-3 text-slate-800">
                    {s.thesisDirector}
                  </td>
                  <td className="py-2.5 px-3 text-slate-700">{s.discipline}</td>
                  <td className="py-2.5 px-3 font-semibold text-slate-900">
                    {s.status}
                  </td>
                  <td className="py-2.5 px-4 text-right">
                    <div className="inline-flex gap-1.5">
                      <button
                        type="button"
                        disabled={busyId === s.id || s.status === "Publié"}
                        onClick={() => handleStatusChange(s.id, "Publié")}
                        className="px-2.5 py-1 bg-slate-900 text-white font-semibold rounded hover:bg-slate-800 disabled:opacity-40"
                      >
                        Valider et publier
                      </button>
                      <button
                        type="button"
                        disabled={busyId === s.id || s.status === "Refusé"}
                        onClick={() => handleStatusChange(s.id, "Refusé")}
                        className="px-2.5 py-1 border border-red-300 text-red-700 font-semibold rounded hover:bg-red-50 disabled:opacity-40"
                      >
                        Refuser
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
