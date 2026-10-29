import { ThesisSubject } from "../types/cedoc";

export type FacetField =
  | "laboratory"
  | "discipline"
  | "thesisDirector"
  | "language";

export interface ActiveFacetFilters {
  keywords: string;
  laboratory: string | null;
  discipline: string | null;
  thesisDirector: string | null;
  language: string | null;
}

export interface FacetOptionCount {
  value: string;
  count: number;
}

export interface FacetedSearchResult {
  matchedSubjects: ThesisSubject[];
  facetOptions: Record<FacetField, FacetOptionCount[]>;
  effectiveFilters: ActiveFacetFilters;
  autoPreselected: Record<FacetField, boolean>;
}

const FACET_FIELDS: FacetField[] = [
  "laboratory",
  "discipline",
  "thesisDirector",
  "language",
];

function normalizeText(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function matchesKeywords(subject: ThesisSubject, rawQuery: string): boolean {
  const q = normalizeText(rawQuery.trim());
  if (!q) return true;
  const terms = q.split(/\s+/).filter(Boolean);
  const searchable = normalizeText(
    [
      subject.code,
      subject.title,
      subject.laboratory,
      subject.discipline,
      subject.thesisDirector,
      subject.language,
      subject.prerequisites,
      ...subject.keywords,
    ].join(" ")
  );

  return terms.every((term) => searchable.includes(term));
}

function countByField(
  items: ThesisSubject[],
  getter: (s: ThesisSubject) => string
): FacetOptionCount[] {
  const counts = new Map<string, number>();
  for (const item of items) {
    const val = getter(item);
    counts.set(val, (counts.get(val) || 0) + 1);
  }
  return Array.from(counts.entries())
    .filter(([, count]) => count > 0)
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => a.value.localeCompare(b.value, "fr"));
}

/**
 * Fonction unique de recherche à facettes en cascade sélective bidirectionnelle :
 * Étant donné l'ensemble des filtres actifs, retourne :
 * (a) `matchedSubjects` : la liste des sujets publiés correspondants
 * (b) `facetOptions` : les options valides de chaque filtre calculées uniquement
 *     à partir des sujets publiés respectant tous les AUTRES filtres actifs, avec compteurs (> 0)
 * ainsi que la pré-sélection automatique lorsqu'une seule option reste possible.
 */
export function computeFacetedSubjects(
  allSubjects: ThesisSubject[],
  filters: ActiveFacetFilters
): FacetedSearchResult {
  const published = allSubjects.filter((s) => s.status === "Publié");

  const matchesExcept = (
    s: ThesisSubject,
    ignoreField?: FacetField
  ): boolean => {
    if (!matchesKeywords(s, filters.keywords)) return false;
    if (
      ignoreField !== "laboratory" &&
      filters.laboratory &&
      s.laboratory !== filters.laboratory
    ) {
      return false;
    }
    if (
      ignoreField !== "discipline" &&
      filters.discipline &&
      s.discipline !== filters.discipline
    ) {
      return false;
    }
    if (
      ignoreField !== "thesisDirector" &&
      filters.thesisDirector &&
      s.thesisDirector !== filters.thesisDirector
    ) {
      return false;
    }
    if (
      ignoreField !== "language" &&
      filters.language &&
      s.language !== filters.language
    ) {
      return false;
    }
    return true;
  };

  const matchedSubjects = published.filter((s) => matchesExcept(s));

  const facetOptions: Record<FacetField, FacetOptionCount[]> = {
    laboratory: countByField(
      published.filter((s) => matchesExcept(s, "laboratory")),
      (s) => s.laboratory
    ),
    discipline: countByField(
      published.filter((s) => matchesExcept(s, "discipline")),
      (s) => s.discipline
    ),
    thesisDirector: countByField(
      published.filter((s) => matchesExcept(s, "thesisDirector")),
      (s) => s.thesisDirector
    ),
    language: countByField(
      published.filter((s) => matchesExcept(s, "language")),
      (s) => s.language
    ),
  };

  const effectiveFilters: ActiveFacetFilters = { ...filters };
  const autoPreselected: Record<FacetField, boolean> = {
    laboratory: false,
    discipline: false,
    thesisDirector: false,
    language: false,
  };

  for (const field of FACET_FIELDS) {
    if (filters[field] === null && facetOptions[field].length === 1) {
      effectiveFilters[field] = facetOptions[field][0].value;
      autoPreselected[field] = true;
    }
  }

  return {
    matchedSubjects,
    facetOptions,
    effectiveFilters,
    autoPreselected,
  };
}

export function removeFacetConstraint(
  allSubjects: ThesisSubject[],
  currentFilters: ActiveFacetFilters,
  targetField: keyof ActiveFacetFilters
): ActiveFacetFilters {
  if (targetField === "keywords") {
    return { ...currentFilters, keywords: "" };
  }

  if (currentFilters[targetField] !== null) {
    return { ...currentFilters, [targetField]: null };
  }

  const candidateOrder: (keyof ActiveFacetFilters)[] = [
    "thesisDirector",
    "discipline",
    "laboratory",
    "language",
    "keywords",
  ];

  for (const key of candidateOrder) {
    if (key === targetField) continue;
    const isActive =
      key === "keywords"
        ? Boolean(currentFilters.keywords.trim())
        : currentFilters[key] !== null;
    if (!isActive) continue;

    const relaxed: ActiveFacetFilters = {
      ...currentFilters,
      [key]: key === "keywords" ? "" : null,
    };
    const probe = computeFacetedSubjects(allSubjects, relaxed);
    if (probe.facetOptions[targetField].length !== 1) {
      return relaxed;
    }
  }

  return {
    keywords: "",
    laboratory: null,
    discipline: null,
    thesisDirector: null,
    language: null,
  };
}
