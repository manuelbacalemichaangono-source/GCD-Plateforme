import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { ThesisSubject, CandidaturePublic } from "../types/cedoc";

export const DirecteurTheseScreen: React.FC = () => {
  const { apiFetch } = useAuth();
  const [subjects, setSubjects] = useState<ThesisSubject[]>([]);
  const [candidatures, setCandidatures] = useState<CandidaturePublic[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  const [title, setTitle] = useState("");
  const [discipline, setDiscipline] = useState("Informatique & IA");
  const [language, setLanguage] = useState("Français");
  const [prerequisites, setPrerequisites] = useState("");
  const [keywords, setKeywords] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const data = await apiFetch<{
        subjects: ThesisSubject[];
        candidatures: CandidaturePublic[];
      }>("/api/directeur-these/data");
      setSubjects(data.subjects || []);
      setCandidatures(data.candidatures || []);
    } catch (err: any) {
      setError(err?.message || "Erreur de chargement.");
    }
  }, [apiFetch]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openCreate = () => {
    setEditingId(null);
    setTitle("");
    setDiscipline("Informatique & IA");
    setLanguage("Français");
    setPrerequisites("");
    setKeywords("");
    setFormOpen(true);
  };

  const openEdit = (s: ThesisSubject) => {
    setEditingId(s.id);
    setTitle(s.title);
    setDiscipline(s.discipline);
    setLanguage(s.language);
    setPrerequisites(s.prerequisites);
    setKeywords(s.keywords.join(", "));
    setFormOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await apiFetch("/api/directeur-these/sujet", {
        method: "POST",
        body: JSON.stringify({
          id: editingId || "",
          title,
          discipline,
          language,
          prerequisites,
          keywords,
        }),
      });
      setFormOpen(false);
      await loadData();
    } catch (err: any) {
      setError(err?.message || "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 text-xs">
      {error && (
        <div className="p-2.5 bg-red-50 border border-red-200 text-red-800 rounded">
          {error}
        </div>
      )}

      {/* SECTION 1 : MES SUJETS */}
      <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between gap-2">
          <h1 className="text-sm font-bold text-slate-900">Mes sujets</h1>
          <button
            type="button"
            onClick={openCreate}
            className="px-3 py-1.5 bg-slate-900 text-white font-semibold rounded hover:bg-slate-800"
          >
            Nouveau sujet
          </button>
        </div>

        {formOpen && (
          <form
            onSubmit={handleSave}
            className="p-4 bg-slate-50 border-b border-slate-200 space-y-3"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="block font-medium text-slate-700 mb-1">
                  Intitulé du sujet
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded bg-white"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Discipline
                </label>
                <input
                  type="text"
                  required
                  value={discipline}
                  onChange={(e) => setDiscipline(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded bg-white"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Langue
                </label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded bg-white"
                >
                  <option value="Français">Français</option>
                  <option value="Anglais">Anglais</option>
                  <option value="Français / Anglais">Français / Anglais</option>
                </select>
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Prérequis
                </label>
                <input
                  type="text"
                  value={prerequisites}
                  onChange={(e) => setPrerequisites(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded bg-white"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Mots-clés (séparés par des virgules)
                </label>
                <input
                  type="text"
                  value={keywords}
                  onChange={(e) => setKeywords(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded bg-white"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={saving}
                className="px-3.5 py-1.5 bg-slate-900 text-white font-semibold rounded hover:bg-slate-800"
              >
                {saving ? "Enregistrement..." : "Enregistrer"}
              </button>
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                className="px-3 py-1.5 text-slate-600"
              >
                Annuler
              </button>
            </div>
          </form>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                <th className="py-2.5 px-4 font-semibold">Code</th>
                <th className="py-2.5 px-3 font-semibold">Intitulé</th>
                <th className="py-2.5 px-3 font-semibold">Discipline</th>
                <th className="py-2.5 px-3 font-semibold">Langue</th>
                <th className="py-2.5 px-3 font-semibold">Statut</th>
                <th className="py-2.5 px-4 font-semibold text-right">Action</th>
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
                  <td className="py-2.5 px-3 text-slate-700">{s.discipline}</td>
                  <td className="py-2.5 px-3 text-slate-700">{s.language}</td>
                  <td className="py-2.5 px-3 font-semibold text-slate-800">
                    {s.status}
                  </td>
                  <td className="py-2.5 px-4 text-right">
                    <button
                      type="button"
                      onClick={() => openEdit(s)}
                      className="font-semibold text-slate-900 underline"
                    >
                      Modifier
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* SECTION 2 : CANDIDATS À MES SUJETS (LECTURE SEULE) */}
      <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200">
          <h2 className="text-sm font-bold text-slate-900">
            Candidats à mes sujets
          </h2>
        </div>

        {candidatures.length === 0 ? (
          <div className="p-5 text-slate-500">
            Aucune candidature sur vos sujets.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                  <th className="py-2.5 px-4 font-semibold">Candidat</th>
                  <th className="py-2.5 px-3 font-semibold">Sujet</th>
                  <th className="py-2.5 px-4 font-semibold">État</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {candidatures.map((c) => (
                  <tr key={c.id}>
                    <td className="py-2.5 px-4 font-semibold text-slate-900">
                      {c.candidateName}
                    </td>
                    <td className="py-2.5 px-3 text-slate-800">
                      {c.subjectCode} — {c.subjectTitle}
                    </td>
                    <td className="py-2.5 px-4 font-semibold text-slate-900">
                      {c.status}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};
