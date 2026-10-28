import { ThesisSubject } from "../types/cedoc";

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
  facetOptions: {
    laboratory: FacetOptionCount[];
    discipline: FacetOptionCount[];
    thesisDirector: FacetOptionCount[];
    language: FacetOptionCount[];
  };
}

function matchesKeywords(subject: ThesisSubject, rawQuery: string): boolean {
  const q = rawQuery.trim().toLowerCase();
  if (!q) return true;
  const terms = q.split(/\s+/).filter(Boolean);
  const searchable = [
    subject.code,
    subject.title,
    subject.laboratory,
    subject.discipline,
    subject.thesisDirector,
    subject.language,
    subject.prerequisites,
    ...subject.keywords,
  ]
    .join(" ")
    .toLowerCase();

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
 * Fonction unique de recherche à facettes bidirectionnelles :
 * À partir de l'ensemble des sujets et des filtres actifs, retourne :
 * (a) la liste des sujets publiés correspondants (`matchedSubjects`)
 * (b) les options valides de chaque filtre calculées sur les sujets respectant
 *     TOUS les AUTRES filtres actifs (zéro option à 0 résultat), avec compteurs.
 */
export function computeFacetedSubjects(
  allSubjects: ThesisSubject[],
  filters: ActiveFacetFilters
): FacetedSearchResult {
  const published = allSubjects.filter((s) => s.status === "publie");

  const matchesExcept = (
    s: ThesisSubject,
    ignoreField?: "laboratory" | "discipline" | "thesisDirector" | "language"
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

  const forLaboratory = published.filter((s) => matchesExcept(s, "laboratory"));
  const forDiscipline = published.filter((s) => matchesExcept(s, "discipline"));
  const forDirector = published.filter((s) =>
    matchesExcept(s, "thesisDirector")
  );
  const forLanguage = published.filter((s) => matchesExcept(s, "language"));

  return {
    matchedSubjects,
    facetOptions: {
      laboratory: countByField(forLaboratory, (s) => s.laboratory),
      discipline: countByField(forDiscipline, (s) => s.discipline),
      thesisDirector: countByField(forDirector, (s) => s.thesisDirector),
      language: countByField(forLanguage, (s) => s.language),
    },
  };
}
