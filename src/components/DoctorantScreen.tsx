import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import {
  ReinscriptionRecord,
  ReinscriptionSlot,
  REINSCRIPTION_SLOT_LABELS,
} from "../types/cedoc";

export const DoctorantScreen: React.FC = () => {
  const { apiFetch } = useAuth();
  const [record, setRecord] = useState<ReinscriptionRecord | null>(null);
  const [uploadingSlot, setUploadingSlot] = useState<ReinscriptionSlot | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const data = await apiFetch<{ reinscription: ReinscriptionRecord | null }>(
        "/api/doctorant/reinscription"
      );
      setRecord(data.reinscription);
    } catch (err: any) {
      setError(err?.message || "Impossible de charger votre dossier.");
    }
  }, [apiFetch]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleUpload = async (
    slot: ReinscriptionSlot,
    file: File | undefined
  ) => {
    if (!file) return;
    setError(null);
    setUploadingSlot(slot);
    try {
      const data = await apiFetch<{ reinscription: ReinscriptionRecord }>(
        "/api/doctorant/upload-piece",
        {
          method: "POST",
          body: JSON.stringify({
            slot,
            fileName: file.name,
          }),
        }
      );
      setRecord(data.reinscription);
    } catch (err: any) {
      setError(err?.message || "Échec du téléversement.");
    } finally {
      setUploadingSlot(null);
    }
  };

  if (!record) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-5 text-xs text-slate-600">
        {error || "Chargement de votre dossier de réinscription..."}
      </div>
    );
  }

  const todayIso = new Date().toISOString().slice(0, 10);
  const withinDeadline = !record.delai || todayIso <= record.delai;
  const canDeposit =
    ["En dépôt", "Incomplet"].includes(record.status) && withinDeadline;

  return (
    <div className="space-y-5 text-xs">
      <h1 className="text-base font-bold text-slate-900">Ma réinscription</h1>

      {error && (
        <div className="p-2.5 bg-red-50 border border-red-200 text-red-800 rounded">
          {error}
        </div>
      )}

      {/* Section 1 : Dépôt des pièces */}
      <section className="bg-white border border-slate-200 rounded-lg divide-y divide-slate-200">
        {record.pieces.map((p) => {
          const allowUpload =
            canDeposit &&
            p.status !== "Conforme" &&
            (record.status !== "Incomplet" ||
              p.status === "Non conforme" ||
              p.status === "Manquante");

          return (
            <div
              key={p.slot}
              className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
            >
              <div className="space-y-0.5">
                <div className="font-semibold text-slate-900">
                  {REINSCRIPTION_SLOT_LABELS[p.slot]}
                </div>
                <div className="text-slate-600">
                  {p.fileName || "Aucun fichier déposé"}
                </div>
                {p.status === "Non conforme" && p.motif && (
                  <div className="text-red-700 font-medium">
                    Motif : {p.motif}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <span
                  className={`font-semibold ${
                    p.status === "Conforme"
                      ? "text-emerald-700"
                      : p.status === "Non conforme"
                      ? "text-red-700"
                      : p.status === "Reçue"
                      ? "text-slate-800"
                      : "text-slate-400"
                  }`}
                >
                  {p.status}
                </span>

                {allowUpload && (
                  <label className="px-3 py-1.5 border border-slate-300 bg-white hover:bg-slate-50 text-slate-900 font-semibold rounded cursor-pointer">
                    {uploadingSlot === p.slot
                      ? "Envoi..."
                      : p.status === "Non conforme"
                      ? "Remplacer"
                      : p.status === "Reçue"
                      ? "Modifier"
                      : "Déposer"}
                    <input
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg"
                      disabled={uploadingSlot !== null}
                      className="hidden"
                      onChange={(e) => {
                        handleUpload(p.slot, e.target.files?.[0]);
                        e.currentTarget.value = "";
                      }}
                    />
                  </label>
                )}
              </div>
            </div>
          );
        })}
      </section>

      {/* Section 2 : État de la réinscription (lecture seule) */}
      <section className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <span className="text-slate-500">Année : </span>
            <strong className="text-slate-900">{record.yearLabel}</strong>
          </div>
          <div>
            <span className="text-slate-500">État : </span>
            <strong className="text-slate-900">{record.status}</strong>
          </div>
          <div>
            <span className="text-slate-500">Délai : </span>
            <strong className="font-mono text-slate-900">{record.delai}</strong>
          </div>
          <div>
            <span className="text-slate-500">Directeur : </span>
            <strong className="text-slate-900">{record.thesisDirector}</strong>
          </div>
        </div>
        <div className="text-slate-700 pt-2 border-t border-slate-100">
          <span className="text-slate-500">Sujet : </span>
          <span className="font-medium text-slate-900">
            {record.subjectTitle}
          </span>
        </div>
      </section>
    </div>
  );
};
