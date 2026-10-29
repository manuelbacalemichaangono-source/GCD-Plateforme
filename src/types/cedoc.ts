export type UserRole =
  | "candidat"
  | "doctorant"
  | "scolarite"
  | "jury"
  | "directeur_these"
  | "directeur_labo"
  | "directeur_cedoc";

export const ROLE_ROUTES: Record<UserRole, string> = {
  candidat: "/candidat",
  doctorant: "/doctorant",
  scolarite: "/scolarite",
  jury: "/jury",
  directeur_these: "/directeur-these",
  directeur_labo: "/directeur-laboratoire",
  directeur_cedoc: "/directeur-cedoc",
};

export const ROLE_LABELS: Record<UserRole, string> = {
  candidat: "Candidat",
  doctorant: "Doctorant",
  scolarite: "Secrétariat / Scolarité CEDoc",
  jury: "Jury / Président",
  directeur_these: "Directeur de thèse",
  directeur_labo: "Directeur du laboratoire",
  directeur_cedoc: "Directeur du CEDoc",
};

export type SubjectStatus = "En attente de validation" | "Publié" | "Refusé";

export interface ThesisSubject {
  id: string;
  code: string;
  title: string;
  laboratory: string;
  discipline: string;
  thesisDirector: string;
  directorId: string;
  language: string;
  prerequisites: string;
  keywords: string[];
  status: SubjectStatus;
}

export type CandidatureStatus =
  | "Compte créé"
  | "En dépôt"
  | "Incomplet"
  | "Complet"
  | "Présélectionné"
  | "Non présélectionné"
  | "Convoqué"
  | "Admis"
  | "Non admis"
  | "Inscrit";

export type PieceStatus =
  | "Manquante"
  | "Reçue"
  | "Conforme"
  | "Non conforme";

export type AiPrecheckStatus = "Conforme" | "Douteux" | "Non conforme";

export type PieceSource =
  | "Dépôt candidat"
  | "Base interne EST Fès"
  | "API université externe";

export type CandidatureSlot =
  | "CIN"
  | "DIPLOME"
  | "RELEVES_NOTES"
  | "CV"
  | "PROJET_THESE";

export const CANDIDATURE_SLOTS: CandidatureSlot[] = [
  "CIN",
  "DIPLOME",
  "RELEVES_NOTES",
  "CV",
  "PROJET_THESE",
];

export const CANDIDATURE_SLOT_LABELS: Record<CandidatureSlot, string> = {
  CIN: "Pièce d'identité (CIN / Passeport)",
  DIPLOME: "Diplôme Bac+5 (Master / Ingénieur)",
  RELEVES_NOTES: "Relevés de notes universitaires",
  CV: "Curriculum Vitae",
  PROJET_THESE: "Projet de thèse",
};

/**
 * Vue Candidat d'une pièce : strictement sans données d'analyse IA.
 */
export interface CandidaturePiecePublic {
  slot: CandidatureSlot;
  fileName: string;
  source: PieceSource;
  status: PieceStatus;
  motif: string;
  updatedAt: string;
}

/**
 * Vue Secrétariat / Scolarité CEDoc d'une pièce : inclut le pré-contrôle IA.
 */
export interface CandidaturePieceReceptor extends CandidaturePiecePublic {
  aiStatus: AiPrecheckStatus | null;
  aiMotif: string;
  contentSample?: string;
}

export interface CandidaturePublic {
  id: string;
  candidateId: string;
  candidateName: string;
  candidateEmail: string;
  cne: string;
  originInstitution: string;
  subjectId: string;
  subjectCode: string;
  subjectTitle: string;
  laboratory: string;
  thesisDirector: string;
  directorId: string;
  status: CandidatureStatus;
  delai: string;
  nouveauDelai: string;
  convocationDate: string;
  convocationLieu: string;
  recoursMotif: string;
  cedocValidated: boolean;
  admisPublished: boolean;
  pieces: CandidaturePiecePublic[];
  createdAt: string;
  updatedAt: string;
}

export interface CandidatureReceptor extends Omit<CandidaturePublic, "pieces"> {
  pieces: CandidaturePieceReceptor[];
}

export interface PublishedAdmittedItem {
  candidatureId: string;
  candidateName: string;
  subjectCode: string;
  subjectTitle: string;
  laboratory: string;
  thesisDirector: string;
}

export type ReinscriptionSlot =
  | "RAPPORT_AVANCEMENT"
  | "ATTESTATION_ENCADREMENT"
  | "PORTEFEUILLE_FORMATIONS";

export const REINSCRIPTION_SLOTS: ReinscriptionSlot[] = [
  "RAPPORT_AVANCEMENT",
  "ATTESTATION_ENCADREMENT",
  "PORTEFEUILLE_FORMATIONS",
];

export const REINSCRIPTION_SLOT_LABELS: Record<ReinscriptionSlot, string> = {
  RAPPORT_AVANCEMENT: "Rapport annuel d'avancement des travaux",
  ATTESTATION_ENCADREMENT: "Autorisation de réinscription du directeur de thèse",
  PORTEFEUILLE_FORMATIONS: "Attestation des formations complémentaires",
};

export type ReinscriptionStatus =
  | "En dépôt"
  | "Incomplet"
  | "Complet"
  | "Réinscrit"
  | "Rejeté";

export interface ReinscriptionPiece {
  slot: ReinscriptionSlot;
  fileName: string;
  status: PieceStatus;
  motif: string;
  updatedAt: string;
}

export interface ReinscriptionRecord {
  id: string;
  doctorantId: string;
  doctorantName: string;
  identifiant: string;
  yearLabel: string;
  subjectTitle: string;
  thesisDirector: string;
  laboratory: string;
  status: ReinscriptionStatus;
  delai: string;
  pieces: ReinscriptionPiece[];
  updatedAt: string;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  identifiant: string;
  fullName: string;
  role: UserRole;
  laboratory: string;
  emailVerified: boolean;
}
