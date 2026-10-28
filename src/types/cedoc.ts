export type SubjectStatus = "brouillon" | "valide" | "publie" | "cloture";

export interface ThesisSubject {
  id: string;
  code: string;
  title: string;
  laboratory: string;
  discipline: string;
  thesisDirector: string;
  language: "Français" | "Anglais" | "Français / Anglais";
  keywords: string[];
  prerequisites: string;
  status: SubjectStatus;
}

export type RequiredDocSlot =
  | "CIN"
  | "DIPLOME_BAC5"
  | "RELEVES_NOTES"
  | "PROJET_THESE"
  | "CV";

export type AiConformityState = "conforme" | "douteux" | "non_conforme";

export interface DepositedPiece {
  slot: RequiredDocSlot;
  source:
    | "Base Interne USMBA"
    | "API Inter-Universitaire"
    | "Dépôt Manuel"
    | "Numérisé au Guichet";
  summaryText: string;
  aiState: AiConformityState;
  aiMotif: string;
  humanState: "en_attente" | "valide" | "rejete";
  correctionNote?: string;
}

export interface JuryMemberGrade {
  memberName: string;
  role: "Président du Jury" | "Directeur de Thèse" | "Membre Examinateur";
  dossierScore: number; // /40
  projectScore: number; // /30
  interviewScore: number; // /30
  submitted: boolean;
}

export interface CandidateApplication {
  id: string;
  dossierCode: string;
  fullName: string;
  cin: string;
  studentIdCne: string;
  email: string;
  phone: string;
  subjectCode: string;
  channel: "En ligne" | "Dépôt physique";
  receiptNumber?: string;
  pieces: DepositedPiece[];
  deadline: string;
  relanceCount: number;
  adminStatus: "en_cours" | "relance_delai" | "complet_forme" | "non_admis";
  juryGrades: JuryMemberGrade[];
  dossierScore: number; // moyenne /40
  projectScore: number; // moyenne /30
  interviewScore: number; // moyenne /30
  juryLocked: boolean;
  unlockReason?: string;
  attendanceStatus: "en_attente" | "confirme" | "desiste";
  confirmationDeadline?: string;
  notifiedChannels?: string[];
  recoursText?: string;
  recoursStatus?: "en_instruction" | "accepte" | "rejete";
  recoursDecisionNote?: string;
}

export interface ReenrollmentRecord {
  id: string;
  matricule: string;
  doctorantName: string;
  year: number; // 2, 3, 4+
  subjectTitle: string;
  thesisDirector: string;
  laboratory: string;
  renewedBaseDocs: string[];
  updatedPieces: string[];
  reportSubmitted: boolean;
  directorAvis: "en_attente" | "favorable" | "defavorable";
  labDirectorAvis: "en_attente" | "favorable" | "defavorable";
  cedocState: "en_attente" | "valide" | "bloque";
  blockMotif?: string;
  derogationRequested: boolean;
  derogationJustification?: string;
  derogationApproved?: boolean;
  dueDate: string;
  reminderSent?: boolean;
}
