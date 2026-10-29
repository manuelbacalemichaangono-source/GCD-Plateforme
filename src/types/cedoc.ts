export type PersonnelRole =
  | 'Secrétariat CEDoc'
  | 'Jury'
  | 'Directeur de thèse'
  | 'Directeur du laboratoire'
  | 'Directeur du CEDoc';

export const ALL_PERSONNEL_ROLES: PersonnelRole[] = [
  'Secrétariat CEDoc',
  'Jury',
  'Directeur de thèse',
  'Directeur du laboratoire',
  'Directeur du CEDoc',
];

export type StatutSujet = 'En attente' | 'Publié' | 'Refusé';

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
  | 'Non admis'
  | 'Inscrit';

export type StatutPiece = 'Manquante' | 'Reçue' | 'Conforme' | 'Non conforme';

export type StatutPrecontroleIA = 'Conforme' | 'Douteux' | 'Non conforme';

export type StatutReinscription = 'En dépôt' | 'Envoyée' | 'Incomplet' | 'Validée';

export type PieceSlotCandidature = 'identite' | 'diplome' | 'releves' | 'projet' | 'cv';

export type PieceSlotReinscription =
  | 'rapport_avancement'
  | 'attestation_encadrant'
  | 'charte_signee';

export interface PersonnelRecord {
  email: string;
  nom: string;
  roles: PersonnelRole[];
  laboratoire: string;
}

export interface LaboratoireRecord {
  id: string;
  code: string;
  nom: string;
  directeurs: string[];
  disciplines: string[];
}

export interface SujetRecord {
  id: string;
  intitule: string;
  description: string;
  discipline: string;
  directeur: string;
  directeurEmail: string;
  laboratoire: string;
  statut: StatutSujet;
}

export interface CandidatureRecord {
  candidatId: string;
  nom: string;
  email: string;
  sujetId: string;
  sujetIntitule: string;
  sujetDescription: string;
  sujetDiscipline: string;
  directeur: string;
  directeurEmail: string;
  laboratoire: string;
  universiteOrigine: '' | 'EST Fès' | 'Autre';
  cne: string;
  recuperationAuto: boolean;
  statut: StatutCandidature;
  nouveauDelai: string;
  convocationDate: string;
  convocationLieu: string;
  recoursDepose: boolean;
  recoursMotif: string;
}

export interface PieceDossierRecord {
  ownerId: string;
  slotId: string;
  label: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  storagePath: string;
  downloadUrl: string;
  sourceAuto: boolean;
  statut: StatutPiece;
  motif: string;
}

export interface PrecontroleIARecord {
  candidatId: string;
  slotId: string;
  statut: StatutPrecontroleIA;
  motif: string;
  fileName: string;
}

export interface ReinscriptionRecord {
  doctorantId: string;
  nom: string;
  email: string;
  annee: number;
  sujetIntitule: string;
  directeur: string;
  laboratoire: string;
  statut: StatutReinscription;
  nouveauDelai: string;
}

export interface PublicationAdmisRecord {
  valideeParCedoc: boolean;
  publieeParSecretariat: boolean;
  admis: string[];
}

export const CANDIDATURE_SLOTS: Array<{
  slotId: PieceSlotCandidature;
  label: string;
  autoEligible: boolean;
}> = [
  { slotId: 'identite', label: "Pièce d'identité", autoEligible: false },
  { slotId: 'diplome', label: 'Diplôme Master / Ingénieur', autoEligible: true },
  { slotId: 'releves', label: 'Relevés de notes', autoEligible: true },
  { slotId: 'projet', label: 'Projet de thèse', autoEligible: false },
  { slotId: 'cv', label: 'CV scientifique', autoEligible: false },
];

export const REINSCRIPTION_SLOTS: Array<{
  slotId: PieceSlotReinscription;
  label: string;
}> = [
  { slotId: 'rapport_avancement', label: "Rapport d'avancement" },
  { slotId: 'attestation_encadrant', label: 'Attestation du directeur de thèse' },
  { slotId: 'charte_signee', label: 'Charte des thèses signée' },
];
