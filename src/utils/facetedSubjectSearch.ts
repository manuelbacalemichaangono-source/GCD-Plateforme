import { CAMPAGNE_ACTUELLE } from '../config/constants';
import { SujetRecord } from '../types/cedoc';

export interface AdvancedFilters {
  discipline: string;
  laboratoire: string;
  directeur: string;
  motsCles: string;
  campagne: string;
}

export const INITIAL_ADVANCED_FILTERS: AdvancedFilters = {
  discipline: '',
  laboratoire: '',
  directeur: '',
  motsCles: '',
  campagne: CAMPAGNE_ACTUELLE,
};

export interface CascadeResult {
  effectiveFilters: AdvancedFilters;
  matchedSubjects: SujetRecord[];
  hasActiveUserFilter: boolean;
  validOptionsPerFilter: {
    disciplines: string[];
    laboratoires: string[];
    directeurs: string[];
    campagnes: string[];
  };
}

export function normalizeSearchText(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > 1) return 2;
  const dp: number[][] = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (__, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[a.length][b.length];
}

function tokenMatchesText(normText: string, token: string): boolean {
  if (!token) return true;
  if (normText.includes(token)) return true;
  if (token.length >= 4) {
    const words = normText.split(/[^a-z0-9]+/).filter(Boolean);
    for (const w of words) {
      if (w.length >= 3) {
        const prefix = w.slice(0, Math.min(w.length, token.length));
        if (Math.abs(prefix.length - token.length) <= 1 && levenshtein(prefix, token) <= 1) {
          return true;
        }
        if (Math.abs(w.length - token.length) <= 1 && levenshtein(w, token) <= 1) {
          return true;
        }
      }
    }
  }
  return false;
}

export function subjectMatchesKeywordQuery(sujet: SujetRecord, rawQuery: string): boolean {
  const normQuery = normalizeSearchText(rawQuery);
  if (normQuery.length < 2) return false;
  const haystack = normalizeSearchText(
    `${sujet.intitule} ${sujet.description} ${sujet.laboratoire} ${sujet.directeur} ${sujet.discipline}`
  );
  if (haystack.includes(normQuery)) return true;
  const tokens = normQuery.split(/\s+/).filter((t) => t.length >= 2);
  if (tokens.length === 0) return false;
  return tokens.every((tok) => tokenMatchesText(haystack, tok));
}

/**
 * 3.1 Live automatic search (200 ms debounce handled in UI, active from 2 characters):
 * Searches across intitulé, mots-clés (description), laboratoire, directeur, and domaine (discipline),
 * tolerating accents, case, and minor 1-character typos.
 * Orders first subjects whose title starts with the query, then those containing it.
 * Excludes already-opened subjects and returns at most 8 items.
 */
export function computeLiveSearchResults(
  publishedSubjects: SujetRecord[],
  rawQuery: string,
  excludedIds: string[] = [],
  maxResults = 8
): SujetRecord[] {
  const normQuery = normalizeSearchText(rawQuery);
  if (normQuery.length < 2) return [];

  const excluded = new Set(excludedIds);
  const scored: Array<{ sujet: SujetRecord; rank: number }> = [];

  for (const sujet of publishedSubjects) {
    if (excluded.has(sujet.id)) continue;
    if (!subjectMatchesKeywordQuery(sujet, rawQuery)) continue;

    const normTitle = normalizeSearchText(sujet.intitule);
    let rank = 4;
    if (normTitle.startsWith(normQuery)) {
      rank = 1;
    } else if (normTitle.includes(normQuery)) {
      rank = 2;
    } else {
      const normMeta = normalizeSearchText(
        `${sujet.discipline} ${sujet.laboratoire} ${sujet.directeur}`
      );
      rank = normMeta.includes(normQuery) ? 3 : 4;
    }

    scored.push({ sujet, rank });
  }

  scored.sort((a, b) => {
    if (a.rank !== b.rank) return a.rank - b.rank;
    return a.sujet.intitule.localeCompare(b.sujet.intitule, 'fr');
  });

  return scored.slice(0, maxResults).map((item) => item.sujet);
}

/**
 * 3.5 Single bidirectional selective cascade function:
 * Returns (effectiveFilters, matchedSubjects, validOptionsPerFilter).
 * Options of EVERY filter are calculated strictly from published subjects matching
 * all OTHER active filters (never displaying a 0-result option).
 * Auto-preselects any filter reduced to 1 option when another user filter is active.
 */
export function computeSelectiveCascade(
  publishedSubjects: SujetRecord[],
  rawFilters: AdvancedFilters,
  excludedIds: string[] = []
): CascadeResult {
  const excluded = new Set(excludedIds);
  const filters: AdvancedFilters = {
    ...rawFilters,
    campagne: rawFilters.campagne || CAMPAGNE_ACTUELLE,
  };

  const hasMotsCles = normalizeSearchText(filters.motsCles).length >= 2;
  const hasUserCriterion = Boolean(
    filters.discipline || filters.laboratoire || filters.directeur || hasMotsCles
  );

  const matchesKeywordIfAny = (s: SujetRecord, kw: string) => {
    if (normalizeSearchText(kw).length < 2) return true;
    return subjectMatchesKeywordQuery(s, kw);
  };

  const uniqueSorted = (arr: string[]) =>
    Array.from(new Set(arr)).sort((a, b) => a.localeCompare(b, 'fr'));

  const computeOptions = (current: AdvancedFilters) => {
    const forDiscipline = publishedSubjects.filter(
      (s) =>
        (!current.laboratoire || s.laboratoire === current.laboratoire) &&
        (!current.directeur || s.directeur === current.directeur) &&
        matchesKeywordIfAny(s, current.motsCles)
    );
    const forLaboratoire = publishedSubjects.filter(
      (s) =>
        (!current.discipline || s.discipline === current.discipline) &&
        (!current.directeur || s.directeur === current.directeur) &&
        matchesKeywordIfAny(s, current.motsCles)
    );
    const forDirecteur = publishedSubjects.filter(
      (s) =>
        (!current.discipline || s.discipline === current.discipline) &&
        (!current.laboratoire || s.laboratoire === current.laboratoire) &&
        matchesKeywordIfAny(s, current.motsCles)
    );

    return {
      disciplines: uniqueSorted(forDiscipline.map((s) => s.discipline)),
      laboratoires: uniqueSorted(forLaboratoire.map((s) => s.laboratoire)),
      directeurs: uniqueSorted(forDirecteur.map((s) => s.directeur)),
      campagnes: [CAMPAGNE_ACTUELLE],
    };
  };

  let validOptionsPerFilter = computeOptions(filters);

  if (hasUserCriterion) {
    let changed = true;
    let guard = 0;
    while (changed && guard < 4) {
      changed = false;
      guard += 1;
      if (!filters.discipline && validOptionsPerFilter.disciplines.length === 1) {
        filters.discipline = validOptionsPerFilter.disciplines[0];
        changed = true;
      }
      if (!filters.laboratoire && validOptionsPerFilter.laboratoires.length === 1) {
        filters.laboratoire = validOptionsPerFilter.laboratoires[0];
        changed = true;
      }
      if (!filters.directeur && validOptionsPerFilter.directeurs.length === 1) {
        filters.directeur = validOptionsPerFilter.directeurs[0];
        changed = true;
      }
      if (changed) {
        validOptionsPerFilter = computeOptions(filters);
      }
    }
  }

  const effectiveHasCriterion = Boolean(
    filters.discipline ||
      filters.laboratoire ||
      filters.directeur ||
      normalizeSearchText(filters.motsCles).length >= 2
  );

  const matchedSubjects = effectiveHasCriterion
    ? publishedSubjects
        .filter(
          (s) =>
            !excluded.has(s.id) &&
            (!filters.discipline || s.discipline === filters.discipline) &&
            (!filters.laboratoire || s.laboratoire === filters.laboratoire) &&
            (!filters.directeur || s.directeur === filters.directeur) &&
            matchesKeywordIfAny(s, filters.motsCles)
        )
    : [];

  return {
    effectiveFilters: filters,
    matchedSubjects,
    hasActiveUserFilter: effectiveHasCriterion,
    validOptionsPerFilter,
  };
}
