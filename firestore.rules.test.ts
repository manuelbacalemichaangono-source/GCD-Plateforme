/**
 * Firestore Security Rules Adversarial Verification Suite ("Dirty Dozen")
 * Validates that all 12 attack vectors defined in security_spec.md return PERMISSION_DENIED.
 */

export interface AdversarialCase {
  id: number;
  name: string;
  auth: { uid: string; email: string } | null;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  path: string;
  payload?: Record<string, unknown>;
  expected: 'PERMISSION_DENIED';
}

export const DIRTY_DOZEN_CASES: AdversarialCase[] = [
  {
    id: 1,
    name: 'Self-Promotion to Directeur du CEDoc',
    auth: { uid: 'cand_1', email: 'hacker@gmail.com' },
    operation: 'create',
    path: '/personnel/hacker@gmail.com',
    payload: {
      email: 'hacker@gmail.com',
      nom: 'Hacker',
      roles: ['Directeur du CEDoc'],
      laboratoire: '',
      updatedAt: 'SERVER_TIMESTAMP',
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 2,
    name: 'PII Scraping on Other Candidature',
    auth: { uid: 'cand_1', email: 'cand1@gmail.com' },
    operation: 'get',
    path: '/candidatures/cand_2',
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 3,
    name: 'Candidature Status Shortcutting to Admis',
    auth: { uid: 'cand_1', email: 'cand1@gmail.com' },
    operation: 'update',
    path: '/candidatures/cand_1',
    payload: { statut: 'Admis', updatedAt: 'SERVER_TIMESTAMP' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 4,
    name: 'Shadow Ghost Field Injection',
    auth: { uid: 'cand_1', email: 'cand1@gmail.com' },
    operation: 'create',
    path: '/candidatures/cand_1',
    payload: { candidatId: 'cand_1', ghostAdmin: true },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 5,
    name: 'Candidate Self-Validating Piece as Conforme',
    auth: { uid: 'cand_1', email: 'cand1@gmail.com' },
    operation: 'create',
    path: '/candidatures/cand_1/pieces/cv',
    payload: { statut: 'Conforme' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 6,
    name: 'Oversized Piece (> 5 MB)',
    auth: { uid: 'cand_1', email: 'cand1@gmail.com' },
    operation: 'create',
    path: '/candidatures/cand_1/pieces/cv',
    payload: { sizeBytes: 10485760, statut: 'Reçue' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 7,
    name: 'Replacing Piece After Dossier Declared Complet',
    auth: { uid: 'cand_1', email: 'cand1@gmail.com' },
    operation: 'update',
    path: '/candidatures/cand_1/pieces/cv',
    payload: { fileName: 'new_cv.pdf', statut: 'Reçue' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 8,
    name: 'Candidate Reading Confidential AI Pre-check',
    auth: { uid: 'cand_1', email: 'cand1@gmail.com' },
    operation: 'get',
    path: '/candidatures/cand_1/precontrole/cv',
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 9,
    name: 'Thesis Director Publishing Subject Without Lab Validation',
    auth: { uid: 'prof_1', email: 'prof@usmba.ac.ma' },
    operation: 'create',
    path: '/sujets/sujet_new',
    payload: { statut: 'Publié' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 10,
    name: 'Cross-Laboratory Subject Validation',
    auth: { uid: 'dir_lisa', email: 'dir.lisa@usmba.ac.ma' },
    operation: 'update',
    path: '/sujets/sujet_lgim_1',
    payload: { statut: 'Publié' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 11,
    name: 'Secretariat Publishing Admis Before CEDoc Director Validation',
    auth: { uid: 'sec_1', email: 'sec@usmba.ac.ma' },
    operation: 'update',
    path: '/publication_admis/officielle',
    payload: { publieeParSecretariat: true },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 12,
    name: 'Forged Client Timestamp on Create',
    auth: { uid: 'cand_1', email: 'cand1@gmail.com' },
    operation: 'create',
    path: '/candidatures/cand_1',
    payload: { createdAt: '2020-01-01T00:00:00Z' },
    expected: 'PERMISSION_DENIED',
  },
];
