import React, { useState } from "react";
import {
  ThesisSubject,
  SubjectStatus,
  CandidateApplication,
  ReenrollmentRecord,
  RequiredDocSlot,
  DepositedPiece,
} from "../types/cedoc";
import { ALL_DOC_SLOTS, DOC_SLOT_LABELS } from "../data/cedocData";
import { Lock, Unlock } from "lucide-react";

interface GovernanceWorkspaceProps {
  subjects: ThesisSubject[];
  onUpdateSubjectStatus: (id: string, status: SubjectStatus) => void;
  candidates: CandidateApplication[];
  onUpdateCandidate: (app: CandidateApplication) => void;
  onCreateCandidate: (app: CandidateApplication) => void;
  reenrollments: ReenrollmentRecord[];
  onUpdateReenrollment: (rec: ReenrollmentRecord) => void;
  presidentSigned: boolean;
  setPresidentSigned: (v: boolean) => void;
  cedocDirectorSigned: boolean;
  setCedocDirectorSigned: (v: boolean) => void;
  principalQuota: number;
  setPrincipalQuota: (n: number) => void;
}

type ManagerRole =
  | "SECRETARIAT_CEDOC"
  | "DIRECTEUR_THESE"
  | "DIRECTEUR_LABO"
  | "JURY_PRESIDENT"
  | "DIRECTEUR_CEDOC";

export const GovernanceWorkspace: React.FC<GovernanceWorkspaceProps> = ({
  subjects,
  onUpdateSubjectStatus,
  candidates,
  onUpdateCandidate,
  onCreateCandidate,
  reenrollments,
  onUpdateReenrollment,
  presidentSigned,
  setPresidentSigned,
  cedocDirectorSigned,
  setCedocDirectorSigned,
  principalQuota,
  setPrincipalQuota,
}) => {
  const [activeActor, setActiveActor] = useState<ManagerRole>("SECRETARIAT_CEDOC");
  const [adminTab, setAdminTab] = useState<
    | "conformite_ia"
    | "completude_ensembliste"
    | "guichet_physique"
    | "sujets_labo"
    | "commission_jury"
    | "publication_admis"
    | "circuit_reinscription"
  >("conformite_ia");

  // Journal des corrections humaines (CU 03)
  const [correctionJournal, setCorrectionJournal] = useState<
    { time: string; cand: string; piece: string; decision: string; motif: string }[]
  >([]);
  const [onlyDoubtful, setOnlyDoubtful] = useState(false);
  const [humanMotifDraft, setHumanMotifDraft] = useState<Record<string, string>>({});
  const [aiRunningKey, setAiRunningKey] = useState<string | null>(null);

  // Fonction ensembliste (CU 04) : E_tous \ E_ayant_depose(X)
  const [slotX, setSlotX] = useState<RequiredDocSlot>("PROJET_THESE");
  const [newDeadlineInput, setNewDeadlineInput] = useState("2026-11-10");
  const [ensembleNotice, setEnsembleNotice] = useState<string | null>(null);

  // Guichet dépôt physique (CU 05)
  const [physName, setPhysName] = useState("");
  const [physCin, setPhysCin] = useState("");
  const [physCne, setPhysCne] = useState("");
  const [physSubject, setPhysSubject] = useState("CEDOC-IA-01");
  const [physCheckedSlots, setPhysCheckedSlots] =
    useState<RequiredDocSlot[]>(ALL_DOC_SLOTS);

  // Déverrouillage jury avec motif + accord Directeur Laboratoire (CU 06)
  const [unlockTarget, setUnlockTarget] = useState<CandidateApplication | null>(null);
  const [unlockMotif, setUnlockMotif] = useState("");
  const [labAccord, setLabAccord] = useState(false);
  const [pvOpen, setPvOpen] = useState(false);
  const [pubBroadcastNotice, setPubBroadcastNotice] = useState<string | null>(null);

  // Opération ensembliste : Tous les candidats MOINS ceux ayant déposé le document X
  const setAll = candidates;
  const setHavingX = setAll.filter((c) =>
    c.pieces.some((p) => p.slot === slotX)
  );
  const setMissingX = setAll.filter(
    (c) => !c.pieces.some((p) => p.slot === slotX)
  );

  const handleBatchRelanceEnsemble = () => {
    setMissingX.forEach((c) => {
      if (c.adminStatus !== "non_admis") {
        onUpdateCandidate({
          ...c,
          deadline: newDeadlineInput,
          adminStatus: "relance_delai",
        });
      }
    });
    setEnsembleNotice(
      `Relance envoyée au sous-ensemble (${setMissingX.length} dossier(s) sans ${DOC_SLOT_LABELS[slotX]}) — Nouveau délai fixé au ${newDeadlineInput}.`
    );
  };

  const handleHumanPieceDecision = (
    cand: CandidateApplication,
    slot: RequiredDocSlot,
    decision: "valide" | "rejete"
  ) => {
    const key = `${cand.id}-${slot}`;
    const motif =
      humanMotifDraft[key]?.trim() ||
      (decision === "valide" ? "Validé après contrôle humain" : "Non conforme confirmé");

    const updatedPieces = cand.pieces.map((p) =>
      p.slot === slot ? { ...p, humanState: decision, correctionNote: motif } : p
    );
    onUpdateCandidate({ ...cand, pieces: updatedPieces });

    setCorrectionJournal((prev) => [
      {
        time: new Date().toLocaleTimeString("fr-FR", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        cand: cand.fullName,
        piece: DOC_SLOT_LABELS[slot],
        decision: decision === "valide" ? "Conforme (Humain)" : "Rejeté (Humain)",
        motif,
      },
      ...prev,
    ]);
  };

  const handleReRunAiPiece = async (
    cand: CandidateApplication,
    piece: DepositedPiece
  ) => {
    const key = `${cand.id}-${piece.slot}`;
    setAiRunningKey(key);
    try {
      const resp = await fetch("/api/verify-document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidateName: cand.fullName,
          candidateCin: cand.cin,
          docType: DOC_SLOT_LABELS[piece.slot],
          extractedTextSample: piece.summaryText,
        }),
      });
      const data = await resp.json();
      if (resp.ok && data.status) {
        const nextPieces = cand.pieces.map((p) =>
          p.slot === piece.slot
            ? { ...p, aiState: data.status, aiMotif: data.motif }
            : p
        );
        onUpdateCandidate({ ...cand, pieces: nextPieces });
      }
    } finally {
      setAiRunningKey(null);
    }
  };

  const handlePhysicalIntake = (e: React.FormEvent) => {
    e.preventDefault();
    const pieces: DepositedPiece[] = physCheckedSlots.map((slot) => ({
      slot,
      source: "Numérisé au Guichet",
      summaryText: `${DOC_SLOT_LABELS[slot]} numérisé par le secrétariat.`,
      aiState: "conforme",
      aiMotif: "Pièce papier numérisée au guichet.",
      humanState: "valide",
    }));

    const isComplete = physCheckedSlots.length === ALL_DOC_SLOTS.length;
    const app: CandidateApplication = {
      id: `c-${Date.now()}`,
      dossierCode: `DOS-2026-0${candidates.length + 1}`,
      fullName: physName,
      cin: physCin.toUpperCase(),
      studentIdCne: physCne.toUpperCase(),
      email: "Dépôt physique au secrétariat",
      subjectCode: physSubject,
      channel: "Dépôt physique",
      receiptNumber: `REC-CEDOC-${Math.floor(100 + Math.random() * 899)}`,
      pieces,
      deadline: "2026-11-08",
      adminStatus: isComplete ? "complet_forme" : "en_cours",
      dossierScore: 0,
      projectScore: 0,
      interviewScore: 0,
      juryLocked: false,
      attendanceStatus: "en_attente",
    };
    onCreateCandidate(app);
    setPhysName("");
    setPhysCin("");
    setPhysCne("");
  };

  // Classement Jury sur le sujet CEDOC-IA-01
  const juryApps = [...candidates]
    .filter((c) => c.subjectCode === "CEDOC-IA-01" && c.adminStatus !== "non_admis")
    .sort(
      (a, b) =>
        b.dossierScore +
        b.projectScore +
        b.interviewScore -
        (a.dossierScore + a.projectScore + a.interviewScore)
    );

  const eligibleNotWithdrawn = juryApps.filter(
    (c) =>
      c.dossierScore + c.projectScore + c.interviewScore >= 60 &&
      c.attendanceStatus !== "desiste"
  );
  const mainIds = new Set(
    eligibleNotWithdrawn.slice(0, principalQuota).map((c) => c.id)
  );
  const waitIds = new Set(
    eligibleNotWithdrawn.slice(principalQuota).map((c) => c.id)
  );

  return (
    <div className="space-y-4 text-xs">
      {/* Sélection de l'acteur institutionnel du CEDoc (sans l'EST) */}
      <div className="bg-white border border-slate-200 rounded-lg p-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-slate-500 mr-1">Acteur connecté :</span>
          {(
            [
              ["SECRETARIAT_CEDOC", "Secrétariat / Scolarité CEDoc"],
              ["DIRECTEUR_THESE", "Directeur de Thèse"],
              ["DIRECTEUR_LABO", "Directeur du Laboratoire"],
              ["JURY_PRESIDENT", "Jury & Président du Jury"],
              ["DIRECTEUR_CEDOC", "Directeur du CEDoc"],
            ] as [ManagerRole, string][]
          ).map(([roleKey, label]) => (
            <button
              key={roleKey}
              onClick={() => {
                setActiveActor(roleKey);
                if (roleKey === "SECRETARIAT_CEDOC") setAdminTab("conformite_ia");
                if (roleKey === "DIRECTEUR_LABO") setAdminTab("sujets_labo");
                if (roleKey === "DIRECTEUR_THESE") setAdminTab("circuit_reinscription");
                if (roleKey === "JURY_PRESIDENT") setAdminTab("commission_jury");
                if (roleKey === "DIRECTEUR_CEDOC") setAdminTab("publication_admis");
              }}
              className={`px-2.5 py-1 rounded font-medium transition-colors ${
                activeActor === roleKey
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Onglets fonctionnels de gestion */}
      <div className="flex flex-wrap items-center gap-1 border-b border-slate-200 pb-2">
        <button
          onClick={() => setAdminTab("conformite_ia")}
          className={`px-2.5 py-1.5 rounded font-medium ${
            adminTab === "conformite_ia"
              ? "bg-slate-900 text-white"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          Conformité IA & Forme
        </button>
        <button
          onClick={() => setAdminTab("completude_ensembliste")}
          className={`px-2.5 py-1.5 rounded font-medium ${
            adminTab === "completude_ensembliste"
              ? "bg-slate-900 text-white"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          Complétude (Fonction ensembliste)
        </button>
        <button
          onClick={() => setAdminTab("guichet_physique")}
          className={`px-2.5 py-1.5 rounded font-medium ${
            adminTab === "guichet_physique"
              ? "bg-slate-900 text-white"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          Dépôt physique
        </button>
        <button
          onClick={() => setAdminTab("sujets_labo")}
          className={`px-2.5 py-1.5 rounded font-medium ${
            adminTab === "sujets_labo"
              ? "bg-slate-900 text-white"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          Statuts des sujets (Labo)
        </button>
        <button
          onClick={() => setAdminTab("commission_jury")}
          className={`px-2.5 py-1.5 rounded font-medium ${
            adminTab === "commission_jury"
              ? "bg-slate-900 text-white"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          Fond scientifique & Notes Jury
        </button>
        <button
          onClick={() => setAdminTab("publication_admis")}
          className={`px-2.5 py-1.5 rounded font-medium ${
            adminTab === "publication_admis"
              ? "bg-slate-900 text-white"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          Publication des admis & Recours
        </button>
        <button
          onClick={() => setAdminTab("circuit_reinscription")}
          className={`px-2.5 py-1.5 rounded font-medium ${
            adminTab === "circuit_reinscription"
              ? "bg-slate-900 text-white"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          Réinscriptions Doctorants
        </button>
      </div>

      {/* 1. PRÉ-CONTRÔLE IA DE CONFORMITÉ (SANS POURCENTAGES) & DÉCISION HUMAINE */}
      {adminTab === "conformite_ia" && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="font-semibold text-slate-900">
                Contrôle de forme (Secrétariat) — Pré-contrôle IA & Décision humaine
              </div>
              <label className="inline-flex items-center gap-2 text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={onlyDoubtful}
                  onChange={(e) => setOnlyDoubtful(e.target.checked)}
                />
                <span>Afficher uniquement les cas douteux ou non conformes</span>
              </label>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded">
              <table className="w-full text-left border-collapse min-w-[900px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                    <th className="py-2 px-3">Candidat</th>
                    <th className="py-2 px-3">Pièce & Source</th>
                    <th className="py-2 px-3">Pré-contrôle IA & Motif</th>
                    <th className="py-2 px-3">Décision humaine</th>
                    <th className="py-2 px-3 text-right">Arbitrage / Correction</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 align-top">
                  {candidates.flatMap((cand) =>
                    cand.pieces
                      .filter((p) =>
                        onlyDoubtful ? p.aiState !== "conforme" : true
                      )
                      .map((p) => {
                        const rowKey = `${cand.id}-${p.slot}`;
                        return (
                          <tr key={rowKey} className="hover:bg-slate-50/70">
                            <td className="py-2.5 px-3">
                              <div className="font-semibold text-slate-900">
                                {cand.fullName}
                              </div>
                              <div className="font-mono text-[11px] text-slate-500">
                                CIN {cand.cin} · {cand.dossierCode}
                              </div>
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="font-medium text-slate-900">
                                {DOC_SLOT_LABELS[p.slot]}
                              </div>
                              <div className="text-[11px] text-slate-500">
                                {p.source} — {p.summaryText}
                              </div>
                            </td>
                            <td className="py-2.5 px-3">
                              <div
                                className={`font-semibold ${
                                  p.aiState === "conforme"
                                    ? "text-emerald-800"
                                    : p.aiState === "douteux"
                                    ? "text-amber-800"
                                    : "text-red-800"
                                }`}
                              >
                                {p.aiState === "conforme"
                                  ? "Conforme"
                                  : p.aiState === "douteux"
                                  ? "Douteux (Vérification humaine)"
                                  : "Non conforme"}
                              </div>
                              <div className="text-slate-600 mt-0.5">{p.aiMotif}</div>
                            </td>
                            <td className="py-2.5 px-3 font-medium">
                              {p.humanState === "valide" && (
                                <span className="text-emerald-800">Validé (Humain)</span>
                              )}
                              {p.humanState === "rejete" && (
                                <span className="text-red-800">Rejeté (Humain)</span>
                              )}
                              {p.humanState === "en_attente" && (
                                <span className="text-amber-800">En attente</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <input
                                  type="text"
                                  value={humanMotifDraft[rowKey] || ""}
                                  onChange={(e) =>
                                    setHumanMotifDraft((prev) => ({
                                      ...prev,
                                      [rowKey]: e.target.value,
                                    }))
                                  }
                                  placeholder="Motif..."
                                  className="px-2 py-1 border border-slate-300 rounded w-32 text-xs"
                                />
                                <button
                                  onClick={() =>
                                    handleHumanPieceDecision(cand, p.slot, "valide")
                                  }
                                  className="px-2 py-1 bg-emerald-700 text-white rounded font-medium"
                                >
                                  Valider
                                </button>
                                <button
                                  onClick={() =>
                                    handleHumanPieceDecision(cand, p.slot, "rejete")
                                  }
                                  className="px-2 py-1 bg-red-700 text-white rounded font-medium"
                                >
                                  Rejeter
                                </button>
                                <button
                                  onClick={() => handleReRunAiPiece(cand, p)}
                                  disabled={aiRunningKey === rowKey}
                                  className="px-2 py-1 bg-slate-100 text-slate-800 rounded"
                                >
                                  {aiRunningKey === rowKey ? "..." : "IA"}
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                  )}
                </tbody>
              </table>
            </div>

            {correctionJournal.length > 0 && (
              <div className="pt-2 space-y-1">
                <div className="font-semibold text-slate-800">Journal des corrections :</div>
                {correctionJournal.map((j, i) => (
                  <div key={i} className="text-slate-600 font-mono text-[11px]">
                    [{j.time}] {j.cand} · {j.piece} → {j.decision} ({j.motif})
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. COMPLÉTUDE PAR ESPACES DE DÉPÔT & FONCTION ENSEMBLISTE */}
      {adminTab === "completude_ensembliste" && (
        <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3 pb-3 border-b border-slate-200">
            <div className="space-y-1">
              <div className="font-semibold text-slate-900">
                Fonction ensembliste : (Tous les candidats) MOINS (Ceux ayant déposé la pièce X)
              </div>
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <select
                  value={slotX}
                  onChange={(e) => setSlotX(e.target.value as RequiredDocSlot)}
                  className="px-2.5 py-1.5 border border-slate-300 rounded bg-white font-medium"
                >
                  {ALL_DOC_SLOTS.map((s) => (
                    <option key={s} value={s}>
                      Espace de dépôt X : {DOC_SLOT_LABELS[s]}
                    </option>
                  ))}
                </select>
                <span className="font-mono text-slate-700 tabular-nums">
                  Total ({setAll.length}) − Déposé ({setHavingX.length}) ={" "}
                  <strong>{setMissingX.length} incomplet(s)</strong>
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-slate-600">Nouveau délai :</label>
              <input
                type="date"
                value={newDeadlineInput}
                onChange={(e) => setNewDeadlineInput(e.target.value)}
                className="px-2 py-1 border border-slate-300 rounded font-mono"
              />
              <button
                onClick={handleBatchRelanceEnsemble}
                disabled={setMissingX.length === 0}
                className="px-3 py-1.5 bg-slate-900 text-white font-semibold rounded disabled:opacity-40"
              >
                Relancer le sous-ensemble ({setMissingX.length})
              </button>
            </div>
          </div>

          {ensembleNotice && (
            <div className="p-2.5 bg-slate-900 text-white rounded flex justify-between">
              <span>{ensembleNotice}</span>
              <button onClick={() => setEnsembleNotice(null)} className="underline">
                Fermer
              </button>
            </div>
          )}

          <div className="overflow-x-auto border border-slate-200 rounded">
            <table className="w-full text-left border-collapse min-w-[880px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <th className="py-2 px-3">Dossier & Candidat</th>
                  {ALL_DOC_SLOTS.map((s) => (
                    <th key={s} className="py-2 px-2 text-center">
                      {DOC_SLOT_LABELS[s].split(" (")[0]}
                    </th>
                  ))}
                  <th className="py-2 px-3">Délai & État</th>
                  <th className="py-2 px-3 text-right">Hors délai</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {candidates.map((c) => {
                  const inMissingSet = setMissingX.some((m) => m.id === c.id);
                  return (
                    <tr
                      key={c.id}
                      className={inMissingSet ? "bg-amber-50/60" : "hover:bg-slate-50/70"}
                    >
                      <td className="py-2 px-3">
                        <div className="font-semibold text-slate-900">{c.fullName}</div>
                        <div className="font-mono text-[11px] text-slate-500">
                          {c.dossierCode} · {c.channel}
                        </div>
                      </td>
                      {ALL_DOC_SLOTS.map((s) => {
                        const present = c.pieces.some((p) => p.slot === s);
                        return (
                          <td key={s} className="py-2 px-2 text-center font-medium">
                            {present ? (
                              <span className="text-emerald-800">Déposé</span>
                            ) : (
                              <span className="text-red-700">Manquant</span>
                            )}
                          </td>
                        );
                      })}
                      <td className="py-2 px-3">
                        <div className="font-mono text-[11px] tabular-nums">
                          {c.deadline}
                        </div>
                        <div className="font-semibold">
                          {c.adminStatus === "complet_forme" && (
                            <span className="text-emerald-800">Complet</span>
                          )}
                          {c.adminStatus === "en_cours" && (
                            <span className="text-amber-800">Incomplet</span>
                          )}
                          {c.adminStatus === "relance_delai" && (
                            <span className="text-amber-800">Nouveau délai accordé</span>
                          )}
                          {c.adminStatus === "non_admis" && (
                            <span className="text-red-800">Candidature non admise</span>
                          )}
                        </div>
                      </td>
                      <td className="py-2 px-3 text-right">
                        {c.adminStatus !== "complet_forme" &&
                          c.adminStatus !== "non_admis" && (
                            <button
                              onClick={() =>
                                onUpdateCandidate({ ...c, adminStatus: "non_admis" })
                              }
                              className="px-2.5 py-1 bg-red-50 text-red-800 border border-red-200 rounded font-semibold"
                            >
                              Candidature non admise
                            </button>
                          )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. GUICHET DE DÉPÔT PHYSIQUE (POUR CANDIDATS SANS TÉLÉPHONE / CONNEXION) */}
      {adminTab === "guichet_physique" && (
        <form
          onSubmit={handlePhysicalIntake}
          className="bg-white border border-slate-200 rounded-lg p-4 space-y-4"
        >
          <div className="font-semibold text-slate-900">
            Saisie et numérisation par le secrétariat (Dépôt physique avec accusé de réception)
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <input
              type="text"
              required
              value={physName}
              onChange={(e) => setPhysName(e.target.value)}
              placeholder="Nom complet du candidat"
              className="px-2.5 py-1.5 border border-slate-300 rounded"
            />
            <input
              type="text"
              required
              value={physCin}
              onChange={(e) => setPhysCin(e.target.value)}
              placeholder="N° CIN"
              className="px-2.5 py-1.5 font-mono border border-slate-300 rounded"
            />
            <input
              type="text"
              required
              value={physCne}
              onChange={(e) => setPhysCne(e.target.value)}
              placeholder="Identifiant CNE"
              className="px-2.5 py-1.5 font-mono border border-slate-300 rounded"
            />
            <select
              value={physSubject}
              onChange={(e) => setPhysSubject(e.target.value)}
              className="px-2.5 py-1.5 border border-slate-300 rounded bg-white"
            >
              {subjects
                .filter((s) => s.status === "publie")
                .map((s) => (
                  <option key={s.id} value={s.code}>
                    {s.code} — {s.title}
                  </option>
                ))}
            </select>
          </div>

          <div className="flex flex-wrap gap-3">
            {ALL_DOC_SLOTS.map((slot) => (
              <label key={slot} className="inline-flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={physCheckedSlots.includes(slot)}
                  onChange={() =>
                    setPhysCheckedSlots((prev) =>
                      prev.includes(slot)
                        ? prev.filter((x) => x !== slot)
                        : [...prev, slot]
                    )
                  }
                />
                <span>{DOC_SLOT_LABELS[slot]}</span>
              </label>
            ))}
          </div>

          <button
            type="submit"
            className="px-4 py-1.5 bg-slate-900 text-white font-semibold rounded"
          >
            Numériser & Générer l'accusé de réception
          </button>
        </form>
      )}

      {/* 4. STATUTS DES SUJETS PAR LE DIRECTEUR DU LABORATOIRE */}
      {adminTab === "sujets_labo" && (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                <th className="py-2.5 px-3">Code</th>
                <th className="py-2.5 px-3">Sujet & Directeur de thèse</th>
                <th className="py-2.5 px-3">Laboratoire</th>
                <th className="py-2.5 px-3 text-right">Statut (Directeur du Laboratoire)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {subjects.map((s) => (
                <tr key={s.id}>
                  <td className="py-2.5 px-3 font-mono">{s.code}</td>
                  <td className="py-2.5 px-3">
                    <div className="font-semibold text-slate-900">{s.title}</div>
                    <div className="text-slate-500">{s.thesisDirector}</div>
                  </td>
                  <td className="py-2.5 px-3 text-slate-700">{s.laboratory}</td>
                  <td className="py-2.5 px-3 text-right">
                    <select
                      value={s.status}
                      onChange={(e) =>
                        onUpdateSubjectStatus(s.id, e.target.value as SubjectStatus)
                      }
                      className="px-2.5 py-1 border border-slate-300 rounded bg-white font-medium"
                    >
                      <option value="brouillon">Brouillon</option>
                      <option value="valide">Validé</option>
                      <option value="publie">Publié (Visible au catalogue)</option>
                      <option value="cloture">Clôturé</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 5. ÉVALUATION DU FOND SCIENTIFIQUE (FICHE DE SYNTHÈSE) & GRILLE JURY VERROUILLÉE + PV */}
      {adminTab === "commission_jury" && (
        <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="font-semibold text-slate-900">
              Fiche de synthèse scientifique & Grille d'évaluation numérique standardisée (Sujet CEDOC-IA-01)
            </div>
            <button
              onClick={() => setPvOpen((v) => !v)}
              className="px-3 py-1.5 bg-slate-900 text-white font-semibold rounded"
            >
              {pvOpen ? "Masquer le Procès-Verbal" : "Générer le Procès-Verbal"}
            </button>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded">
            <table className="w-full text-left border-collapse min-w-[860px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <th className="py-2 px-3">Rang</th>
                  <th className="py-2 px-3">Fiche de synthèse candidat</th>
                  <th className="py-2 px-3 text-right">Dossier (/40)</th>
                  <th className="py-2 px-3 text-right">Projet (/30)</th>
                  <th className="py-2 px-3 text-right">Entretien (/30)</th>
                  <th className="py-2 px-3 text-right">Total (/100)</th>
                  <th className="py-2 px-3 text-right">Verrouillage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {juryApps.map((app, i) => {
                  const total =
                    app.dossierScore + app.projectScore + app.interviewScore;
                  return (
                    <tr key={app.id}>
                      <td className="py-2 px-3 font-mono font-bold tabular-nums">
                        #{i + 1}
                      </td>
                      <td className="py-2 px-3">
                        <div className="font-semibold text-slate-900">{app.fullName}</div>
                        <div className="text-[11px] text-slate-500">
                          Forme vérifiée ({app.pieces.length}/5 pièces) — Pas de recontrôle administratif par la commission
                        </div>
                        {app.unlockReason && (
                          <div className="text-[11px] text-amber-800">
                            Rectification autorisée (Dir. Labo) : {app.unlockReason}
                          </div>
                        )}
                      </td>
                      <td className="py-2 px-3 text-right">
                        <input
                          type="number"
                          min={0}
                          max={40}
                          disabled={app.juryLocked}
                          value={app.dossierScore}
                          onChange={(e) =>
                            onUpdateCandidate({
                              ...app,
                              dossierScore: Math.min(40, Math.max(0, Number(e.target.value))),
                            })
                          }
                          className="w-14 text-right font-mono px-1.5 py-1 border border-slate-300 rounded disabled:bg-slate-100 tabular-nums"
                        />
                      </td>
                      <td className="py-2 px-3 text-right">
                        <input
                          type="number"
                          min={0}
                          max={30}
                          disabled={app.juryLocked}
                          value={app.projectScore}
                          onChange={(e) =>
                            onUpdateCandidate({
                              ...app,
                              projectScore: Math.min(30, Math.max(0, Number(e.target.value))),
                            })
                          }
                          className="w-14 text-right font-mono px-1.5 py-1 border border-slate-300 rounded disabled:bg-slate-100 tabular-nums"
                        />
                      </td>
                      <td className="py-2 px-3 text-right">
                        <input
                          type="number"
                          min={0}
                          max={30}
                          disabled={app.juryLocked}
                          value={app.interviewScore}
                          onChange={(e) =>
                            onUpdateCandidate({
                              ...app,
                              interviewScore: Math.min(30, Math.max(0, Number(e.target.value))),
                            })
                          }
                          className="w-14 text-right font-mono px-1.5 py-1 border border-slate-300 rounded disabled:bg-slate-100 tabular-nums"
                        />
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold tabular-nums">
                        {total} / 100
                      </td>
                      <td className="py-2 px-3 text-right">
                        {app.juryLocked ? (
                          <button
                            onClick={() => setUnlockTarget(app)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-800 rounded font-medium"
                          >
                            <Lock className="w-3 h-3" /> Corriger (Motif + Dir. Labo)
                          </button>
                        ) : (
                          <button
                            onClick={() =>
                              onUpdateCandidate({ ...app, juryLocked: true })
                            }
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-900 text-white rounded font-semibold"
                          >
                            <Unlock className="w-3 h-3" /> Valider & Verrouiller
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {pvOpen && (
            <div className="p-3.5 bg-slate-50 border border-slate-300 rounded space-y-1">
              <div className="font-bold text-slate-900">
                PROCÈS-VERBAL GÉNÉRÉ AUTOMATIQUEMENT — SUJET CEDOC-IA-01
              </div>
              <p className="text-slate-700">
                Classement calculé sans ressaisie :{" "}
                {juryApps
                  .map(
                    (a, idx) =>
                      `${idx + 1}. ${a.fullName} (${
                        a.dossierScore + a.projectScore + a.interviewScore
                      }/100)`
                  )
                  .join(" — ")}
                .
              </p>
            </div>
          )}
        </div>
      )}

      {/* 6. PUBLICATION DES ADMIS (DOUBLE VALIDATION, BASCULE LISTE ATTENTE, SMS/AFFICHAGE, RECOURS) */}
      {adminTab === "publication_admis" && (
        <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <label className="p-3 border border-slate-200 rounded flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={presidentSigned}
                onChange={(e) => setPresidentSigned(e.target.checked)}
              />
              <span className="font-semibold text-slate-900">
                1. Validation Président du Jury
              </span>
            </label>

            <label className="p-3 border border-slate-200 rounded flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={cedocDirectorSigned}
                onChange={(e) => setCedocDirectorSigned(e.target.checked)}
              />
              <span className="font-semibold text-slate-900">
                2. Validation Directeur du CEDoc
              </span>
            </label>

            <div className="p-3 border border-slate-200 rounded flex items-center justify-between gap-2 bg-slate-50">
              <div>
                <span className="text-slate-600">Quota Liste Principale : </span>
                <select
                  value={principalQuota}
                  onChange={(e) => setPrincipalQuota(Number(e.target.value))}
                  className="font-mono border border-slate-300 rounded px-1.5 py-0.5 bg-white"
                >
                  <option value={1}>1</option>
                  <option value={2}>2</option>
                </select>
              </div>
              <button
                disabled={!presidentSigned || !cedocDirectorSigned}
                onClick={() =>
                  setPubBroadcastNotice(
                    "Liste publiée : notifications E-mail/SMS envoyées avec délai de confirmation + fiche officielle générée pour affichage au secrétariat."
                  )
                }
                className="px-3 py-1 bg-slate-900 text-white font-semibold rounded disabled:opacity-40"
              >
                Publier & Notifier
              </button>
            </div>
          </div>

          {pubBroadcastNotice && (
            <div className="p-2.5 bg-emerald-950 text-white rounded">
              {pubBroadcastNotice}
            </div>
          )}

          <div className="overflow-x-auto border border-slate-200 rounded">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <th className="py-2 px-3">Candidat</th>
                  <th className="py-2 px-3 text-right">Total</th>
                  <th className="py-2 px-3">Affectation (Bascule auto)</th>
                  <th className="py-2 px-3">Confirmation / Désistement</th>
                  <th className="py-2 px-3">Recours déposé</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {juryApps.map((app) => {
                  const total =
                    app.dossierScore + app.projectScore + app.interviewScore;
                  return (
                    <tr key={app.id}>
                      <td className="py-2 px-3 font-semibold text-slate-900">
                        {app.fullName}
                      </td>
                      <td className="py-2 px-3 text-right font-mono tabular-nums">
                        {total} / 100
                      </td>
                      <td className="py-2 px-3 font-semibold">
                        {app.attendanceStatus === "desiste" ? (
                          <span className="text-slate-400 line-through">Désisté</span>
                        ) : mainIds.has(app.id) ? (
                          <span className="text-emerald-800">Liste Principale</span>
                        ) : waitIds.has(app.id) ? (
                          <span className="text-amber-800">Liste d'Attente</span>
                        ) : (
                          <span className="text-slate-500">Non retenu</span>
                        )}
                      </td>
                      <td className="py-2 px-3">
                        <button
                          onClick={() =>
                            onUpdateCandidate({
                              ...app,
                              attendanceStatus:
                                app.attendanceStatus === "desiste"
                                  ? "en_attente"
                                  : "desiste",
                            })
                          }
                          className="px-2 py-0.5 border border-slate-300 rounded text-slate-700 hover:bg-slate-100"
                        >
                          {app.attendanceStatus === "desiste"
                            ? "Rétablir"
                            : "Enregistrer désistement"}
                        </button>
                      </td>
                      <td className="py-2 px-3 text-slate-600">
                        {app.recoursText || "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 7. CIRCUIT NUMÉRIQUE DE RÉINSCRIPTION DES DOCTORANTS (2A, 3A, DÉROGATION 4A+) */}
      {adminTab === "circuit_reinscription" && (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                <th className="py-2.5 px-3">Doctorant & Année</th>
                <th className="py-2.5 px-3">Pièces mises à jour (Socle reconduit)</th>
                <th className="py-2.5 px-3">Avis Directeur Thèse</th>
                <th className="py-2.5 px-3">Avis Laboratoire</th>
                <th className="py-2.5 px-3 text-right">Validation CEDoc / Dérogation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 align-top">
              {reenrollments.map((r) => (
                <tr key={r.id}>
                  <td className="py-2.5 px-3">
                    <div className="font-semibold text-slate-900">
                      {r.doctorantName} ({r.year}e année)
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {r.matricule} · {r.thesisDirector}
                    </div>
                    {r.derogationNote && (
                      <div className="text-[11px] text-amber-800 mt-0.5">
                        Dérogation : {r.derogationNote}
                      </div>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-slate-700">
                    {r.updatedPieces.join(" · ")}
                  </td>
                  <td className="py-2.5 px-3">
                    {r.directorAvis === "favorable" ? (
                      <span className="text-emerald-800 font-semibold">Favorable</span>
                    ) : (
                      <button
                        onClick={() =>
                          onUpdateReenrollment({ ...r, directorAvis: "favorable" })
                        }
                        className="px-2 py-1 bg-slate-900 text-white rounded"
                      >
                        Valider (Dir. Thèse)
                      </button>
                    )}
                  </td>
                  <td className="py-2.5 px-3">
                    {r.labDirectorAvis === "favorable" ? (
                      <span className="text-emerald-800 font-semibold">Favorable</span>
                    ) : (
                      <button
                        disabled={r.directorAvis !== "favorable"}
                        onClick={() =>
                          onUpdateReenrollment({ ...r, labDirectorAvis: "favorable" })
                        }
                        className="px-2 py-1 bg-slate-900 text-white rounded disabled:opacity-40"
                      >
                        Valider (Dir. Labo)
                      </button>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-right space-x-1.5">
                    {r.cedocState === "valide" ? (
                      <span className="text-emerald-800 font-semibold">Réinscrit</span>
                    ) : (
                      <>
                        <button
                          disabled={r.labDirectorAvis !== "favorable"}
                          onClick={() =>
                            onUpdateReenrollment({
                              ...r,
                              cedocState: "valide",
                              blockMotif: undefined,
                            })
                          }
                          className="px-2.5 py-1 bg-emerald-700 text-white rounded font-semibold disabled:opacity-40"
                        >
                          {r.year >= 4 ? "Accorder dérogation & Valider" : "Valider CEDoc"}
                        </button>
                        <button
                          onClick={() =>
                            onUpdateReenrollment({
                              ...r,
                              cedocState: "bloque",
                              blockMotif: "Pièce annuelle complémentaire attendue.",
                            })
                          }
                          className="px-2 py-1 bg-red-50 text-red-800 border border-red-200 rounded"
                        >
                          Bloquer
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal de déverrouillage exceptionnel sous accord du Directeur du Laboratoire */}
      {unlockTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!labAccord || !unlockMotif.trim()) return;
              onUpdateCandidate({
                ...unlockTarget,
                juryLocked: false,
                unlockReason: unlockMotif.trim(),
              });
              setUnlockTarget(null);
              setUnlockMotif("");
              setLabAccord(false);
            }}
            className="bg-white border border-slate-200 rounded-lg max-w-md w-full p-4 space-y-3"
          >
            <div className="font-bold text-slate-900">
              Rectification de note verrouillée — {unlockTarget.fullName}
            </div>
            <input
              type="text"
              required
              value={unlockMotif}
              onChange={(e) => setUnlockMotif(e.target.value)}
              placeholder="Motif obligatoire de la correction..."
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded"
            />
            <label className="flex items-center gap-2 text-slate-800 cursor-pointer">
              <input
                type="checkbox"
                required
                checked={labAccord}
                onChange={(e) => setLabAccord(e.target.checked)}
              />
              <span>Accord formel du Directeur du Laboratoire</span>
            </label>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setUnlockTarget(null)}
                className="px-3 py-1 text-slate-600"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="px-3 py-1 bg-slate-900 text-white font-semibold rounded"
              >
                Déverrouiller
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
