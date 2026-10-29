import { SujetRecord } from '../types/cedoc';

export interface AdvancedFilters {
  discipline: string;
  laboratoire: string;
  directeur: string;
}

export interface CascadeResult {
  effectiveFilters: AdvancedFilters;
  matchedSubjects: SujetRecord[];
  options: {
    disciplines: string[];
    laboratoires: string[];
    directeurs: string[];
  };
}

/**
 * Single pure bidirectional selective cascade function:
 * Given published subjects and active filters, computes valid options for EVERY filter
 * strictly from subjects matching all OTHER active filters (never producing 0-result options),
 * and auto-preselects any filter that resolves to a single possible option when at least one
 * filter is already active.
 */
export function computeSelectiveCascade(
  publishedSubjects: SujetRecord[],
  rawFilters: AdvancedFilters
): CascadeResult {
  const filters: AdvancedFilters = { ...rawFilters };
  const hasAnySelection = Boolean(filters.discipline || filters.laboratoire || filters.directeur);

  const computeOptions = (current: AdvancedFilters) => {
    const forDiscipline = publishedSubjects.filter(
      (s) =>
        (!current.laboratoire || s.laboratoire === current.laboratoire) &&
        (!current.directeur || s.directeur === current.directeur)
    );
    const forLaboratoire = publishedSubjects.filter(
      (s) =>
        (!current.discipline || s.discipline === current.discipline) &&
        (!current.directeur || s.directeur === current.directeur)
    );
    const forDirecteur = publishedSubjects.filter(
      (s) =>
        (!current.discipline || s.discipline === current.discipline) &&
        (!current.laboratoire || s.laboratoire === current.laboratoire)
    );

    const uniqueSorted = (arr: string[]) =>
      Array.from(new Set(arr)).sort((a, b) => a.localeCompare(b, 'fr'));

    return {
      disciplines: uniqueSorted(forDiscipline.map((s) => s.discipline)),
      laboratoires: uniqueSorted(forLaboratoire.map((s) => s.laboratoire)),
      directeurs: uniqueSorted(forDirecteur.map((s) => s.directeur)),
    };
  };

  let options = computeOptions(filters);

  if (hasAnySelection) {
    let changed = true;
    let guard = 0;
    while (changed && guard < 4) {
      changed = false;
      guard += 1;
      if (!filters.discipline && options.disciplines.length === 1) {
        filters.discipline = options.disciplines[0];
        changed = true;
      }
      if (!filters.laboratoire && options.laboratoires.length === 1) {
        filters.laboratoire = options.laboratoires[0];
        changed = true;
      }
      if (!filters.directeur && options.directeurs.length === 1) {
        filters.directeur = options.directeurs[0];
        changed = true;
      }
      if (changed) {
        options = computeOptions(filters);
      }
    }
  }

  const anyActive = Boolean(filters.discipline || filters.laboratoire || filters.directeur);
  const matchedSubjects = anyActive
    ? publishedSubjects.filter(
        (s) =>
          (!filters.discipline || s.discipline === filters.discipline) &&
          (!filters.laboratoire || s.laboratoire === filters.laboratoire) &&
          (!filters.directeur || s.directeur === filters.directeur)
      )
    : [];

  return {
    effectiveFilters: filters,
    matchedSubjects,
    options,
  };
}

// ============================================================================
// GOOGLE-STYLE SMART SEARCH & SUGGESTIONS
// ============================================================================

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

const DOMAIN_EXPRESSIONS: string[] = [
  'Intelligence artificielle',
  'Apprentissage automatique',
  'Architecture microservices',
  'Systèmes embarqués',
  'Cybersécurité et réseaux',
  'Cryptographie post-quantique',
  'Transformation digitale',
  'Chaîne logistique',
  'Jumeaux numériques',
  'Fabrication additive',
  'Matériaux composites',
  'Maintenance prédictive',
  'Sobriété énergétique',
  'Biotechnologie alimentaire',
  'Emballages biodégradables',
];

export interface SmartSuggestion {
  kind: 'expression' | 'sujet';
  text: string;
  sujetId?: string;
  matchStart: number;
  matchLength: number;
}

export function subjectMatchesExpression(sujet: SujetRecord, expression: string): boolean {
  const normExpr = normalizeSearchText(expression);
  if (!normExpr) return false;
  const haystack = normalizeSearchText(
    `${sujet.intitule} ${sujet.discipline} ${sujet.description} ${sujet.laboratoire} ${sujet.directeur}`
  );
  if (haystack.includes(normExpr)) return true;

  const tokens = normExpr.split(/\s+/).filter((t) => t.length >= 3);
  if (tokens.length === 0) return false;
  return tokens.every((tok) => haystack.includes(tok));
}

function scoreCandidateText(text: string, normQuery: string): {
  rank: number; // 1 = string starts with, 2 = word starts with, 3 = contains, 4 = minor typo
  matchStart: number;
  matchLength: number;
} | null {
  const normText = normalizeSearchText(text);
  if (!normText || !normQuery) return null;

  if (normText.startsWith(normQuery)) {
    return { rank: 1, matchStart: 0, matchLength: normQuery.length };
  }

  const idx = normText.indexOf(normQuery);
  if (idx > 0) {
    const isWordBoundary = /[\s\-'’/(]/.test(normText[idx - 1]);
    return {
      rank: isWordBoundary ? 2 : 3,
      matchStart: idx,
      matchLength: normQuery.length,
    };
  }

  // Typo tolerance (distance <= 1) for queries of at least 4 chars against word prefixes
  if (normQuery.length >= 4) {
    const wordRegex = /[a-z0-9]+/g;
    let m: RegExpExecArray | null;
    while ((m = wordRegex.exec(normText)) !== null) {
      const word = m[0];
      const prefix = word.slice(0, normQuery.length);
      if (prefix.length >= 3 && levenshtein(prefix, normQuery) <= 1) {
        return {
          rank: 4,
          matchStart: m.index,
          matchLength: Math.min(word.length, normQuery.length),
        };
      }
    }
  }

  return null;
}

export function computeSmartSuggestions(
  publishedSubjects: SujetRecord[],
  rawQuery: string
): SmartSuggestion[] {
  const normQuery = normalizeSearchText(rawQuery);
  if (normQuery.length < 2) return [];

  const uniqueDisciplines = Array.from(new Set(publishedSubjects.map((s) => s.discipline)));
  const candidateExpressions = Array.from(new Set([...uniqueDisciplines, ...DOMAIN_EXPRESSIONS])).filter(
    (expr) => publishedSubjects.some((s) => subjectMatchesExpression(s, expr))
  );

  const scored: Array<SmartSuggestion & { rank: number }> = [];

  for (const expr of candidateExpressions) {
    const s = scoreCandidateText(expr, normQuery);
    if (s) {
      scored.push({
        kind: 'expression',
        text: expr,
        matchStart: s.matchStart,
        matchLength: s.matchLength,
        rank: s.rank,
      });
    }
  }

  for (const sujet of publishedSubjects) {
    const s = scoreCandidateText(sujet.intitule, normQuery);
    if (s) {
      scored.push({
        kind: 'sujet',
        text: sujet.intitule,
        sujetId: sujet.id,
        matchStart: s.matchStart,
        matchLength: s.matchLength,
        rank: s.rank,
      });
    }
  }

  scored.sort((a, b) => {
    if (a.rank !== b.rank) return a.rank - b.rank;
    if (a.kind !== b.kind) return a.kind === 'expression' ? -1 : 1;
    return a.text.localeCompare(b.text, 'fr');
  });

  const seen = new Set<string>();
  const finalList: SmartSuggestion[] = [];
  for (const item of scored) {
    const key = normalizeSearchText(item.text);
    if (seen.has(key)) continue;
    seen.add(key);
    finalList.push({
      kind: item.kind,
      text: item.text,
      sujetId: item.sujetId,
      matchStart: item.matchStart,
      matchLength: item.matchLength,
    });
    if (finalList.length >= 8) break;
  }

  return finalList;
}
