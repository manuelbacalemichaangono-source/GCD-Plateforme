export type StatutSujet = 'En attente' | 'Publié' | 'Refusé' | 'Rejeté' | 'Attribué';

export type StatutCandidature =
  | 'Compte créé'
  | 'En dépôt'
  | 'Envoyée'
  | 'Incomplet'
  | 'Complet'
  | 'Présélectionné'
  | 'Non présélectionné'
  | 'Convoqué'
  | 'Admis'
  | 'Non admis';

export type StatutPiece = 'Manquante' | 'Reçue' | 'Conforme' | 'Non conforme';

export type PieceSlotPreselection = 'cv' | 'dut_licence' | 'diplome' | 'releves' | 'projet';

export interface SujetRecord {
  id: string;
  intitule: string;
  description: string;
  discipline: string;
  directeur: string;
  directeurEmail: string;
  laboratoire: string;
  statut: StatutSujet;
  prerequis?: string;
  actif?: boolean;
  ecarte?: boolean;
  attribue?: boolean;
  candidatRetenuNom?: string;
  candidatRetenuEmail?: string;
}

export interface DirecteurProfile {
  id: string;
  nom: string;
  prenom: string;
  nomComplet: string;
  email: string;
  telephone?: string;
  grade?: string;
  etablissement?: string;
  departement?: string;
  avatarUrl?: string;
}

export interface CandidaturePourDirecteur {
  id: string;
  candidatId: string;
  candidatNom: string;
  candidatPrenom: string;
  candidatEmail: string;
  candidatTelephone: string;
  cne: string;
  etablissementOrigine: string;
  diplomeObtenu: string;
  sujetId: string;
  sujetIntitule: string;
  directeurNom: string;
  dateDepot: string;
  decisionDirecteur: 'En attente' | 'Retenue' | 'Rejetée';
  motifRejet?: string;
  pieces: Record<string, { fileName: string; type: string; downloadUrl?: string; sizeFormatted?: string; dateFormatted?: string; previewUrl?: string }>;
}

export interface LaboratoireRecord {
  id: string;
  code: string;
  nom: string;
  directeurs: string[];
  disciplines: string[];
}

export interface PieceDossierRecord {
  ownerId: string;
  slotId: PieceSlotPreselection;
  label: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  storagePath: string;
  downloadUrl: string;
  sourceAuto: boolean;
  statut: StatutPiece;
  motif?: string;
  updatedAt?: string;
}

export interface CandidatureRecord {
  candidatId: string;
  nom: string;
  prenom?: string;
  email: string;
  telephone?: string;
  cne: string;
  universiteOrigine: 'EST Fès' | 'Autre' | '';
  recuperationAuto: boolean;
  sujetsChoisis: SujetRecord[];
  statut: StatutCandidature;
  dateSoumission?: string;
  convocationDate?: string;
  convocationLieu?: string;
  nouveauDelai?: string;
  motifRejet?: string;
}

export interface CandidateProfile {
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  cne: string;
  etablissementOrigine: string;
  diplomeObtenu: string;
  anneeDiplome: string;
  avatarUrl?: string;
}

export const PRESELECTION_SLOTS: Array<{
  slotId: PieceSlotPreselection;
  label: string;
  description: string;
  autoEligible: boolean;
}> = [
  {
    slotId: 'cv',
    label: 'CV académique et scientifique',
    description: 'Parcours universitaire détaillé, compétences techniques, stages et publications éventuelles (PDF, max 5 Mo).',
    autoEligible: false,
  },
  {
    slotId: 'dut_licence',
    label: 'Diplôme de DUT ou Titre de Licence',
    description: 'Copie du diplôme de DUT, Licence professionnelle ou fondamentale (PDF, max 5 Mo).',
    autoEligible: true,
  },
  {
    slotId: 'diplome',
    label: 'Copie du diplôme de Master ou Ingénieur',
    description: 'Attestation de réussite ou diplôme officiel certifié conforme (PDF, max 5 Mo).',
    autoEligible: true,
  },
  {
    slotId: 'releves',
    label: 'Relevés de notes universitaires',
    description: 'Relevés globaux des semestres de Licence et de Master/Ingénieur (PDF, max 5 Mo).',
    autoEligible: true,
  },
  {
    slotId: 'projet',
    label: 'Avant-projet de recherche de thèse',
    description: 'Note de cadrage synthétique (2 à 4 pages) précisant la problématique, les objectifs et la méthodologie (PDF, max 5 Mo).',
    autoEligible: false,
  },
];

export interface TimelineStep {
  id: string;
  title: string;
  subtitle: string;
  state: 'validee' | 'action_requise' | 'en_attente';
  dateInfo?: string;
  note?: string;
}
