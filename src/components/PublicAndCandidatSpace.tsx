import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { SlidersHorizontal, X, RotateCcw } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import {
  ThesisSubject,
  CandidaturePublic,
  CandidatureSlot,
  CANDIDATURE_SLOT_LABELS,
  PublishedAdmittedItem,
  ROLE_ROUTES,
} from "../types/cedoc";
import {
  ActiveFacetFilters,
  FacetField,
  FacetOptionCount,
  computeFacetedSubjects,
  removeFacetConstraint,
} from "../utils/facetedSubjectSearch";

const EMPTY_FACETS: ActiveFacetFilters = {
  keywords: "",
  laboratory: null,
  discipline: null,
  thesisDirector: null,
  language: null,
};

interface PublicAndCandidatSpaceProps {
  mode: "public" | "candidat";
}

export const PublicAndCandidatSpace: React.FC<PublicAndCandidatSpaceProps> = ({
  mode,
}) => {
  const {
    user,
    apiFetch,
    login,
    loginWithGoogle,
    registerCandidat,
    pendingVerification,
    confirmEmailVerification,
    resendVerificationEmail,
    clearPendingVerification,
  } = useAuth();
  const navigate = useNavigate();

  const [subjects, setSubjects] = useState<ThesisSubject[]>([]);
  const [userFacets, setUserFacets] = useState<ActiveFacetFilters>(EMPTY_FACETS);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);

  // État candidature (uniquement pour le candidat authentifié)
  const [candidature, setCandidature] = useState<CandidaturePublic | null>(null);
  const [uploadingSlot, setUploadingSlot] = useState<CandidatureSlot | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Synchronisation CNE / Base interne EST Fès ou API partenaire
  const [syncCne, setSyncCne] = useState("");
  const [syncOrigin, setSyncOrigin] = useState("EST Fès / USMBA");
  const [syncLoading, setSyncLoading] = useState(false);

  // Recours si Non admis
  const [recoursOpen, setRecoursOpen] = useState(false);
  const [recoursText, setRecoursText] = useState("");
  const [recoursSubmitting, setRecoursSubmitting] = useState(false);

  // Liste officielle des admis
  const [admisPublished, setAdmisPublished] = useState(false);
  const [admisList, setAdmisList] = useState<PublishedAdmittedItem[]>([]);

  // Authentification / Création de compte inline sous la fiche d'un sujet sélectionné
  const [inlineAuthTab, setInlineAuthTab] = useState<"register" | "login">(
    "register"
  );
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginIdentifier, setLoginIdentifier] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [regCne, setRegCne] = useState("");
  const [regOrigin, setRegOrigin] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const loadPublicData = useCallback(async () => {
    try {
      const [sujRes, admRes] = await Promise.all([
        fetch("/api/public/sujets").then((r) => r.json()),
        fetch("/api/public/admis").then((r) => r.json()),
      ]);
      setSubjects(sujRes.subjects || []);
      setAdmisPublished(Boolean(admRes.published));
      setAdmisList(admRes.list || []);
    } catch {
      // ignore network error
    }
  }, []);

  const loadCandidature = useCallback(async () => {
    if (!user || user.role !== "candidat") return;
    try {
      const data = await apiFetch<{ candidature: CandidaturePublic | null }>(
        "/api/candidat/dossier"
      );
      setCandidature(data.candidature);
      if (data.candidature) {
        setSelectedSubjectId(data.candidature.subjectId);
        if (data.candidature.cne) setSyncCne(data.candidature.cne);
        if (data.candidature.originInstitution) {
          setSyncOrigin(data.candidature.originInstitution);
        }
      }
    } catch (err: any) {
      setActionError(err?.message || null);
    }
  }, [user, apiFetch]);

  useEffect(() => {
    loadPublicData();
  }, [loadPublicData]);

  useEffect(() => {
    if (mode === "candidat") {
      loadCandidature();
    }
  }, [mode, loadCandidature]);

  // Fonction unique de recherche à facettes en cascade sélective
  const searchOutput = useMemo(
    () => computeFacetedSubjects(subjects, userFacets),
    [subjects, userFacets]
  );

  const { effectiveFilters, autoPreselected } = searchOutput;

  const handleUpdateFacet = (
    field: keyof ActiveFacetFilters,
    val: string | null
  ) => {
    setUserFacets((prev) => ({
      ...prev,
      [field]: field === "keywords" ? val ?? "" : val === "" ? null : val,
    }));
  };

  const handleRemoveFilter = (field: keyof ActiveFacetFilters) => {
    setUserFacets((prev) => removeFacetConstraint(subjects, prev, field));
  };

  const handleResetFilters = () => {
    setUserFacets(EMPTY_FACETS);
  };

  const toggleCompare = (id: string) => {
    setCompareIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 3) return prev;
      return [...prev, id];
    });
  };

  const comparedSubjects = subjects.filter((s) => compareIds.includes(s.id));

  const selectedSubject =
    subjects.find((s) => s.id === selectedSubjectId) ||
    (candidature
      ? ({
          id: candidature.subjectId,
          code: candidature.subjectCode,
          title: candidature.subjectTitle,
          laboratory: candidature.laboratory,
          discipline: "",
          thesisDirector: candidature.thesisDirector,
          directorId: candidature.directorId,
          language: "",
          prerequisites: "",
          keywords: [],
          status: "Publié",
        } as ThesisSubject)
      : null);

  const activeTags: {
    key: keyof ActiveFacetFilters;
    label: string;
    value: string;
    isAuto: boolean;
  }[] = [];

  if (effectiveFilters.keywords.trim()) {
    activeTags.push({
      key: "keywords",
      label: "Mots-clés",
      value: effectiveFilters.keywords.trim(),
      isAuto: false,
    });
  }
  if (effectiveFilters.laboratory) {
    activeTags.push({
      key: "laboratory",
      label: "Laboratoire",
      value: effectiveFilters.laboratory,
      isAuto: autoPreselected.laboratory,
    });
  }
  if (effectiveFilters.discipline) {
    activeTags.push({
      key: "discipline",
      label: "Discipline",
      value: effectiveFilters.discipline,
      isAuto: autoPreselected.discipline,
    });
  }
  if (effectiveFilters.thesisDirector) {
    activeTags.push({
      key: "thesisDirector",
      label: "Directeur",
      value: effectiveFilters.thesisDirector,
      isAuto: autoPreselected.thesisDirector,
    });
  }
  if (effectiveFilters.language) {
    activeTags.push({
      key: "language",
      label: "Langue",
      value: effectiveFilters.language,
      isAuto: autoPreselected.language,
    });
  }

  const renderFacetSelect = (
    field: FacetField,
    label: string,
    allPlaceholder: string
  ) => {
    const options: FacetOptionCount[] = searchOutput.facetOptions[field];
    const totalCount = options.reduce((acc, o) => acc + o.count, 0);
    const selectedVal = effectiveFilters[field] || "";
    const manualVal = userFacets[field];
    const isDisabled = options.length === 0 && !manualVal;

    return (
      <div>
        <label className="block text-[11px] font-medium text-slate-600 mb-1">
          {label}
        </label>
        <select
          value={selectedVal}
          disabled={isDisabled}
          onChange={(e) => handleUpdateFacet(field, e.target.value || null)}
          className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white text-slate-900 focus:outline-none focus:border-slate-900 disabled:bg-slate-50 disabled:text-slate-400"
        >
          {options.length === 0 ? (
            manualVal ? (
              <>
                <option value="">Retirer ce filtre</option>
                <option value={manualVal}>{manualVal}</option>
              </>
            ) : (
              <option value="">Aucune option</option>
            )
          ) : (
            <>
              {options.length > 1 && (
                <option value="">
                  {allPlaceholder} ({totalCount})
                </option>
              )}
              {options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.value} ({opt.count})
                </option>
              ))}
            </>
          )}
        </select>
      </div>
    );
  };

  // Upload individuel d'une pièce (sans bouton "Soumettre", sans validation candidat, sans IA visible)
  const handleFileUpload = async (
    slot: CandidatureSlot,
    file: File | undefined
  ) => {
    if (!file) return;
    setActionError(null);
    setUploadingSlot(slot);

    try {
      let textPreview = file.name;
      if (file.type.startsWith("text/") && file.size <= 32768) {
        textPreview = `${file.name} — ${(await file.text()).slice(0, 400)}`;
      }
      const res = await apiFetch<{ candidature: CandidaturePublic }>(
        "/api/candidat/upload-piece",
        {
          method: "POST",
          body: JSON.stringify({
            slot,
            fileName: file.name,
            contentSample: textPreview,
          }),
        }
      );
      setCandidature(res.candidature);
    } catch (err: any) {
      setActionError(err?.message || "Échec du téléversement.");
    } finally {
      setUploadingSlot(null);
    }
  };

  const handleSyncAcademicRecords = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!syncCne.trim()) return;
    setActionError(null);
    setSyncLoading(true);
    try {
      const res = await apiFetch<{
        retrievedCount: number;
        candidature: CandidaturePublic;
      }>("/api/candidat/sync-academic", {
        method: "POST",
        body: JSON.stringify({
          cne: syncCne.trim(),
          originInstitution: syncOrigin,
        }),
      });
      setCandidature(res.candidature);
    } catch (err: any) {
      setActionError(err?.message || "Récupération indisponible.");
    } finally {
      setSyncLoading(false);
    }
  };

  const handleSubmitRecours = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recoursText.trim()) return;
    setActionError(null);
    setRecoursSubmitting(true);
    try {
      const res = await apiFetch<{ candidature: CandidaturePublic }>(
        "/api/candidat/recours",
        {
          method: "POST",
          body: JSON.stringify({ motif: recoursText.trim() }),
        }
      );
      setCandidature(res.candidature);
      setRecoursOpen(false);
      setRecoursText("");
    } catch (err: any) {
      setActionError(err?.message || "Impossible d'enregistrer le recours.");
    } finally {
      setRecoursSubmitting(false);
    }
  };

  const handleInlineRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubject) return;
    setAuthError(null);
    setAuthBusy(true);
    try {
      const res = await registerCandidat({
        fullName,
        email,
        password,
        subjectId: selectedSubject.id,
        cne: regCne,
        originInstitution: regOrigin,
      });
      if (res.verified && res.user) {
        navigate(ROLE_ROUTES[res.user.role], { replace: true });
      }
    } catch (err: any) {
      setAuthError(err?.message || "Création de compte impossible.");
    } finally {
      setAuthBusy(false);
    }
  };

  const handleInlineLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthBusy(true);
    try {
      const logged = await login(loginIdentifier, loginPassword);
      navigate(ROLE_ROUTES[logged.role], { replace: true });
    } catch (err: any) {
      setAuthError(err?.message || "Connexion impossible.");
    } finally {
      setAuthBusy(false);
    }
  };

  const handleInlineVerifyEmail = async () => {
    setAuthError(null);
    setAuthBusy(true);
    try {
      const verified = await confirmEmailVerification();
      navigate(ROLE_ROUTES[verified.role], { replace: true });
    } catch (err: any) {
      setAuthError(err?.message || "Vérification impossible.");
    } finally {
      setAuthBusy(false);
    }
  };

  const handleInlineGoogle = async () => {
    if (!selectedSubject) return;
    setAuthError(null);
    setAuthBusy(true);
    try {
      const logged = await loginWithGoogle({
        subjectId: selectedSubject.id,
        cne: regCne,
        originInstitution: regOrigin,
      });
      navigate(ROLE_ROUTES[logged.role], { replace: true });
    } catch (err: any) {
      setAuthError(err?.message || "Authentification Google impossible.");
    } finally {
      setAuthBusy(false);
    }
  };

  const todayIso = new Date().toISOString().slice(0, 10);
  const activeDelai = candidature
    ? candidature.nouveauDelai || candidature.delai
    : "";
  const isWithinDelai = !activeDelai || todayIso <= activeDelai;
  const depositAllowed =
    candidature &&
    ["Compte créé", "En dépôt", "Incomplet"].includes(candidature.status) &&
    isWithinDelai;

  return (
    <div className="space-y-6 text-xs">
      {/* SECTION 1 : RECHERCHE DE SUJETS + FICHE DU SUJET SÉLECTIONNÉ & DÉPÔT DE CANDIDATURE */}
      <section className="space-y-4">
        <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
          {/* Barre de recherche par mots-clés + bouton "Recherche avancée" */}
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={userFacets.keywords}
              onChange={(e) => handleUpdateFacet("keywords", e.target.value)}
              placeholder="Rechercher par mots-clés (ex. IA, solaire, graphes...)"
              className="flex-1 px-3 py-2 border border-slate-300 rounded bg-white text-slate-900 focus:outline-none focus:border-slate-900"
            />
            <button
              type="button"
              onClick={() => setAdvancedOpen((prev) => !prev)}
              className={`inline-flex items-center justify-center gap-1.5 px-3.5 py-2 border rounded font-semibold transition-colors shrink-0 ${
                advancedOpen
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-white text-slate-800 border-slate-300 hover:bg-slate-50"
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Recherche avancée</span>
            </button>
          </div>

          {/* Filtres en cascade sélective bidirectionnelle */}
          {advancedOpen && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-2 border-t border-slate-100">
              {renderFacetSelect(
                "laboratory",
                "Laboratoire",
                "Tous les laboratoires"
              )}
              {renderFacetSelect(
                "discipline",
                "Discipline",
                "Toutes les disciplines"
              )}
              {renderFacetSelect(
                "thesisDirector",
                "Directeur de thèse",
                "Tous les directeurs"
              )}
              {renderFacetSelect("language", "Langue", "Toutes les langues")}
            </div>
          )}

          {/* Étiquettes de filtres actifs avec "x" et bouton "Réinitialiser" */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-semibold text-slate-800 tabular-nums mr-1">
                {searchOutput.matchedSubjects.length} sujet
                {searchOutput.matchedSubjects.length > 1 ? "s" : ""}
              </span>
              {activeTags.map((tag) => (
                <button
                  key={tag.key}
                  type="button"
                  onClick={() => handleRemoveFilter(tag.key)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded transition-colors"
                >
                  <span className="text-slate-500">{tag.label} :</span>
                  <span className="font-medium">{tag.value}</span>
                  <X className="w-3 h-3 text-slate-500" />
                </button>
              ))}
            </div>

            {activeTags.length > 0 && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1 font-medium text-slate-700 hover:text-slate-950 underline"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Réinitialiser</span>
              </button>
            )}
          </div>
        </div>

        {/* Comparaison côte à côte (2 à 3 sujets) */}
        {comparedSubjects.length >= 2 && (
          <div className="bg-white border border-slate-900 rounded-lg overflow-hidden">
            <div className="px-4 py-2 bg-slate-900 text-white flex items-center justify-between">
              <span className="font-semibold tabular-nums">
                Comparaison ({comparedSubjects.length} / 3)
              </span>
              <button
                type="button"
                onClick={() => setCompareIds([])}
                className="text-slate-300 hover:text-white inline-flex items-center gap-1"
              >
                <X className="w-3.5 h-3.5" /> Fermer
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[600px]">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="py-2 px-3 w-32 font-semibold text-slate-600">
                      Critère
                    </th>
                    {comparedSubjects.map((s) => (
                      <th
                        key={s.id}
                        className="py-2 px-3 font-semibold text-slate-900 align-top"
                      >
                        <button
                          type="button"
                          onClick={() => setSelectedSubjectId(s.id)}
                          className="text-left hover:underline"
                        >
                          {s.title}
                        </button>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  <tr>
                    <td className="py-2 px-3 text-slate-500">Laboratoire</td>
                    {comparedSubjects.map((s) => (
                      <td key={s.id} className="py-2 px-3 text-slate-800">
                        {s.laboratory}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-2 px-3 text-slate-500">Discipline</td>
                    {comparedSubjects.map((s) => (
                      <td key={s.id} className="py-2 px-3 text-slate-800">
                        {s.discipline}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-2 px-3 text-slate-500">Directeur</td>
                    {comparedSubjects.map((s) => (
                      <td key={s.id} className="py-2 px-3 font-medium text-slate-900">
                        {s.thesisDirector}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-2 px-3 text-slate-500">Langue</td>
                    {comparedSubjects.map((s) => (
                      <td key={s.id} className="py-2 px-3 text-slate-800">
                        {s.language}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-2 px-3 text-slate-500">Prérequis</td>
                    {comparedSubjects.map((s) => (
                      <td key={s.id} className="py-2 px-3 text-slate-600">
                        {s.prerequisites}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Liste des sujets publiés (SANS bouton "Candidater" : clic ouvre la fiche et le dépôt en dessous) */}
        {searchOutput.matchedSubjects.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-lg p-6 text-center space-y-2">
            <div className="font-semibold text-slate-900">
              Aucun sujet publié ne correspond aux critères sélectionnés.
            </div>
            <button
              type="button"
              onClick={handleResetFilters}
              className="px-3 py-1.5 bg-slate-900 text-white font-semibold rounded hover:bg-slate-800"
            >
              Réinitialiser
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {searchOutput.matchedSubjects.map((s) => {
              const isSelected = selectedSubject?.id === s.id;
              const isCompared = compareIds.includes(s.id);
              const disableCompare = !isCompared && compareIds.length >= 3;

              return (
                <div
                  key={s.id}
                  onClick={() => setSelectedSubjectId(s.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelectedSubjectId(s.id);
                    }
                  }}
                  className={`bg-white border rounded-lg p-4 cursor-pointer transition-colors flex flex-col justify-between gap-3 ${
                    isSelected
                      ? "border-slate-900 ring-1 ring-slate-900"
                      : "border-slate-200 hover:border-slate-400"
                  }`}
                >
                  <div className="space-y-1.5">
                    <div className="font-mono text-[11px] text-slate-500">
                      {s.code}
                    </div>
                    <h2 className="text-sm font-bold text-slate-900 leading-snug">
                      {s.title}
                    </h2>
                    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 pt-1 text-slate-600">
                      <div>
                        <span className="text-slate-500">Laboratoire : </span>
                        <span className="font-medium text-slate-800">
                          {s.laboratory}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500">Discipline : </span>
                        <span className="text-slate-800">{s.discipline}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Directeur : </span>
                        <span className="font-semibold text-slate-900">
                          {s.thesisDirector}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500">Langue : </span>
                        <span className="text-slate-800">{s.language}</span>
                      </div>
                    </dl>
                  </div>

                  <div
                    className="pt-2 border-t border-slate-100 flex items-center justify-between"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <label
                      className={`inline-flex items-center gap-1.5 select-none ${
                        disableCompare
                          ? "opacity-40 cursor-not-allowed"
                          : "cursor-pointer text-slate-700"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isCompared}
                        disabled={disableCompare}
                        onChange={() => toggleCompare(s.id)}
                        className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                      />
                      <span>Comparer</span>
                    </label>
                    <span className="text-[11px] font-medium text-slate-600">
                      {isSelected ? "Fiche ouverte ci-dessous" : "Ouvrir la fiche"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* FICHE DU SUJET SÉLECTIONNÉ + PARTIE "DÉPÔT DE CANDIDATURE" EN DESSOUS */}
        {selectedSubject && (
          <div className="bg-white border border-slate-300 rounded-lg divide-y divide-slate-200">
            {/* Fiche du sujet */}
            <div className="p-4 sm:p-5 space-y-2.5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-mono text-[11px] text-slate-500">
                    {selectedSubject.code}
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mt-0.5">
                    {selectedSubject.title}
                  </h3>
                </div>
                {(!candidature || candidature.subjectId !== selectedSubject.id) && (
                  <button
                    type="button"
                    onClick={() => setSelectedSubjectId(null)}
                    className="text-slate-400 hover:text-slate-800"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-700 pt-1">
                <div>
                  <span className="text-slate-500">Laboratoire : </span>
                  <strong className="font-semibold text-slate-900">
                    {selectedSubject.laboratory}
                  </strong>
                </div>
                {selectedSubject.discipline && (
                  <div>
                    <span className="text-slate-500">Discipline : </span>
                    <span>{selectedSubject.discipline}</span>
                  </div>
                )}
                <div>
                  <span className="text-slate-500">Directeur de thèse : </span>
                  <strong className="font-semibold text-slate-900">
                    {selectedSubject.thesisDirector}
                  </strong>
                </div>
                {selectedSubject.language && (
                  <div>
                    <span className="text-slate-500">Langue : </span>
                    <span>{selectedSubject.language}</span>
                  </div>
                )}
              </div>

              {selectedSubject.prerequisites && (
                <div className="text-slate-700">
                  <span className="text-slate-500">Prérequis : </span>
                  <span>{selectedSubject.prerequisites}</span>
                </div>
              )}

              {selectedSubject.keywords?.length > 0 && (
                <div className="text-slate-700">
                  <span className="text-slate-500">Mots-clés : </span>
                  <span>{selectedSubject.keywords.join(", ")}</span>
                </div>
              )}
            </div>

            {/* Partie "Dépôt de candidature" sous la fiche */}
            <div className="p-4 sm:p-5 space-y-4 bg-slate-50/60">
              <h4 className="text-sm font-bold text-slate-900">
                Dépôt de candidature
              </h4>

              {!user ? (
                /* Visiteur non authentifié : demande de connexion ou création de compte -> état "Compte créé" */
                pendingVerification ? (
                  <div className="max-w-md bg-white border border-slate-200 rounded p-4 space-y-3">
                    <div className="font-semibold text-slate-900">
                      Vérification de l'adresse e-mail ({pendingVerification.email})
                    </div>
                    {authError && (
                      <div className="p-2 bg-red-50 border border-red-200 text-red-800 rounded">
                        {authError}
                      </div>
                    )}
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={authBusy}
                        onClick={handleInlineVerifyEmail}
                        className="px-3.5 py-2 bg-slate-900 text-white font-semibold rounded hover:bg-slate-800 disabled:opacity-50"
                      >
                        {authBusy
                          ? "Vérification..."
                          : "Confirmer mon adresse e-mail"}
                      </button>
                      {pendingVerification.mode === "firebase" && (
                        <button
                          type="button"
                          onClick={() => resendVerificationEmail()}
                          className="px-3 py-2 border border-slate-300 rounded text-slate-700 hover:bg-slate-50"
                        >
                          Renvoyer l'e-mail
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={clearPendingVerification}
                        className="px-2 py-2 text-slate-500 underline"
                      >
                        Annuler
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="max-w-lg bg-white border border-slate-200 rounded p-4 space-y-3.5">
                    <div className="flex border-b border-slate-200">
                      <button
                        type="button"
                        onClick={() => {
                          setInlineAuthTab("register");
                          setAuthError(null);
                        }}
                        className={`flex-1 pb-2 font-semibold border-b-2 ${
                          inlineAuthTab === "register"
                            ? "border-slate-900 text-slate-900"
                            : "border-transparent text-slate-500"
                        }`}
                      >
                        Créer un compte candidat
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setInlineAuthTab("login");
                          setAuthError(null);
                        }}
                        className={`flex-1 pb-2 font-semibold border-b-2 ${
                          inlineAuthTab === "login"
                            ? "border-slate-900 text-slate-900"
                            : "border-transparent text-slate-500"
                        }`}
                      >
                        Se connecter
                      </button>
                    </div>

                    {authError && (
                      <div className="p-2 bg-red-50 border border-red-200 text-red-800 rounded">
                        {authError}
                      </div>
                    )}

                    {inlineAuthTab === "register" ? (
                      <form onSubmit={handleInlineRegister} className="space-y-2.5">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          <div>
                            <label className="block font-medium text-slate-700 mb-1">
                              Nom complet
                            </label>
                            <input
                              type="text"
                              required
                              value={fullName}
                              onChange={(e) => setFullName(e.target.value)}
                              className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                            />
                          </div>
                          <div>
                            <label className="block font-medium text-slate-700 mb-1">
                              Adresse e-mail
                            </label>
                            <input
                              type="email"
                              required
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block font-medium text-slate-700 mb-1">
                            Mot de passe
                          </label>
                          <input
                            type="password"
                            required
                            minLength={6}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          <div>
                            <label className="block font-medium text-slate-700 mb-1">
                              CNE / Identifiant étudiant
                            </label>
                            <input
                              type="text"
                              placeholder="Optionnel"
                              value={regCne}
                              onChange={(e) => setRegCne(e.target.value)}
                              className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                            />
                          </div>
                          <div>
                            <label className="block font-medium text-slate-700 mb-1">
                              Université d'origine
                            </label>
                            <select
                              value={regOrigin}
                              onChange={(e) => setRegOrigin(e.target.value)}
                              className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                            >
                              <option value="">Dépôt manuel</option>
                              <option value="EST Fès / USMBA">
                                EST Fès / USMBA (Base interne)
                              </option>
                              <option value="Université Mohammed V de Rabat">
                                Université Mohammed V (API)
                              </option>
                              <option value="Université Cadi Ayyad">
                                Université Cadi Ayyad (API)
                              </option>
                            </select>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2 pt-1">
                          <button
                            type="submit"
                            disabled={authBusy}
                            className="px-4 py-2 bg-slate-900 text-white font-semibold rounded hover:bg-slate-800 disabled:opacity-50"
                          >
                            {authBusy ? "Création..." : "Créer mon compte"}
                          </button>
                          <button
                            type="button"
                            disabled={authBusy}
                            onClick={handleInlineGoogle}
                            className="px-3.5 py-2 border border-slate-300 rounded text-slate-800 hover:bg-slate-50"
                          >
                            Continuer avec Google
                          </button>
                        </div>
                      </form>
                    ) : (
                      <form onSubmit={handleInlineLogin} className="space-y-2.5">
                        <div>
                          <label className="block font-medium text-slate-700 mb-1">
                            Adresse e-mail
                          </label>
                          <input
                            type="text"
                            required
                            value={loginIdentifier}
                            onChange={(e) => setLoginIdentifier(e.target.value)}
                            className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                          />
                        </div>
                        <div>
                          <label className="block font-medium text-slate-700 mb-1">
                            Mot de passe
                          </label>
                          <input
                            type="password"
                            required
                            value={loginPassword}
                            onChange={(e) => setLoginPassword(e.target.value)}
                            className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                          />
                        </div>
                        <button
                          type="submit"
                          disabled={authBusy}
                          className="px-4 py-2 bg-slate-900 text-white font-semibold rounded hover:bg-slate-800 disabled:opacity-50"
                        >
                          {authBusy ? "Connexion..." : "Se connecter"}
                        </button>
                      </form>
                    )}
                  </div>
                )
              ) : candidature && candidature.subjectId === selectedSubject.id ? (
                /* Candidat authentifié sur son sujet choisi : espaces individuels par type de pièce */
                <div className="space-y-3">
                  {actionError && (
                    <div className="p-2.5 bg-red-50 border border-red-200 text-red-800 rounded">
                      {actionError}
                    </div>
                  )}

                  {/* Récupération base interne EST Fès / API si Diplôme ou Relevés encore manquants */}
                  {depositAllowed &&
                    candidature.pieces.some(
                      (p) =>
                        (p.slot === "DIPLOME" || p.slot === "RELEVES_NOTES") &&
                        p.status === "Manquante"
                    ) && (
                      <form
                        onSubmit={handleSyncAcademicRecords}
                        className="bg-white border border-slate-200 rounded p-3 flex flex-wrap items-end gap-2.5"
                      >
                        <div>
                          <label className="block text-[11px] font-medium text-slate-600 mb-1">
                            CNE / Code étudiant
                          </label>
                          <input
                            type="text"
                            required
                            value={syncCne}
                            onChange={(e) => setSyncCne(e.target.value)}
                            placeholder="Ex. N138492011"
                            className="px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-medium text-slate-600 mb-1">
                            Établissement d'origine
                          </label>
                          <select
                            value={syncOrigin}
                            onChange={(e) => setSyncOrigin(e.target.value)}
                            className="px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                          >
                            <option value="EST Fès / USMBA">
                              EST Fès / USMBA (Base interne)
                            </option>
                            <option value="Université Mohammed V de Rabat">
                              Université Mohammed V (API)
                            </option>
                            <option value="Université Cadi Ayyad">
                              Université Cadi Ayyad (API)
                            </option>
                          </select>
                        </div>
                        <button
                          type="submit"
                          disabled={syncLoading}
                          className="px-3 py-1.5 bg-slate-800 text-white font-semibold rounded hover:bg-slate-900 disabled:opacity-50"
                        >
                          {syncLoading
                            ? "Récupération..."
                            : "Récupérer diplôme & relevés"}
                        </button>
                      </form>
                    )}

                  <div className="divide-y divide-slate-200 bg-white border border-slate-200 rounded">
                    {candidature.pieces.map((p) => {
                      const canUploadInitial =
                        depositAllowed &&
                        candidature.status !== "Incomplet" &&
                        (p.status === "Manquante" || p.status === "Reçue") &&
                        p.source === "Dépôt candidat";

                      const canReplaceInDelai =
                        depositAllowed &&
                        (p.status === "Non conforme" ||
                          (candidature.status === "Incomplet" &&
                            p.status === "Manquante"));

                      const showInput = canUploadInitial || canReplaceInDelai;

                      return (
                        <div
                          key={p.slot}
                          className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                        >
                          <div className="space-y-0.5">
                            <div className="font-semibold text-slate-900">
                              {CANDIDATURE_SLOT_LABELS[p.slot]}
                            </div>
                            <div className="text-slate-600">
                              {p.status === "Manquante" ? (
                                <span className="text-slate-500">Manquante</span>
                              ) : p.source !== "Dépôt candidat" ? (
                                <span>
                                  {p.source} ({p.fileName})
                                </span>
                              ) : (
                                <span>{p.fileName}</span>
                              )}
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

                            {showInput && (
                              <label className="px-3 py-1.5 border border-slate-300 bg-white hover:bg-slate-50 text-slate-900 font-semibold rounded cursor-pointer">
                                {uploadingSlot === p.slot
                                  ? "Envoi..."
                                  : p.status === "Non conforme"
                                  ? "Remplacer"
                                  : p.status === "Reçue"
                                  ? "Modifier le fichier"
                                  : "Déposer"}
                                <input
                                  type="file"
                                  accept=".pdf,.png,.jpg,.jpeg,.txt"
                                  disabled={uploadingSlot !== null}
                                  className="hidden"
                                  onChange={(e) => {
                                    handleFileUpload(p.slot, e.target.files?.[0]);
                                    e.currentTarget.value = "";
                                  }}
                                />
                              </label>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="text-slate-700">
                  Votre compte est rattaché au sujet{" "}
                  <strong>{candidature?.subjectCode}</strong> (
                  {candidature?.subjectTitle}).{" "}
                  {candidature && (
                    <button
                      type="button"
                      onClick={() => setSelectedSubjectId(candidature.subjectId)}
                      className="font-semibold text-slate-900 underline"
                    >
                      Ouvrir mon sujet
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      {/* SECTION 2 : SUIVI DE CANDIDATURE (LECTURE SEULE — UNIQUEMENT POUR CANDIDAT AUTHENTIFIÉ) */}
      {mode === "candidat" && candidature && (
        <section className="bg-white border border-slate-200 rounded-lg p-4 sm:p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
            <h2 className="text-sm font-bold text-slate-900">
              Suivi de ma candidature
            </h2>
            <div className="flex flex-wrap items-center gap-4">
              <div>
                <span className="text-slate-500">État : </span>
                <strong className="font-bold text-slate-900">
                  {candidature.status}
                </strong>
              </div>
              <div>
                <span className="text-slate-500">
                  {candidature.nouveauDelai ? "Nouveau délai : " : "Délai : "}
                </span>
                <strong className="font-mono font-semibold text-slate-900">
                  {candidature.nouveauDelai || candidature.delai}
                </strong>
              </div>
            </div>
          </div>

          {/* Convocation (si notifiée) */}
          {candidature.convocationDate && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded flex flex-wrap gap-x-6 gap-y-1">
              <div>
                <span className="text-slate-500">Convocation : </span>
                <strong className="text-slate-900">
                  {candidature.convocationDate}
                </strong>
              </div>
              <div>
                <span className="text-slate-500">Lieu : </span>
                <strong className="text-slate-900">
                  {candidature.convocationLieu}
                </strong>
              </div>
            </div>
          )}

          {/* Résultat & Bouton Recours si Non admis */}
          {(candidature.status === "Admis" ||
            candidature.status === "Non admis" ||
            candidature.status === "Non présélectionné" ||
            candidature.status === "Inscrit") && (
            <div className="p-3 border border-slate-200 rounded flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="text-slate-500">Résultat : </span>
                <strong className="font-bold text-slate-900">
                  {candidature.status}
                </strong>
              </div>

              {candidature.status === "Non admis" && !candidature.recoursMotif && (
                <button
                  type="button"
                  onClick={() => setRecoursOpen((v) => !v)}
                  className="px-3 py-1.5 bg-slate-900 text-white font-semibold rounded hover:bg-slate-800"
                >
                  Recours
                </button>
              )}

              {candidature.recoursMotif && (
                <div className="text-slate-700">
                  <span className="text-slate-500">Recours enregistré : </span>
                  <span>{candidature.recoursMotif}</span>
                </div>
              )}
            </div>
          )}

          {recoursOpen &&
            candidature.status === "Non admis" &&
            !candidature.recoursMotif && (
              <form
                onSubmit={handleSubmitRecours}
                className="p-3 bg-slate-50 border border-slate-200 rounded space-y-2"
              >
                <label className="block font-medium text-slate-700">
                  Motif du recours
                </label>
                <textarea
                  rows={2}
                  required
                  value={recoursText}
                  onChange={(e) => setRecoursText(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded bg-white"
                />
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={recoursSubmitting}
                    className="px-3 py-1.5 bg-slate-900 text-white font-semibold rounded hover:bg-slate-800"
                  >
                    Envoyer le recours
                  </button>
                  <button
                    type="button"
                    onClick={() => setRecoursOpen(false)}
                    className="px-3 py-1.5 text-slate-600"
                  >
                    Annuler
                  </button>
                </div>
              </form>
            )}

          {/* Tableau récapitulatif lecture seule des pièces */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-2 pr-3 font-medium">Pièce</th>
                  <th className="py-2 px-3 font-medium">État</th>
                  <th className="py-2 pl-3 font-medium">Motif</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {candidature.pieces.map((p) => (
                  <tr key={p.slot}>
                    <td className="py-2 pr-3 font-medium text-slate-900">
                      {CANDIDATURE_SLOT_LABELS[p.slot]}
                    </td>
                    <td className="py-2 px-3 font-semibold text-slate-800">
                      {p.status}
                    </td>
                    <td className="py-2 pl-3 text-red-700">
                      {p.status === "Non conforme" ? p.motif : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Liste des admis (une fois publiée par la Scolarité après validation du Directeur du CEDoc) */}
          {admisPublished && (
            <div className="pt-3 border-t border-slate-200 space-y-2">
              <h3 className="font-bold text-slate-900">Liste des admis</h3>
              {admisList.length === 0 ? (
                <div className="text-slate-500">Aucun candidat admis publié.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500">
                        <th className="py-1.5 pr-3 font-medium">Candidat</th>
                        <th className="py-1.5 px-3 font-medium">Sujet</th>
                        <th className="py-1.5 pl-3 font-medium">Laboratoire</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {admisList.map((a) => (
                        <tr key={a.candidatureId}>
                          <td className="py-1.5 pr-3 font-semibold text-slate-900">
                            {a.candidateName}
                          </td>
                          <td className="py-1.5 px-3 text-slate-800">
                            {a.subjectCode} — {a.subjectTitle}
                          </td>
                          <td className="py-1.5 pl-3 text-slate-700">
                            {a.laboratory}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </section>
      )}
    </div>
  );
};
