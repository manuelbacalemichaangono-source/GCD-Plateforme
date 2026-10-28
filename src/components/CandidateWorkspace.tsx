import React, { useState, useMemo } from "react";
import {
  ThesisSubject,
  CandidateApplication,
  ReenrollmentRecord,
  RequiredDocSlot,
  DepositedPiece,
} from "../types/cedoc";
import { ALL_DOC_SLOTS, DOC_SLOT_LABELS } from "../data/cedocData";
import {
  ActiveFacetFilters,
  computeFacetedSubjects,
} from "../utils/facetedSubjectSearch";
import { X, RotateCcw } from "lucide-react";

interface CandidateWorkspaceProps {
  subjects: ThesisSubject[];
  candidates: CandidateApplication[];
  onCreateApplication: (app: CandidateApplication) => void;
  onUpdateApplication: (app: CandidateApplication) => void;
  reenrollments: ReenrollmentRecord[];
  onUpdateReenrollment: (rec: ReenrollmentRecord) => void;
  officialResultsPublished: boolean;
  principalQuota: number;
}

type FacetField = "laboratory" | "discipline" | "thesisDirector" | "language";

const EMPTY_FACETS: ActiveFacetFilters = {
  keywords: "",
  laboratory: null,
  discipline: null,
  thesisDirector: null,
  language: null,
};

export const CandidateWorkspace: React.FC<CandidateWorkspaceProps> = ({
  subjects,
  candidates,
  onCreateApplication,
  onUpdateApplication,
  reenrollments,
  onUpdateReenrollment,
  officialResultsPublished,
  principalQuota,
}) => {
  const [subView, setSubView] = useState<
    "recherche_sujets" | "candidature" | "resultats_recours" | "reinscription"
  >("recherche_sujets");

  // 1. État des filtres explicites choisis par le visiteur (sans compte)
  const [userFacets, setUserFacets] = useState<ActiveFacetFilters>(EMPTY_FACETS);
  const [compareIds, setCompareIds] = useState<string[]>([]);

  // Calcul des pré-sélections automatiques lorsqu'il ne reste qu'une seule option possible (> 0 résultat)
  const { effectiveFilters, autoLockedFields, searchOutput } = useMemo(() => {
    const current: ActiveFacetFilters = { ...userFacets };
    const autoLocked = new Set<FacetField>();

    const hasAnyUserConstraint = Boolean(
      userFacets.keywords.trim() ||
        userFacets.laboratory ||
        userFacets.discipline ||
        userFacets.thesisDirector ||
        userFacets.language
    );

    if (hasAnyUserConstraint) {
      let stabilized = false;
      while (!stabilized) {
        stabilized = true;
        const probe = computeFacetedSubjects(subjects, current);
        const fields: FacetField[] = [
          "laboratory",
          "discipline",
          "thesisDirector",
          "language",
        ];
        for (const f of fields) {
          if (current[f] === null && probe.facetOptions[f].length === 1) {
            current[f] = probe.facetOptions[f][0].value;
            autoLocked.add(f);
            stabilized = false;
          }
        }
      }
    }

    const finalOutput = computeFacetedSubjects(subjects, current);
    return {
      effectiveFilters: current,
      autoLockedFields: autoLocked,
      searchOutput: finalOutput,
    };
  }, [subjects, userFacets]);

  const handleUpdateFacet = (field: keyof ActiveFacetFilters, val: string | null) => {
    setUserFacets((prev) => {
      const next: ActiveFacetFilters = {
        ...prev,
        [field]: val === "" ? null : val,
      };
      // Vérifie que les autres filtres précédemment sélectionnés restent compatibles ; sinon libère ceux devenus impossibles
      const check = computeFacetedSubjects(subjects, next);
      if (check.matchedSubjects.length === 0 && field !== "keywords" && val !== null) {
        const otherFields: FacetField[] = [
          "laboratory",
          "discipline",
          "thesisDirector",
          "language",
        ];
        for (const f of otherFields) {
          if (f !== field) next[f] = null;
        }
      }
      return next;
    });
  };

  const handleRemoveSingleFilter = (field: keyof ActiveFacetFilters) => {
    setUserFacets((prev) => {
      // Si l'utilisateur retire une facette auto-présélectionnée ou liée, on retire sa contrainte source ou la facette elle-même
      if (field === "keywords") {
        return { ...prev, keywords: "" };
      }
      if (prev[field] !== null) {
        return { ...prev, [field]: null };
      }
      // Si cette facette était auto-déduite d'une autre facette unique, réinitialiser les facettes dépendantes
      return EMPTY_FACETS;
    });
  };

  const handleResetAllFilters = () => {
    setUserFacets(EMPTY_FACETS);
  };

  const toggleCompareSubject = (id: string) => {
    setCompareIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((x) => x !== id);
      }
      if (prev.length >= 3) {
        return prev; // Limité de 2 à 3 sujets simultanés
      }
      return [...prev, id];
    });
  };

  const comparedSubjects = subjects.filter(
    (s) => s.status === "publie" && compareIds.includes(s.id)
  );

  // 2. Candidature (Création du compte uniquement au moment de postuler)
  const [chosenSubject, setChosenSubject] = useState<ThesisSubject | null>(null);
  const [candName, setCandName] = useState("");
  const [candCin, setCandCin] = useState("");
  const [candEmail, setCandEmail] = useState("");
  const [candCne, setCandCne] = useState("N138492011");
  const [originMode, setOriginMode] = useState<
    "INTERNE_USMBA" | "API_EXTERNE" | "DEPOT_MANUEL" | "DEPOT_PHYSIQUE"
  >("INTERNE_USMBA");
  const [externalUniName, setExternalUniName] = useState(
    "Université Mohammed V de Rabat"
  );
  const [apiConsent, setApiConsent] = useState(false);
  const [retrievedSummary, setRetrievedSummary] = useState<any | null>(null);
  const [apiFeedback, setApiFeedback] = useState<string | null>(null);
  const [manualSlots, setManualSlots] = useState<Record<RequiredDocSlot, string>>({
    CIN: "",
    DIPLOME_BAC5: "",
    RELEVES_NOTES: "",
    PROJET_THESE: "",
    CV: "",
  });
  const [submittedDossier, setSubmittedDossier] =
    useState<CandidateApplication | null>(null);

  // 3. Résultats & Recours
  const [recoursDossierId, setRecoursDossierId] = useState("");
  const [recoursMotif, setRecoursMotif] = useState("");

  // 4. Réinscription Doctorant
  const [selectedDoctorantId, setSelectedDoctorantId] = useState(
    reenrollments[0]?.id || ""
  );
  const [newPieceInput, setNewPieceInput] = useState("");

  const handleSelectSubjectForApplication = (subject: ThesisSubject) => {
    setChosenSubject(subject);
    setSubmittedDossier(null);
    setSubView("candidature");
  };

  const handleRetrieveAcademicDocs = async () => {
    setApiFeedback(null);
    setRetrievedSummary(null);
    try {
      const resp = await fetch("/api/inter-university-lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cneOrId: candCne,
          sourceUniversity:
            originMode === "INTERNE_USMBA" ? "INTERNE_USMBA" : externalUniName,
          consentGranted: originMode === "INTERNE_USMBA" ? true : apiConsent,
        }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        setApiFeedback(data.error);
      } else {
        setRetrievedSummary(data.record);
        if (!candName) setCandName(data.record.studentName);
        if (!candCin) setCandCin(data.record.cin);
      }
    } catch {
      setApiFeedback("Service distant indisponible. Utilisez le dépôt manuel.");
    }
  };

  const handleSubmitApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chosenSubject) return;

    const pieces: DepositedPiece[] = [];

    if (
      (originMode === "INTERNE_USMBA" || originMode === "API_EXTERNE") &&
      retrievedSummary
    ) {
      const srcLabel =
        originMode === "INTERNE_USMBA"
          ? "Base Interne USMBA"
          : "API Inter-Universitaire";
      pieces.push(
        {
          slot: "CIN",
          source: srcLabel,
          summaryText: `CIN ${candCin} certifiée (${candName}).`,
          aiState: "conforme",
          aiMotif: "Identité certifiée par source académique.",
          humanState: "valide",
        },
        {
          slot: "DIPLOME_BAC5",
          source: srcLabel,
          summaryText: `${retrievedSummary.diploma} (${retrievedSummary.year}).`,
          aiState: "conforme",
          aiMotif: "Diplôme récupéré directement sans redemande.",
          humanState: "valide",
        },
        {
          slot: "RELEVES_NOTES",
          source: srcLabel,
          summaryText: "Relevés universitaires synchronisés.",
          aiState: "conforme",
          aiMotif: "Relevés certifiés conformes.",
          humanState: "valide",
        }
      );
    }

    for (const slot of ALL_DOC_SLOTS) {
      if (pieces.some((p) => p.slot === slot)) continue;
      const val = manualSlots[slot]?.trim();
      if (val) {
        let aiState: "conforme" | "douteux" | "non_conforme" = "conforme";
        let aiMotif = "Pièce déposée lisible et cohérente.";
        try {
          const r = await fetch("/api/verify-document", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              candidateName: candName,
              candidateCin: candCin,
              docType: DOC_SLOT_LABELS[slot],
              extractedTextSample: val,
            }),
          });
          if (r.ok) {
            const d = await r.json();
            if (d.status) aiState = d.status;
            if (d.motif) aiMotif = d.motif;
          }
        } catch {
          // fallback silencieux
        }
        pieces.push({
          slot,
          source: "Dépôt Manuel",
          summaryText: val,
          aiState,
          aiMotif,
          humanState: "en_attente",
        });
      }
    }

    const isComplete = ALL_DOC_SLOTS.every((s) =>
      pieces.some((p) => p.slot === s)
    );

    const newApp: CandidateApplication = {
      id: `c-${Date.now()}`,
      dossierCode: `DOS-2026-0${candidates.length + 1}`,
      fullName: candName,
      cin: candCin.toUpperCase(),
      studentIdCne: candCne.toUpperCase(),
      email: candEmail,
      subjectCode: chosenSubject.code,
      channel: originMode === "DEPOT_PHYSIQUE" ? "Dépôt physique" : "En ligne",
      receiptNumber:
        originMode === "DEPOT_PHYSIQUE"
          ? `GUICHET-${Math.floor(100 + Math.random() * 900)}`
          : undefined,
      pieces,
      deadline: "2026-11-08",
      adminStatus: isComplete ? "complet_forme" : "en_cours",
      dossierScore: 0,
      projectScore: 0,
      interviewScore: 0,
      juryLocked: false,
      attendanceStatus: "en_attente",
    };

    onCreateApplication(newApp);
    setSubmittedDossier(newApp);
  };

  // Liste des filtres actifs à afficher sous forme d'étiquettes amovibles avec "x"
  const activeFilterTags: {
    key: keyof ActiveFacetFilters;
    label: string;
    value: string;
    isAuto: boolean;
  }[] = [];

  if (effectiveFilters.keywords.trim()) {
    activeFilterTags.push({
      key: "keywords",
      label: "Mots-clés",
      value: effectiveFilters.keywords.trim(),
      isAuto: false,
    });
  }
  if (effectiveFilters.laboratory) {
    activeFilterTags.push({
      key: "laboratory",
      label: "Laboratoire",
      value: effectiveFilters.laboratory,
      isAuto: autoLockedFields.has("laboratory"),
    });
  }
  if (effectiveFilters.discipline) {
    activeFilterTags.push({
      key: "discipline",
      label: "Discipline",
      value: effectiveFilters.discipline,
      isAuto: autoLockedFields.has("discipline"),
    });
  }
  if (effectiveFilters.thesisDirector) {
    activeFilterTags.push({
      key: "thesisDirector",
      label: "Directeur",
      value: effectiveFilters.thesisDirector,
      isAuto: autoLockedFields.has("thesisDirector"),
    });
  }
  if (effectiveFilters.language) {
    activeFilterTags.push({
      key: "language",
      label: "Langue",
      value: effectiveFilters.language,
      isAuto: autoLockedFields.has("language"),
    });
  }

  // Classement pour l'affichage des admis
  const rankedSubjectApps = [...candidates]
    .filter((c) => c.subjectCode === "CEDOC-IA-01" && c.adminStatus !== "non_admis")
    .sort(
      (a, b) =>
        b.dossierScore +
        b.projectScore +
        b.interviewScore -
        (a.dossierScore + a.projectScore + a.interviewScore)
    );

  const eligibleApps = rankedSubjectApps.filter(
    (c) =>
      c.dossierScore + c.projectScore + c.interviewScore >= 60 &&
      c.attendanceStatus !== "desiste"
  );
  const principalIds = new Set(
    eligibleApps.slice(0, principalQuota).map((c) => c.id)
  );
  const waitingIds = new Set(eligibleApps.slice(principalQuota).map((c) => c.id));

  const activeDoctorant = reenrollments.find((r) => r.id === selectedDoctorantId);

  return (
    <div className="space-y-4">
      {/* Sous-navigation sobre */}
      <div className="flex flex-wrap items-center gap-1 border-b border-slate-200 pb-2 text-xs">
        <button
          onClick={() => setSubView("recherche_sujets")}
          className={`px-3 py-1.5 rounded font-medium transition-colors ${
            subView === "recherche_sujets"
              ? "bg-slate-900 text-white"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          Recherche de sujets
        </button>
        <button
          onClick={() => setSubView("candidature")}
          className={`px-3 py-1.5 rounded font-medium transition-colors ${
            subView === "candidature"
              ? "bg-slate-900 text-white"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          Dépôt de candidature
        </button>
        <button
          onClick={() => setSubView("resultats_recours")}
          className={`px-3 py-1.5 rounded font-medium transition-colors ${
            subView === "resultats_recours"
              ? "bg-slate-900 text-white"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          Résultats & Recours
        </button>
        <button
          onClick={() => setSubView("reinscription")}
          className={`px-3 py-1.5 rounded font-medium transition-colors ${
            subView === "reinscription"
              ? "bg-slate-900 text-white"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          Réinscription Doctorant
        </button>
      </div>

      {/* VUE 1 : VISITEUR (SANS COMPTE) — RECHERCHE DE SUJETS EN CASCADE BIDIRECTIONNELLE INSTANTANÉE */}
      {subView === "recherche_sujets" && (
        <div className="space-y-4">
          {/* Barre de filtres en cascade bidirectionnelle (sans bouton Rechercher) */}
          <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-2.5 text-xs">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  Mots-clés
                </label>
                <input
                  type="text"
                  value={userFacets.keywords}
                  onChange={(e) => handleUpdateFacet("keywords", e.target.value)}
                  placeholder="IA, solaire, FPGA, génomique..."
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white text-slate-900 focus:outline-none focus:border-slate-900"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  Laboratoire
                </label>
                <select
                  value={effectiveFilters.laboratory || ""}
                  onChange={(e) =>
                    handleUpdateFacet("laboratory", e.target.value || null)
                  }
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white text-slate-900 focus:outline-none focus:border-slate-900"
                >
                  {searchOutput.facetOptions.laboratory.length !== 1 && (
                    <option value="">
                      Tous les laboratoires ({searchOutput.matchedSubjects.length})
                    </option>
                  )}
                  {searchOutput.facetOptions.laboratory.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.value} ({opt.count})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  Discipline / Thématique
                </label>
                <select
                  value={effectiveFilters.discipline || ""}
                  onChange={(e) =>
                    handleUpdateFacet("discipline", e.target.value || null)
                  }
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white text-slate-900 focus:outline-none focus:border-slate-900"
                >
                  {searchOutput.facetOptions.discipline.length !== 1 && (
                    <option value="">
                      Toutes les disciplines ({searchOutput.matchedSubjects.length})
                    </option>
                  )}
                  {searchOutput.facetOptions.discipline.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.value} ({opt.count})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  Directeur de thèse
                </label>
                <select
                  value={effectiveFilters.thesisDirector || ""}
                  onChange={(e) =>
                    handleUpdateFacet("thesisDirector", e.target.value || null)
                  }
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white text-slate-900 focus:outline-none focus:border-slate-900"
                >
                  {searchOutput.facetOptions.thesisDirector.length !== 1 && (
                    <option value="">
                      Tous les directeurs ({searchOutput.matchedSubjects.length})
                    </option>
                  )}
                  {searchOutput.facetOptions.thesisDirector.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.value} ({opt.count})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  Langue
                </label>
                <select
                  value={effectiveFilters.language || ""}
                  onChange={(e) =>
                    handleUpdateFacet("language", e.target.value || null)
                  }
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white text-slate-900 focus:outline-none focus:border-slate-900"
                >
                  {searchOutput.facetOptions.language.length !== 1 && (
                    <option value="">
                      Toutes les langues ({searchOutput.matchedSubjects.length})
                    </option>
                  )}
                  {searchOutput.facetOptions.language.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.value} ({opt.count})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Étiquettes de filtres actifs avec bouton "x" individuel + bouton "Réinitialiser les filtres" */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="font-semibold text-slate-800 tabular-nums mr-1">
                  {searchOutput.matchedSubjects.length} sujet
                  {searchOutput.matchedSubjects.length > 1 ? "s" : ""} disponible
                  {searchOutput.matchedSubjects.length > 1 ? "s" : ""}
                </span>

                {activeFilterTags.map((tag) => (
                  <button
                    key={tag.key}
                    type="button"
                    onClick={() => handleRemoveSingleFilter(tag.key)}
                    title="Retirer ce filtre"
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded text-xs transition-colors"
                  >
                    <span className="text-slate-500">{tag.label} :</span>
                    <span className="font-medium truncate max-w-[200px]">
                      {tag.value}
                    </span>
                    <X className="w-3 h-3 text-slate-500 shrink-0" />
                  </button>
                ))}
              </div>

              {activeFilterTags.length > 0 && (
                <button
                  type="button"
                  onClick={handleResetAllFilters}
                  className="inline-flex items-center gap-1 text-xs font-medium text-slate-700 hover:text-slate-950 underline shrink-0"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Réinitialiser les filtres</span>
                </button>
              )}
            </div>
          </div>

          {/* Vue comparative côte à côte lorsque 2 à 3 sujets sont cochés */}
          {comparedSubjects.length >= 2 && (
            <div className="bg-white border border-slate-900 rounded-lg overflow-hidden">
              <div className="px-4 py-2.5 bg-slate-900 text-white flex items-center justify-between text-xs">
                <span className="font-semibold tabular-nums">
                  Comparaison côte à côte ({comparedSubjects.length} / 3 sujets)
                </span>
                <button
                  type="button"
                  onClick={() => setCompareIds([])}
                  className="text-slate-300 hover:text-white inline-flex items-center gap-1"
                >
                  <X className="w-3.5 h-3.5" /> Fermer la comparaison
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs min-w-[680px]">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="py-2.5 px-3 w-36 text-slate-600 font-semibold">
                        Critère
                      </th>
                      {comparedSubjects.map((s) => (
                        <th
                          key={s.id}
                          className="py-2.5 px-3 font-semibold text-slate-900 align-top"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span>{s.title}</span>
                            <button
                              type="button"
                              onClick={() => toggleCompareSubject(s.id)}
                              className="text-slate-400 hover:text-slate-800 shrink-0"
                              title="Retirer de la comparaison"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 align-top">
                    <tr>
                      <td className="py-2 px-3 text-slate-500 bg-slate-50/50">
                        Laboratoire
                      </td>
                      {comparedSubjects.map((s) => (
                        <td key={s.id} className="py-2 px-3 text-slate-800">
                          {s.laboratory}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="py-2 px-3 text-slate-500 bg-slate-50/50">
                        Directeur de thèse
                      </td>
                      {comparedSubjects.map((s) => (
                        <td key={s.id} className="py-2 px-3 font-medium text-slate-900">
                          {s.thesisDirector}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="py-2 px-3 text-slate-500 bg-slate-50/50">
                        Discipline
                      </td>
                      {comparedSubjects.map((s) => (
                        <td key={s.id} className="py-2 px-3 text-slate-800">
                          {s.discipline}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="py-2 px-3 text-slate-500 bg-slate-50/50">
                        Langue
                      </td>
                      {comparedSubjects.map((s) => (
                        <td key={s.id} className="py-2 px-3 text-slate-800">
                          {s.language}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="py-2 px-3 text-slate-500 bg-slate-50/50">
                        Prérequis
                      </td>
                      {comparedSubjects.map((s) => (
                        <td key={s.id} className="py-2 px-3 text-slate-600">
                          {s.prerequisites}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="py-2 px-3 text-slate-500 bg-slate-50/50">
                        Action
                      </td>
                      {comparedSubjects.map((s) => (
                        <td key={s.id} className="py-2 px-3">
                          <button
                            type="button"
                            onClick={() => handleSelectSubjectForApplication(s)}
                            className="px-3 py-1.5 text-xs font-semibold bg-slate-900 text-white rounded hover:bg-slate-800"
                          >
                            Candidater
                          </button>
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {compareIds.length === 1 && (
            <div className="px-3.5 py-2 bg-slate-100 border border-slate-200 rounded text-xs text-slate-700 flex items-center justify-between">
              <span>
                1 sujet sélectionné pour comparaison — cochez un 2e ou 3e sujet pour afficher le comparatif côte à côte.
              </span>
              <button
                type="button"
                onClick={() => setCompareIds([])}
                className="text-slate-600 hover:text-slate-900 underline"
              >
                Annuler
              </button>
            </div>
          )}

          {/* Résultats sous forme de cartes denses ou message clair d'absence de résultat */}
          {searchOutput.matchedSubjects.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-lg p-8 text-center space-y-2.5 text-xs">
              <div className="font-semibold text-slate-900 text-sm">
                Aucun sujet publié ne correspond à votre recherche actuelle.
              </div>
              <p className="text-slate-600 max-w-md mx-auto">
                Essayez de modifier vos mots-clés ou retirez l'un des filtres actifs ci-dessus pour élargir les sujets disponibles.
              </p>
              <div className="pt-1">
                <button
                  type="button"
                  onClick={handleResetAllFilters}
                  className="px-3.5 py-1.5 font-semibold bg-slate-900 text-white rounded hover:bg-slate-800"
                >
                  Réinitialiser les filtres
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {searchOutput.matchedSubjects.map((s) => {
                const isCompared = compareIds.includes(s.id);
                const disableCompareCheckbox =
                  !isCompared && compareIds.length >= 3;

                return (
                  <article
                    key={s.id}
                    className={`bg-white border rounded-lg p-4 flex flex-col justify-between gap-3 transition-colors ${
                      isCompared
                        ? "border-slate-900"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <div className="space-y-2">
                      {/* Métadonnées sobres non-encapsulées : discipline · langue */}
                      <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
                        <span className="font-mono text-slate-700">{s.code}</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-medium text-slate-700">
                          {s.discipline}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{s.language}</span>
                      </div>

                      <h3 className="text-sm font-bold text-slate-900 leading-snug">
                        {s.title}
                      </h3>

                      <div className="space-y-0.5 text-xs text-slate-600 pt-0.5">
                        <div>
                          <span className="text-slate-500">Laboratoire : </span>
                          <span className="text-slate-800 font-medium">
                            {s.laboratory}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500">Directeur : </span>
                          <span className="text-slate-900 font-semibold">
                            {s.thesisDirector}
                          </span>
                        </div>
                      </div>

                      <p className="text-[11px] text-slate-500 leading-relaxed pt-1 border-t border-slate-100">
                        {s.prerequisites}
                      </p>
                    </div>

                    <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
                      <label
                        className={`inline-flex items-center gap-1.5 select-none ${
                          disableCompareCheckbox
                            ? "opacity-40 cursor-not-allowed"
                            : "cursor-pointer text-slate-700 hover:text-slate-950"
                        }`}
                        title={
                          disableCompareCheckbox
                            ? "Maximum 3 sujets comparables simultanément"
                            : "Sélectionner pour comparer (2 à 3 sujets)"
                        }
                      >
                        <input
                          type="checkbox"
                          checked={isCompared}
                          disabled={disableCompareCheckbox}
                          onChange={() => toggleCompareSubject(s.id)}
                          className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                        />
                        <span className="font-medium">Comparer</span>
                      </label>

                      <button
                        type="button"
                        onClick={() => handleSelectSubjectForApplication(s)}
                        className="px-3 py-1.5 text-xs font-semibold bg-slate-900 text-white rounded hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
                      >
                        Candidater
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* VUE 2 : CANDIDATURE (CRÉATION DU COMPTE AU DÉPÔT + RÉCUPÉRATION ID/API + DÉPÔT PHYSIQUE) */}
      {subView === "candidature" && (
        <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-5 text-xs">
          {!chosenSubject ? (
            <div className="py-6 text-center text-slate-500 space-y-2">
              <p>
                Choisissez un sujet dans « Recherche de sujets » et cliquez sur « Candidater » pour créer votre compte uniquement au moment du dépôt.
              </p>
              <button
                onClick={() => setSubView("recherche_sujets")}
                className="px-3 py-1.5 font-semibold bg-slate-900 text-white rounded"
              >
                Voir les sujets
              </button>
            </div>
          ) : submittedDossier ? (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded space-y-2">
              <div className="font-bold text-slate-900 text-sm">
                Candidature enregistrée — Dossier {submittedDossier.dossierCode}
              </div>
              <div className="text-slate-700">
                Sujet : <strong>{submittedDossier.subjectCode}</strong> · Candidat :{" "}
                <strong>{submittedDossier.fullName}</strong> · Canal :{" "}
                {submittedDossier.channel}
                {submittedDossier.receiptNumber
                  ? ` (Récépissé ${submittedDossier.receiptNumber})`
                  : ""}
              </div>
              <div className="text-slate-600">
                Pièces versées aux espaces de dépôt :{" "}
                {submittedDossier.pieces.length} / {ALL_DOC_SLOTS.length}.
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmitApplication} className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200">
                <div>
                  <span className="text-slate-500">Sujet retenu : </span>
                  <strong className="text-slate-900">
                    {chosenSubject.code} — {chosenSubject.title}
                  </strong>{" "}
                  ({chosenSubject.thesisDirector})
                </div>
                <button
                  type="button"
                  onClick={() => setSubView("recherche_sujets")}
                  className="text-slate-600 hover:text-slate-900 underline"
                >
                  Changer de sujet
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Nom et Prénom
                  </label>
                  <input
                    type="text"
                    required
                    value={candName}
                    onChange={(e) => setCandName(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    N° CIN
                  </label>
                  <input
                    type="text"
                    required
                    value={candCin}
                    onChange={(e) => setCandCin(e.target.value)}
                    className="w-full px-2.5 py-1.5 font-mono border border-slate-300 rounded"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Identifiant Étudiant (CNE / ID)
                  </label>
                  <input
                    type="text"
                    required
                    value={candCne}
                    onChange={(e) => setCandCne(e.target.value)}
                    className="w-full px-2.5 py-1.5 font-mono border border-slate-300 rounded"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    E-mail ou Contact
                  </label>
                  <input
                    type="text"
                    required
                    value={candEmail}
                    onChange={(e) => setCandEmail(e.target.value)}
                    placeholder="email@domaine.ma ou Téléphone"
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded"
                  />
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded space-y-3">
                <div className="font-semibold text-slate-900">
                  Mode de fourniture des diplômes et relevés
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setOriginMode("INTERNE_USMBA")}
                    className={`px-2.5 py-1.5 rounded border font-medium ${
                      originMode === "INTERNE_USMBA"
                        ? "bg-slate-900 text-white border-slate-900"
                        : "bg-white text-slate-700 border-slate-300"
                    }`}
                  >
                    Ancien étudiant USMBA / EST Fès (Base interne)
                  </button>
                  <button
                    type="button"
                    onClick={() => setOriginMode("API_EXTERNE")}
                    className={`px-2.5 py-1.5 rounded border font-medium ${
                      originMode === "API_EXTERNE"
                        ? "bg-slate-900 text-white border-slate-900"
                        : "bg-white text-slate-700 border-slate-300"
                    }`}
                  >
                    Autre université (Récupération via API)
                  </button>
                  <button
                    type="button"
                    onClick={() => setOriginMode("DEPOT_MANUEL")}
                    className={`px-2.5 py-1.5 rounded border font-medium ${
                      originMode === "DEPOT_MANUEL"
                        ? "bg-slate-900 text-white border-slate-900"
                        : "bg-white text-slate-700 border-slate-300"
                    }`}
                  >
                    Repli : Dépôt manuel complet
                  </button>
                  <button
                    type="button"
                    onClick={() => setOriginMode("DEPOT_PHYSIQUE")}
                    className={`px-2.5 py-1.5 rounded border font-medium ${
                      originMode === "DEPOT_PHYSIQUE"
                        ? "bg-slate-900 text-white border-slate-900"
                        : "bg-white text-slate-700 border-slate-300"
                    }`}
                  >
                    Sans équipement / Dépôt physique au secrétariat
                  </button>
                </div>

                {originMode === "INTERNE_USMBA" && (
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                    <span className="text-slate-600">
                      Récupération directe depuis la base interne de l'université (aucun redépôt des relevés ou diplômes déjà détenus).
                    </span>
                    <button
                      type="button"
                      onClick={handleRetrieveAcademicDocs}
                      className="px-3 py-1.5 bg-slate-900 text-white font-semibold rounded"
                    >
                      Récupérer via Base Interne
                    </button>
                  </div>
                )}

                {originMode === "API_EXTERNE" && (
                  <div className="space-y-2 pt-1">
                    <div className="flex flex-wrap items-center gap-3">
                      <select
                        value={externalUniName}
                        onChange={(e) => setExternalUniName(e.target.value)}
                        className="px-2.5 py-1.5 bg-white border border-slate-300 rounded"
                      >
                        <option value="Université Mohammed V de Rabat">
                          Université Mohammed V de Rabat
                        </option>
                        <option value="Université Cadi Ayyad de Marrakech">
                          Université Cadi Ayyad de Marrakech
                        </option>
                        <option value="Université Hassan II de Casablanca">
                          Université Hassan II de Casablanca
                        </option>
                      </select>
                      <label className="inline-flex items-center gap-2 text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={apiConsent}
                          onChange={(e) => setApiConsent(e.target.checked)}
                        />
                        <span>
                          J'autorise explicitement la requête API vers mon université d'origine
                        </span>
                      </label>
                      <button
                        type="button"
                        onClick={handleRetrieveAcademicDocs}
                        className="px-3 py-1.5 bg-slate-900 text-white font-semibold rounded"
                      >
                        Interroger l'API
                      </button>
                    </div>
                  </div>
                )}

                {originMode === "DEPOT_PHYSIQUE" && (
                  <div className="text-slate-700">
                    Vous pouvez déposer vos pièces papier directement au guichet du secrétariat du CEDoc : vos documents y seront numérisés avec remise d'un accusé de réception.
                  </div>
                )}

                {apiFeedback && (
                  <div className="text-red-700 font-medium">{apiFeedback}</div>
                )}

                {retrievedSummary && (
                  <div className="p-2.5 bg-white border border-slate-200 rounded text-emerald-900">
                    Pièces récupérées automatiquement ({retrievedSummary.origin}) :{" "}
                    <strong>{retrievedSummary.retrievedDocs.join(", ")}</strong>.
                  </div>
                )}
              </div>

              {originMode !== "DEPOT_PHYSIQUE" && (
                <div className="space-y-2">
                  <div className="font-semibold text-slate-900">
                    Espaces de dépôt par type de document
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    {ALL_DOC_SLOTS.map((slot) => {
                      const autoFetched =
                        retrievedSummary &&
                        (originMode === "INTERNE_USMBA" ||
                          originMode === "API_EXTERNE") &&
                        (slot === "CIN" ||
                          slot === "DIPLOME_BAC5" ||
                          slot === "RELEVES_NOTES");

                      return (
                        <div
                          key={slot}
                          className="p-2.5 border border-slate-200 rounded flex flex-col gap-1"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-slate-800">
                              {DOC_SLOT_LABELS[slot]}
                            </span>
                            {autoFetched && (
                              <span className="text-emerald-800 font-semibold">
                                Récupéré automatiquement
                              </span>
                            )}
                          </div>
                          {!autoFetched && (
                            <input
                              type="text"
                              value={manualSlots[slot]}
                              onChange={(e) =>
                                setManualSlots((prev) => ({
                                  ...prev,
                                  [slot]: e.target.value,
                                }))
                              }
                              placeholder="Référence / contenu de la pièce déposée"
                              className="px-2 py-1 border border-slate-300 rounded text-xs"
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="px-4 py-2 font-semibold bg-slate-900 text-white rounded hover:bg-slate-800"
                >
                  Créer le compte & Transmettre la candidature
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* VUE 3 : RÉSULTATS D'ADMISSION & RECOURS */}
      {subView === "resultats_recours" && (
        <div className="space-y-4 text-xs">
          <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2.5">
              <div className="font-bold text-slate-900">
                Liste d'admission — Sujet CEDOC-IA-01
              </div>
              <div className="text-slate-600">
                {officialResultsPublished
                  ? "Validée par le Président du Jury et le Directeur du CEDoc"
                  : "En attente de la double validation (Président du Jury + Directeur du CEDoc)"}
              </div>
            </div>

            {!officialResultsPublished ? (
              <div className="py-6 text-center text-slate-500">
                La liste officielle n'est rendue publique qu'après double validation dans l'espace Gestionnaires & Présidents.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold">
                      <th className="py-2 px-3">Rang</th>
                      <th className="py-2 px-3">Dossier & Candidat</th>
                      <th className="py-2 px-3 text-right">Note (/100)</th>
                      <th className="py-2 px-3">Liste</th>
                      <th className="py-2 px-3 text-right">
                        Confirmation d'inscription
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {rankedSubjectApps.map((app, idx) => {
                      const total =
                        app.dossierScore + app.projectScore + app.interviewScore;
                      const isMain = principalIds.has(app.id);
                      const isWait = waitingIds.has(app.id);
                      return (
                        <tr key={app.id}>
                          <td className="py-2 px-3 font-mono tabular-nums">
                            #{idx + 1}
                          </td>
                          <td className="py-2 px-3 font-medium text-slate-900">
                            {app.fullName}{" "}
                            <span className="font-mono text-[11px] text-slate-500">
                              ({app.dossierCode})
                            </span>
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-semibold tabular-nums">
                            {total} / 100
                          </td>
                          <td className="py-2 px-3 font-semibold">
                            {app.attendanceStatus === "desiste" ? (
                              <span className="text-slate-400 line-through">
                                Désisté
                              </span>
                            ) : isMain ? (
                              <span className="text-emerald-800">
                                Liste Principale
                              </span>
                            ) : isWait ? (
                              <span className="text-amber-800">
                                Liste d'Attente
                              </span>
                            ) : (
                              <span className="text-slate-500">Non retenu</span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-right space-x-1.5">
                            {(isMain || app.attendanceStatus === "desiste") && (
                              <>
                                <button
                                  onClick={() =>
                                    onUpdateApplication({
                                      ...app,
                                      attendanceStatus: "confirme",
                                    })
                                  }
                                  className={`px-2 py-1 rounded border ${
                                    app.attendanceStatus === "confirme"
                                      ? "bg-emerald-700 text-white border-emerald-700"
                                      : "border-slate-300 text-slate-700"
                                  }`}
                                >
                                  Confirmer
                                </button>
                                <button
                                  onClick={() =>
                                    onUpdateApplication({
                                      ...app,
                                      attendanceStatus:
                                        app.attendanceStatus === "desiste"
                                          ? "en_attente"
                                          : "desiste",
                                    })
                                  }
                                  className={`px-2 py-1 rounded border ${
                                    app.attendanceStatus === "desiste"
                                      ? "bg-red-700 text-white border-red-700"
                                      : "border-slate-300 text-slate-700"
                                  }`}
                                >
                                  {app.attendanceStatus === "desiste"
                                    ? "Annuler désistement"
                                    : "Se désister"}
                                </button>
                              </>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              const target = candidates.find((c) => c.id === recoursDossierId);
              if (!target || !recoursMotif.trim()) return;
              onUpdateApplication({ ...target, recoursText: recoursMotif.trim() });
              setRecoursMotif("");
            }}
            className="bg-white border border-slate-200 rounded-lg p-4 flex flex-col sm:flex-row items-end gap-3"
          >
            <div className="w-full sm:w-64">
              <label className="block font-semibold text-slate-800 mb-1">
                Déposer un recours (Délai : 5 jours)
              </label>
              <select
                required
                value={recoursDossierId}
                onChange={(e) => setRecoursDossierId(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white"
              >
                <option value="">Sélectionner votre dossier...</option>
                {candidates.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.dossierCode} — {c.fullName}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1 w-full">
              <label className="block text-slate-600 mb-1">Motif du recours</label>
              <input
                type="text"
                required
                value={recoursMotif}
                onChange={(e) => setRecoursMotif(e.target.value)}
                placeholder="Exposer l'erreur matérielle constatée..."
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded"
              />
            </div>
            <button
              type="submit"
              className="px-3.5 py-1.5 font-semibold bg-slate-900 text-white rounded shrink-0"
            >
              Envoyer le recours
            </button>
          </form>
        </div>
      )}

      {/* VUE 4 : RÉINSCRIPTION DES DOCTORANTS */}
      {subView === "reinscription" && activeDoctorant && (
        <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-4 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
            <div className="flex items-center gap-2">
              <label className="font-semibold text-slate-700">
                Dossier doctorant :
              </label>
              <select
                value={selectedDoctorantId}
                onChange={(e) => setSelectedDoctorantId(e.target.value)}
                className="px-2.5 py-1 border border-slate-300 rounded bg-white font-medium"
              >
                {reenrollments.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.matricule} — {r.doctorantName} ({r.year}e année)
                  </option>
                ))}
              </select>
            </div>
            <div className="text-slate-600">
              Échéance :{" "}
              <span className="font-mono">{activeDoctorant.dueDate}</span> · État :{" "}
              <strong className="text-slate-900">
                {activeDoctorant.cedocState === "valide"
                  ? "Validé"
                  : activeDoctorant.cedocState === "bloque"
                  ? "Bloqué"
                  : "En attente"}
              </strong>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded space-y-1.5">
              <div className="font-semibold text-slate-900">
                Pièces reconduites automatiquement (aucun redépôt)
              </div>
              <ul className="space-y-1 text-slate-600">
                {activeDoctorant.renewedBaseDocs.map((d, i) => (
                  <li key={i}>— {d}</li>
                ))}
              </ul>
            </div>

            <div className="p-3 border border-slate-200 rounded space-y-2">
              <div className="font-semibold text-slate-900">
                Pièces mises à jour cette année (rapport d'avancement, travaux)
              </div>
              <ul className="space-y-1 text-slate-800">
                {activeDoctorant.updatedPieces.map((p, i) => (
                  <li key={i}>• {p}</li>
                ))}
              </ul>
              <div className="flex gap-2 pt-1">
                <input
                  type="text"
                  value={newPieceInput}
                  onChange={(e) => setNewPieceInput(e.target.value)}
                  placeholder="Ajouter un rapport ou pièce modifiée..."
                  className="flex-1 px-2 py-1 border border-slate-300 rounded"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!newPieceInput.trim()) return;
                    onUpdateReenrollment({
                      ...activeDoctorant,
                      updatedPieces: [
                        ...activeDoctorant.updatedPieces,
                        newPieceInput.trim(),
                      ],
                    });
                    setNewPieceInput("");
                  }}
                  className="px-3 py-1 bg-slate-900 text-white font-semibold rounded"
                >
                  Déposer
                </button>
              </div>
            </div>
          </div>

          {activeDoctorant.blockMotif && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-red-900">
              <strong>Motif de blocage / Règle de dérogation :</strong>{" "}
              {activeDoctorant.blockMotif}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
            <div className="p-2.5 border border-slate-200 rounded">
              <div className="text-slate-500">
                1. Avis Directeur de thèse ({activeDoctorant.thesisDirector})
              </div>
              <div className="font-semibold text-slate-900 mt-0.5">
                {activeDoctorant.directorAvis}
              </div>
            </div>
            <div className="p-2.5 border border-slate-200 rounded">
              <div className="text-slate-500">
                2. Avis Directeur du laboratoire
              </div>
              <div className="font-semibold text-slate-900 mt-0.5">
                {activeDoctorant.labDirectorAvis}
              </div>
            </div>
            <div className="p-2.5 border border-slate-200 rounded">
              <div className="text-slate-500">
                3. Validation Directeur du CEDoc
              </div>
              <div className="font-semibold text-slate-900 mt-0.5">
                {activeDoctorant.cedocState}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
