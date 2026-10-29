import express, { Request, Response, NextFunction } from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

const PORT = 3000;
const DATA_DIR = path.join(process.cwd(), ".data");
const STORE_PATH = path.join(DATA_DIR, "gcd-prod-store.json");

type UserRole =
  | "candidat"
  | "doctorant"
  | "scolarite"
  | "jury"
  | "directeur_these"
  | "directeur_labo"
  | "directeur_cedoc";

type SubjectStatus = "En attente de validation" | "Publié" | "Refusé";
type CandidatureStatus =
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

type PieceStatus = "Manquante" | "Reçue" | "Conforme" | "Non conforme";
type AiPrecheckStatus = "Conforme" | "Douteux" | "Non conforme";
type PieceSource =
  | "Dépôt candidat"
  | "Base interne EST Fès"
  | "API université externe";

type CandidatureSlot =
  | "CIN"
  | "DIPLOME"
  | "RELEVES_NOTES"
  | "CV"
  | "PROJET_THESE";

const CANDIDATURE_SLOTS: CandidatureSlot[] = [
  "CIN",
  "DIPLOME",
  "RELEVES_NOTES",
  "CV",
  "PROJET_THESE",
];

const CANDIDATURE_SLOT_LABELS: Record<CandidatureSlot, string> = {
  CIN: "Pièce d'identité (CIN / Passeport)",
  DIPLOME: "Diplôme Bac+5 (Master / Ingénieur)",
  RELEVES_NOTES: "Relevés de notes universitaires",
  CV: "Curriculum Vitae",
  PROJET_THESE: "Projet de thèse",
};

type ReinscriptionSlot =
  | "RAPPORT_AVANCEMENT"
  | "ATTESTATION_ENCADREMENT"
  | "PORTEFEUILLE_FORMATIONS";

interface StoredAccount {
  id: string;
  email: string;
  identifiant: string;
  fullName: string;
  passwordSalt: string;
  passwordHash: string;
  role: UserRole;
  laboratory: string;
  emailVerified: boolean;
  verificationToken?: string;
}

interface StoredSubject {
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

interface StoredPiece {
  slot: CandidatureSlot;
  fileName: string;
  source: PieceSource;
  status: PieceStatus;
  motif: string;
  aiStatus: AiPrecheckStatus | null;
  aiMotif: string;
  contentSample: string;
  updatedAt: string;
}

interface StoredCandidature {
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
  pieces: StoredPiece[];
  createdAt: string;
  updatedAt: string;
}

interface StoredReinscriptionPiece {
  slot: ReinscriptionSlot;
  fileName: string;
  status: PieceStatus;
  motif: string;
  updatedAt: string;
}

interface StoredReinscription {
  id: string;
  doctorantId: string;
  doctorantName: string;
  identifiant: string;
  yearLabel: string;
  subjectTitle: string;
  thesisDirector: string;
  laboratory: string;
  status: "En dépôt" | "Incomplet" | "Complet" | "Réinscrit" | "Rejeté";
  delai: string;
  pieces: StoredReinscriptionPiece[];
  updatedAt: string;
}

interface StoreShape {
  accounts: StoredAccount[];
  subjects: StoredSubject[];
  candidatures: StoredCandidature[];
  reinscriptions: StoredReinscription[];
  cedocGlobalValidated: boolean;
  officialListPublished: boolean;
  sessions: Record<string, { accountId: string; expiresAt: number }>;
}

function hashPassword(password: string, salt?: string) {
  const actualSalt = salt || crypto.randomBytes(16).toString("hex");
  const hash = crypto
    .scryptSync(password, actualSalt, 64)
    .toString("hex");
  return { salt: actualSalt, hash };
}

function verifyPassword(password: string, salt: string, expectedHash: string) {
  const computed = crypto.scryptSync(password, salt, 64);
  const expected = Buffer.from(expectedHash, "hex");
  if (computed.length !== expected.length) return false;
  return crypto.timingSafeEqual(computed, expected);
}

function makeAccount(params: {
  id: string;
  email: string;
  identifiant: string;
  fullName: string;
  password: string;
  role: UserRole;
  laboratory?: string;
  emailVerified?: boolean;
}): StoredAccount {
  const { salt, hash } = hashPassword(params.password);
  return {
    id: params.id,
    email: params.email.toLowerCase(),
    identifiant: params.identifiant.toLowerCase(),
    fullName: params.fullName,
    passwordSalt: salt,
    passwordHash: hash,
    role: params.role,
    laboratory: params.laboratory || "",
    emailVerified: params.emailVerified ?? true,
  };
}

function buildInitialStore(): StoreShape {
  const nowIso = "2026-10-29T09:00:00.000Z";

  // Comptes institutionnels créés par l'administration + 2 candidats existants
  const accounts: StoredAccount[] = [
    makeAccount({
      id: "acc_scolarite",
      email: "scolarite@usmba.ac.ma",
      identifiant: "scolarite",
      fullName: "Service Scolarité CEDoc",
      password: "Cedoc2026!",
      role: "scolarite",
    }),
    makeAccount({
      id: "acc_jury",
      email: "jury@usmba.ac.ma",
      identifiant: "jury",
      fullName: "Pr. Abdelilah Bennani (Président du Jury)",
      password: "Cedoc2026!",
      role: "jury",
    }),
    makeAccount({
      id: "dir_idrissi",
      email: "hassan.idrissi@usmba.ac.ma",
      identifiant: "hassan.idrissi",
      fullName: "Pr. Hassan Idrissi",
      password: "Cedoc2026!",
      role: "directeur_these",
      laboratory: "LISA",
    }),
    makeAccount({
      id: "dir_chraibi",
      email: "nadia.chraibi@usmba.ac.ma",
      identifiant: "nadia.chraibi",
      fullName: "Pr. Nadia Chraibi",
      password: "Cedoc2026!",
      role: "directeur_these",
      laboratory: "LISA",
    }),
    makeAccount({
      id: "dir_berrada",
      email: "karim.berrada@usmba.ac.ma",
      identifiant: "karim.berrada",
      fullName: "Pr. Karim Berrada",
      password: "Cedoc2026!",
      role: "directeur_these",
      laboratory: "LGE",
    }),
    makeAccount({
      id: "lab_lisa",
      email: "directeur.lisa@usmba.ac.ma",
      identifiant: "directeur.lisa",
      fullName: "Pr. Youssef Tazi (Directeur LISA)",
      password: "Cedoc2026!",
      role: "directeur_labo",
      laboratory: "LISA",
    }),
    makeAccount({
      id: "lab_lge",
      email: "directeur.lge@usmba.ac.ma",
      identifiant: "directeur.lge",
      fullName: "Pr. Mourad El Fassi (Directeur LGE)",
      password: "Cedoc2026!",
      role: "directeur_labo",
      laboratory: "LGE",
    }),
    makeAccount({
      id: "dir_cedoc",
      email: "directeur.cedoc@usmba.ac.ma",
      identifiant: "directeur.cedoc",
      fullName: "Pr. Omar Filali (Directeur du CEDoc)",
      password: "Cedoc2026!",
      role: "directeur_cedoc",
    }),
    makeAccount({
      id: "doc_rachid",
      email: "r.chraibi@usmba.ac.ma",
      identifiant: "r.chraibi",
      fullName: "Rachid Chraibi",
      password: "Cedoc2026!",
      role: "doctorant",
      laboratory: "LISA",
    }),
    makeAccount({
      id: "cand_yassine",
      email: "yassine.elamrani@usmba.ac.ma",
      identifiant: "yassine.elamrani@usmba.ac.ma",
      fullName: "Yassine El Amrani",
      password: "Candidat2026!",
      role: "candidat",
    }),
    makeAccount({
      id: "cand_meryem",
      email: "m.alaoui@um5.ac.ma",
      identifiant: "m.alaoui@um5.ac.ma",
      fullName: "Meryem Alaoui Sosse",
      password: "Candidat2026!",
      role: "candidat",
    }),
  ];

  // Exactement 4 sujets, 2 laboratoires (LISA, LGE), 2 disciplines, 3 directeurs
  const subjects: StoredSubject[] = [
    {
      id: "sujet_01",
      code: "CEDOC-01",
      title: "Apprentissage fédéré frugal pour le diagnostic médical distribué",
      laboratory: "LISA",
      discipline: "Informatique & IA",
      thesisDirector: "Pr. Hassan Idrissi",
      directorId: "dir_idrissi",
      language: "Français",
      prerequisites: "Master Recherche Informatique, IA ou Science des Données ; Python/PyTorch.",
      keywords: ["IA", "Apprentissage fédéré", "Diagnostic médical"],
      status: "Publié",
    },
    {
      id: "sujet_02",
      code: "CEDOC-02",
      title: "Détection d'anomalies cyber-physiques par réseaux de neurones sur graphes",
      laboratory: "LISA",
      discipline: "Informatique & IA",
      thesisDirector: "Pr. Nadia Chraibi",
      directorId: "dir_chraibi",
      language: "Anglais",
      prerequisites: "Master ou Diplôme d'Ingénieur Informatique, IA ou Cybersécurité.",
      keywords: ["GNN", "IA", "Systèmes cyber-physiques"],
      status: "Publié",
    },
    {
      id: "sujet_03",
      code: "CEDOC-03",
      title: "Gestion prédictive par intelligence artificielle des micro-réseaux photovoltaïques",
      laboratory: "LGE",
      discipline: "Informatique & IA",
      thesisDirector: "Pr. Karim Berrada",
      directorId: "dir_berrada",
      language: "Français",
      prerequisites: "Master IA appliquée ou Génie Électrique / Énergétique, modélisation prédictive.",
      keywords: ["IA", "Photovoltaïque", "Micro-réseaux"],
      status: "Publié",
    },
    {
      id: "sujet_04",
      code: "CEDOC-04",
      title: "Stockage thermique solaire à matériaux biosourcés à changement de phase",
      laboratory: "LGE",
      discipline: "Génie Énergétique & Matériaux",
      thesisDirector: "Pr. Karim Berrada",
      directorId: "dir_berrada",
      language: "Anglais",
      prerequisites: "Master Génie Énergétique ou Physique des Matériaux, simulation thermique.",
      keywords: ["Énergie solaire", "Matériaux", "Stockage thermique"],
      status: "Publié",
    },
  ];

  // Exactement 2 dossiers exemples : Yassine El Amrani et Meryem Alaoui Sosse
  const candidatures: StoredCandidature[] = [
    {
      id: "dos_yassine",
      candidateId: "cand_yassine",
      candidateName: "Yassine El Amrani",
      candidateEmail: "yassine.elamrani@usmba.ac.ma",
      cne: "N138492011",
      originInstitution: "EST Fès / USMBA",
      subjectId: "sujet_01",
      subjectCode: "CEDOC-01",
      subjectTitle: "Apprentissage fédéré frugal pour le diagnostic médical distribué",
      laboratory: "LISA",
      thesisDirector: "Pr. Hassan Idrissi",
      directorId: "dir_idrissi",
      status: "Complet",
      delai: "2026-11-15",
      nouveauDelai: "",
      convocationDate: "",
      convocationLieu: "",
      recoursMotif: "",
      cedocValidated: false,
      admisPublished: false,
      createdAt: nowIso,
      updatedAt: nowIso,
      pieces: [
        {
          slot: "CIN",
          fileName: "cin_yassine_elamrani.pdf",
          source: "Dépôt candidat",
          status: "Conforme",
          motif: "",
          aiStatus: "Conforme",
          aiMotif: "Identité et validité de la CIN concordantes avec le dossier.",
          contentSample: "CIN CD648291 - Yassine El Amrani - Valide 2031",
          updatedAt: nowIso,
        },
        {
          slot: "DIPLOME",
          fileName: "diplome_interne_est_fes_usmba.pdf",
          source: "Base interne EST Fès",
          status: "Conforme",
          motif: "",
          aiStatus: "Conforme",
          aiMotif: "Diplôme récupéré directement depuis la base interne (ancien étudiant EST Fès / USMBA).",
          contentSample: "Parcours DUT EST Fès & Master IA USMBA certifié",
          updatedAt: nowIso,
        },
        {
          slot: "RELEVES_NOTES",
          fileName: "releves_interne_est_fes_usmba.pdf",
          source: "Base interne EST Fès",
          status: "Conforme",
          motif: "",
          aiStatus: "Conforme",
          aiMotif: "Relevés universitaires certifiés issus de la base interne.",
          contentSample: "Relevés S1-S4 certifiés base interne",
          updatedAt: nowIso,
        },
        {
          slot: "CV",
          fileName: "cv_yassine_elamrani.pdf",
          source: "Dépôt candidat",
          status: "Conforme",
          motif: "",
          aiStatus: "Conforme",
          aiMotif: "Curriculum Vitae complet et lisible.",
          contentSample: "CV académique Yassine El Amrani",
          updatedAt: nowIso,
        },
        {
          slot: "PROJET_THESE",
          fileName: "projet_these_federated_learning.pdf",
          source: "Dépôt candidat",
          status: "Conforme",
          motif: "",
          aiStatus: "Conforme",
          aiMotif: "Projet de thèse structuré et conforme à l'intitulé CEDOC-01.",
          contentSample: "Projet de recherche apprentissage fédéré frugal",
          updatedAt: nowIso,
        },
      ],
    },
    {
      id: "dos_meryem",
      candidateId: "cand_meryem",
      candidateName: "Meryem Alaoui Sosse",
      candidateEmail: "m.alaoui@um5.ac.ma",
      cne: "R140092811",
      originInstitution: "Université Mohammed V de Rabat",
      subjectId: "sujet_02",
      subjectCode: "CEDOC-02",
      subjectTitle: "Détection d'anomalies cyber-physiques par réseaux de neurones sur graphes",
      laboratory: "LISA",
      thesisDirector: "Pr. Nadia Chraibi",
      directorId: "dir_chraibi",
      status: "En dépôt",
      delai: "2026-11-15",
      nouveauDelai: "",
      convocationDate: "",
      convocationLieu: "",
      recoursMotif: "",
      cedocValidated: false,
      admisPublished: false,
      createdAt: nowIso,
      updatedAt: nowIso,
      pieces: [
        {
          slot: "CIN",
          fileName: "cin_meryem_alaoui.pdf",
          source: "Dépôt candidat",
          status: "Reçue",
          motif: "",
          aiStatus: "Conforme",
          aiMotif: "Pièce d'identité nette, nom et numéro lisibles.",
          contentSample: "CIN FA192837 - Meryem Alaoui Sosse",
          updatedAt: nowIso,
        },
        {
          slot: "DIPLOME",
          fileName: "diplome_api_um5.pdf",
          source: "API université externe",
          status: "Conforme",
          motif: "",
          aiStatus: "Conforme",
          aiMotif: "Diplôme Master vérifié automatiquement via l'API inter-universitaire.",
          contentSample: "Master Cybersécurité UM5 Rabat certifié API",
          updatedAt: nowIso,
        },
        {
          slot: "RELEVES_NOTES",
          fileName: "releves_api_um5.pdf",
          source: "API université externe",
          status: "Conforme",
          motif: "",
          aiStatus: "Conforme",
          aiMotif: "Relevés universitaires transmis via l'API de l'université d'origine.",
          contentSample: "Relevés Master UM5 certifiés API",
          updatedAt: nowIso,
        },
        {
          slot: "CV",
          fileName: "cv_meryem_alaoui.pdf",
          source: "Dépôt candidat",
          status: "Reçue",
          motif: "",
          aiStatus: "Conforme",
          aiMotif: "Document complet correspondant au profil déclaré.",
          contentSample: "CV Meryem Alaoui Sosse",
          updatedAt: nowIso,
        },
        {
          slot: "PROJET_THESE",
          fileName: "scan_projet_gnn_incomplet.pdf",
          source: "Dépôt candidat",
          status: "Reçue",
          motif: "",
          aiStatus: "Douteux",
          aiMotif: "Dernière page tronquée et charte de thèse non signée.",
          contentSample: "Scan partiel projet GNN sans signature finale",
          updatedAt: nowIso,
        },
      ],
    },
  ];

  const reinscriptions: StoredReinscription[] = [
    {
      id: "reinsc_rachid",
      doctorantId: "doc_rachid",
      doctorantName: "Rachid Chraibi",
      identifiant: "r.chraibi",
      yearLabel: "2e année",
      subjectTitle: "Apprentissage fédéré frugal pour le diagnostic médical distribué",
      thesisDirector: "Pr. Hassan Idrissi",
      laboratory: "LISA",
      status: "En dépôt",
      delai: "2026-11-20",
      updatedAt: nowIso,
      pieces: [
        {
          slot: "RAPPORT_AVANCEMENT",
          fileName: "rapport_avancement_2A_rachid.pdf",
          status: "Reçue",
          motif: "",
          updatedAt: nowIso,
        },
        {
          slot: "ATTESTATION_ENCADREMENT",
          fileName: "autorisation_directeur_signee.pdf",
          status: "Conforme",
          motif: "",
          updatedAt: nowIso,
        },
        {
          slot: "PORTEFEUILLE_FORMATIONS",
          fileName: "",
          status: "Manquante",
          motif: "",
          updatedAt: nowIso,
        },
      ],
    },
  ];

  return {
    accounts,
    subjects,
    candidatures,
    reinscriptions,
    cedocGlobalValidated: false,
    officialListPublished: false,
    sessions: {},
  };
}

function loadStore(): StoreShape {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(STORE_PATH)) {
    const initial = buildInitialStore();
    fs.writeFileSync(STORE_PATH, JSON.stringify(initial, null, 2), "utf8");
    return initial;
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(STORE_PATH, "utf8")) as StoreShape;
    return parsed;
  } catch {
    const initial = buildInitialStore();
    fs.writeFileSync(STORE_PATH, JSON.stringify(initial, null, 2), "utf8");
    return initial;
  }
}

let store: StoreShape = loadStore();

function saveStore() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), "utf8");
}

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Règle métier : Si une candidature reste "Incomplet" après l'échéance du `nouveauDelai`,
 * son état passe automatiquement à "Non admis".
 */
function enforceAutomaticExpirations() {
  const today = todayIsoDate();
  let mutated = false;
  for (const c of store.candidatures) {
    if (
      c.status === "Incomplet" &&
      c.nouveauDelai &&
      today > c.nouveauDelai
    ) {
      c.status = "Non admis";
      c.updatedAt = new Date().toISOString();
      mutated = true;
    }
  }
  if (mutated) saveStore();
}

function toPublicCandidature(c: StoredCandidature) {
  const { pieces, ...rest } = c;
  return {
    ...rest,
    pieces: pieces.map((p) => ({
      slot: p.slot,
      fileName: p.fileName,
      source: p.source,
      status: p.status,
      motif: p.status === "Non conforme" ? p.motif : "",
      updatedAt: p.updatedAt,
    })),
  };
}

function sanitizeUser(acc: StoredAccount) {
  return {
    id: acc.id,
    email: acc.email,
    identifiant: acc.identifiant,
    fullName: acc.fullName,
    role: acc.role,
    laboratory: acc.laboratory,
    emailVerified: acc.emailVerified,
  };
}

interface AuthedRequest extends Request {
  user?: StoredAccount;
  token?: string;
}

function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7).trim()
    : "";
  if (!token) {
    return res.status(401).json({ error: "Authentification requise." });
  }
  const session = store.sessions[token];
  if (!session || session.expiresAt < Date.now()) {
    if (session) {
      delete store.sessions[token];
      saveStore();
    }
    return res.status(401).json({ error: "Session expirée. Veuillez vous reconnecter." });
  }
  const account = store.accounts.find((a) => a.id === session.accountId);
  if (!account) {
    return res.status(401).json({ error: "Compte introuvable." });
  }
  if (!account.emailVerified) {
    return res.status(403).json({
      error: "Veuillez vérifier votre adresse e-mail avant d'accéder à votre espace.",
      code: "EMAIL_NOT_VERIFIED",
    });
  }
  req.user = account;
  req.token = token;
  next();
}

function requireRoles(allowed: UserRole[]) {
  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    if (!req.user || !allowed.includes(req.user.role)) {
      return res.status(403).json({
        error: "Accès refusé pour votre rôle.",
      });
    }
    next();
  };
}

function createSessionToken(accountId: string): string {
  const token = crypto.randomBytes(32).toString("hex");
  store.sessions[token] = {
    accountId,
    expiresAt: Date.now() + 1000 * 60 * 60 * 24 * 7,
  };
  saveStore();
  return token;
}

function buildInitialPiecesForCandidate(
  cne: string,
  originInstitution: string
): StoredPiece[] {
  const nowIso = new Date().toISOString();
  const normalizedOrigin = originInstitution.trim().toLowerCase();
  const normalizedCne = cne.trim().toUpperCase();

  const isInternalEstUsmba =
    normalizedCne.length >= 4 &&
    (normalizedOrigin.includes("est fès") ||
      normalizedOrigin.includes("est fes") ||
      normalizedOrigin.includes("usmba"));

  const isPartnerApiAvailable =
    !isInternalEstUsmba &&
    normalizedCne.length >= 4 &&
    (normalizedOrigin.includes("mohammed v") ||
      normalizedOrigin.includes("um5") ||
      normalizedOrigin.includes("cadi ayyad") ||
      normalizedOrigin.includes("hassan ii") ||
      normalizedOrigin.includes("ibn tofail") ||
      normalizedOrigin.includes("abdelmalek"));

  return CANDIDATURE_SLOTS.map((slot) => {
    if (
      (slot === "DIPLOME" || slot === "RELEVES_NOTES") &&
      (isInternalEstUsmba || isPartnerApiAvailable)
    ) {
      const source: PieceSource = isInternalEstUsmba
        ? "Base interne EST Fès"
        : "API université externe";
      const fileName = isInternalEstUsmba
        ? `${slot.toLowerCase()}_base_interne_est_fes.pdf`
        : `${slot.toLowerCase()}_api_universite_partenaire.pdf`;
      return {
        slot,
        fileName,
        source,
        status: "Reçue",
        motif: "",
        aiStatus: "Conforme",
        aiMotif: isInternalEstUsmba
          ? "Pièce certifiée récupérée automatiquement depuis la base interne EST Fès / USMBA."
          : "Pièce académique récupérée automatiquement via l'API de l'université d'origine.",
        contentSample: `${CANDIDATURE_SLOT_LABELS[slot]} (${source}) - CNE ${normalizedCne}`,
        updatedAt: nowIso,
      };
    }

    return {
      slot,
      fileName: "",
      source: "Dépôt candidat",
      status: "Manquante",
      motif: "",
      aiStatus: null,
      aiMotif: "",
      contentSample: "",
      updatedAt: nowIso,
    };
  });
}

async function runGeminiPrecheck(params: {
  candidateName: string;
  slotLabel: string;
  fileName: string;
  contentSample: string;
}): Promise<{ aiStatus: AiPrecheckStatus; aiMotif: string }> {
  const fallback = (): { aiStatus: AiPrecheckStatus; aiMotif: string } => {
    const lower = `${params.fileName} ${params.contentSample}`.toLowerCase();
    if (lower.includes("illisible") || lower.includes("expire") || lower.includes("errone")) {
      return {
        aiStatus: "Non conforme",
        aiMotif: "Document signalé illisible ou non concordant lors du pré-contrôle.",
      };
    }
    if (lower.includes("incomplet") || lower.includes("sans signature") || lower.includes("brouillon")) {
      return {
        aiStatus: "Douteux",
        aiMotif: "Vérifier la signature ou l'intégralité des pages du document déposé.",
      };
    }
    return {
      aiStatus: "Conforme",
      aiMotif: `Format et intitulé cohérents avec la pièce attendue (${params.slotLabel}).`,
    };
  };

  if (!process.env.GEMINI_API_KEY) {
    return fallback();
  }

  try {
    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });

    const prompt = `Pré-contrôle documentaire destiné exclusivement au Secrétariat du CEDoc.
Évalue la pièce déposée sans jamais afficher de pourcentage. La décision finale appartient à l'agent humain.

Candidat : ${params.candidateName}
Type de pièce attendu : ${params.slotLabel}
Nom du fichier : ${params.fileName}
Extrait / métadonnées : "${params.contentSample}"

Retourne un JSON strict avec :
- status : "Conforme" | "Douteux" | "Non conforme"
- motif : explication factuelle concise en français (1 phrase, aucun pourcentage).`;

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            status: {
              type: Type.STRING,
              description: "Conforme, Douteux, ou Non conforme",
            },
            motif: {
              type: Type.STRING,
              description: "Motif factuel en français sans pourcentage",
            },
          },
          required: ["status", "motif"],
        },
      },
    });

    const parsed = JSON.parse(response.text || "{}");
    const validStatuses: AiPrecheckStatus[] = [
      "Conforme",
      "Douteux",
      "Non conforme",
    ];
    const aiStatus: AiPrecheckStatus = validStatuses.includes(parsed.status)
      ? parsed.status
      : "Conforme";
    const aiMotif =
      typeof parsed.motif === "string" && parsed.motif.trim()
        ? parsed.motif.replace(/\d+\s*%/g, "").trim().slice(0, 380)
        : fallback().aiMotif;

    return { aiStatus, aiMotif };
  } catch {
    return fallback();
  }
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: "8mb" }));

  // --- Endpoints publics (sans compte) ---

  app.get("/api/public/sujets", (_req, res) => {
    const published = store.subjects.filter((s) => s.status === "Publié");
    return res.json({ subjects: published });
  });

  app.get("/api/public/admis", (_req, res) => {
    enforceAutomaticExpirations();
    if (!store.officialListPublished) {
      return res.json({ published: false, list: [] });
    }
    const list = store.candidatures
      .filter((c) => c.admisPublished && (c.status === "Admis" || c.status === "Inscrit"))
      .map((c) => ({
        candidatureId: c.id,
        candidateName: c.candidateName,
        subjectCode: c.subjectCode,
        subjectTitle: c.subjectTitle,
        laboratory: c.laboratory,
        thesisDirector: c.thesisDirector,
      }));
    return res.json({ published: true, list });
  });

  // --- Authentification réelle ---

  app.post("/api/auth/login", (req, res) => {
    const rawLogin = String(req.body?.identifier || "").trim().toLowerCase();
    const password = String(req.body?.password || "");

    if (!rawLogin || !password) {
      return res.status(400).json({
        error: "Veuillez saisir votre identifiant (ou e-mail) et votre mot de passe.",
      });
    }

    const account = store.accounts.find(
      (a) => a.email === rawLogin || a.identifiant === rawLogin
    );

    if (
      !account ||
      !verifyPassword(password, account.passwordSalt, account.passwordHash)
    ) {
      return res.status(401).json({
        error: "Identifiants incorrects.",
      });
    }

    if (!account.emailVerified) {
      return res.status(403).json({
        error: "Votre adresse e-mail n'est pas encore vérifiée.",
        code: "EMAIL_NOT_VERIFIED",
        email: account.email,
        verificationToken: account.verificationToken,
      });
    }

    const token = createSessionToken(account.id);
    return res.json({
      token,
      user: sanitizeUser(account),
    });
  });

  // Création de compte strictement réservée aux Candidats (jamais Doctorant ni Personnel)
  app.post("/api/auth/register-candidat", (req, res) => {
    const fullName = String(req.body?.fullName || "").trim();
    const email = String(req.body?.email || "").trim().toLowerCase();
    const password = String(req.body?.password || "");
    const subjectId = String(req.body?.subjectId || "").trim();
    const cne = String(req.body?.cne || "").trim().toUpperCase();
    const originInstitution = String(req.body?.originInstitution || "").trim();
    const firebaseVerified = Boolean(req.body?.firebaseVerified);

    if (fullName.length < 2 || !email.includes("@") || password.length < 6) {
      return res.status(400).json({
        error: "Nom complet, adresse e-mail valide et mot de passe (6 caractères min.) requis.",
      });
    }

    const subject = store.subjects.find(
      (s) => s.id === subjectId && s.status === "Publié"
    );
    if (!subject) {
      return res.status(400).json({
        error: "Veuillez d'abord sélectionner un sujet de thèse publié.",
      });
    }

    const exists = store.accounts.find(
      (a) => a.email === email || a.identifiant === email
    );
    if (exists) {
      return res.status(409).json({
        error: "Un compte existe déjà avec cette adresse e-mail.",
      });
    }

    const accountId = `cand_${Date.now()}`;
    const verificationToken = crypto.randomBytes(20).toString("hex");
    const { salt, hash } = hashPassword(password);

    const newAccount: StoredAccount = {
      id: accountId,
      email,
      identifiant: email,
      fullName: fullName.slice(0, 120),
      passwordSalt: salt,
      passwordHash: hash,
      role: "candidat",
      laboratory: "",
      emailVerified: firebaseVerified,
      verificationToken: firebaseVerified ? undefined : verificationToken,
    };

    const nowIso = new Date().toISOString();
    const initialPieces = buildInitialPiecesForCandidate(cne, originInstitution);
    const hasAutoRetrieved = initialPieces.some((p) => p.status === "Reçue");

    // L'état "Compte créé" naît dès la création du compte avec le sujet choisi
    const newCandidature: StoredCandidature = {
      id: `dos_${Date.now()}`,
      candidateId: accountId,
      candidateName: newAccount.fullName,
      candidateEmail: email,
      cne: cne.slice(0, 40),
      originInstitution: originInstitution.slice(0, 120),
      subjectId: subject.id,
      subjectCode: subject.code,
      subjectTitle: subject.title,
      laboratory: subject.laboratory,
      thesisDirector: subject.thesisDirector,
      directorId: subject.directorId,
      status: hasAutoRetrieved ? "En dépôt" : "Compte créé",
      delai: "2026-11-30",
      nouveauDelai: "",
      convocationDate: "",
      convocationLieu: "",
      recoursMotif: "",
      cedocValidated: false,
      admisPublished: false,
      pieces: initialPieces,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    store.accounts.push(newAccount);
    store.candidatures.push(newCandidature);
    saveStore();

    if (firebaseVerified) {
      const token = createSessionToken(newAccount.id);
      return res.status(201).json({
        verified: true,
        token,
        user: sanitizeUser(newAccount),
      });
    }

    return res.status(201).json({
      verified: false,
      email,
      verificationToken,
      message: `Un lien de vérification a été généré pour ${email}.`,
    });
  });

  app.post("/api/auth/verify-email", (req, res) => {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const verificationToken = String(req.body?.verificationToken || "").trim();
    const firebaseConfirmed = Boolean(req.body?.firebaseConfirmed);

    const account = store.accounts.find(
      (a) => a.email === email && a.role === "candidat"
    );
    if (!account) {
      return res.status(404).json({ error: "Compte candidat introuvable." });
    }

    if (
      !firebaseConfirmed &&
      account.verificationToken &&
      account.verificationToken !== verificationToken
    ) {
      return res.status(400).json({ error: "Lien de vérification invalide." });
    }

    account.emailVerified = true;
    delete account.verificationToken;
    saveStore();

    const token = createSessionToken(account.id);
    return res.json({
      token,
      user: sanitizeUser(account),
    });
  });

  // Synchronisation d'une authentification Firebase réelle (Google OAuth / Firebase Email vérifié)
  app.post("/api/auth/firebase-session", async (req, res) => {
    const idToken = String(req.body?.idToken || "").trim();
    const subjectId = String(req.body?.subjectId || "").trim();
    const cne = String(req.body?.cne || "").trim().toUpperCase();
    const originInstitution = String(req.body?.originInstitution || "").trim();

    if (!idToken) {
      return res.status(400).json({ error: "Jeton Firebase manquant." });
    }

    try {
      // Validation du jeton auprès de l'API Identity Toolkit Google avec la clé publique du projet
      const configPath = path.join(process.cwd(), "firebase-applet-config.json");
      const fbConfig = JSON.parse(fs.readFileSync(configPath, "utf8"));
      const verifyResp = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${fbConfig.apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken }),
        }
      );
      if (!verifyResp.ok) {
        return res.status(401).json({ error: "Jeton Firebase invalide." });
      }
      const verifyData = (await verifyResp.json()) as {
        users?: {
          localId: string;
          email?: string;
          emailVerified?: boolean;
          displayName?: string;
        }[];
      };
      const fbUser = verifyData.users?.[0];
      if (!fbUser || !fbUser.email) {
        return res.status(401).json({ error: "Utilisateur Firebase invalide." });
      }
      if (!fbUser.emailVerified) {
        return res.status(403).json({
          error: "Veuillez vérifier votre adresse e-mail puis réessayer.",
          code: "EMAIL_NOT_VERIFIED",
        });
      }

      const email = fbUser.email.toLowerCase();

      // Correspondance avec un compte existant (Personnel, Doctorant ou Candidat)
      let account = store.accounts.find((a) => a.email === email);

      // Si l'administrateur du projet se connecte avec son compte institutionnel Google
      if (!account && email === "manuelbacale.michaangono@usmba.ac.ma") {
        account = store.accounts.find((a) => a.id === "acc_scolarite");
      }

      if (!account) {
        // Nouveau candidat : nécessite un sujet sélectionné pour créer l'état "Compte créé"
        const subject = store.subjects.find(
          (s) => s.id === subjectId && s.status === "Publié"
        );
        if (!subject) {
          return res.status(400).json({
            error: "Sélectionnez d'abord un sujet de thèse pour créer votre compte candidat.",
            code: "SUBJECT_REQUIRED",
          });
        }

        const newId = `cand_${fbUser.localId.slice(0, 24)}`;
        const { salt, hash } = hashPassword(crypto.randomBytes(24).toString("hex"));
        account = {
          id: newId,
          email,
          identifiant: email,
          fullName: (fbUser.displayName || email.split("@")[0]).slice(0, 120),
          passwordSalt: salt,
          passwordHash: hash,
          role: "candidat",
          laboratory: "",
          emailVerified: true,
        };

        const nowIso = new Date().toISOString();
        const initialPieces = buildInitialPiecesForCandidate(cne, originInstitution);
        const hasAutoRetrieved = initialPieces.some((p) => p.status === "Reçue");

        store.accounts.push(account);
        store.candidatures.push({
          id: `dos_${Date.now()}`,
          candidateId: account.id,
          candidateName: account.fullName,
          candidateEmail: email,
          cne: cne.slice(0, 40),
          originInstitution: originInstitution.slice(0, 120),
          subjectId: subject.id,
          subjectCode: subject.code,
          subjectTitle: subject.title,
          laboratory: subject.laboratory,
          thesisDirector: subject.thesisDirector,
          directorId: subject.directorId,
          status: hasAutoRetrieved ? "En dépôt" : "Compte créé",
          delai: "2026-11-30",
          nouveauDelai: "",
          convocationDate: "",
          convocationLieu: "",
          recoursMotif: "",
          cedocValidated: false,
          admisPublished: false,
          pieces: initialPieces,
          createdAt: nowIso,
          updatedAt: nowIso,
        });
        saveStore();
      } else if (!account.emailVerified) {
        account.emailVerified = true;
        saveStore();
      }

      const token = createSessionToken(account.id);
      return res.json({
        token,
        user: sanitizeUser(account),
      });
    } catch {
      return res.status(500).json({
        error: "Impossible de valider la session Firebase.",
      });
    }
  });

  app.get("/api/auth/me", requireAuth, (req: AuthedRequest, res) => {
    return res.json({ user: sanitizeUser(req.user!) });
  });

  app.post("/api/auth/logout", requireAuth, (req: AuthedRequest, res) => {
    if (req.token) {
      delete store.sessions[req.token];
      saveStore();
    }
    return res.json({ ok: true });
  });

  // --- Espace Candidat (strictement isolé à sa propre candidature, zéro donnée IA) ---

  app.get(
    "/api/candidat/dossier",
    requireAuth,
    requireRoles(["candidat"]),
    (req: AuthedRequest, res) => {
      enforceAutomaticExpirations();
      const cand = store.candidatures.find(
        (c) => c.candidateId === req.user!.id
      );
      return res.json({
        candidature: cand ? toPublicCandidature(cand) : null,
      });
    }
  );

  app.post(
    "/api/candidat/upload-piece",
    requireAuth,
    requireRoles(["candidat"]),
    async (req: AuthedRequest, res) => {
      enforceAutomaticExpirations();
      const slot = String(req.body?.slot || "") as CandidatureSlot;
      const fileName = String(req.body?.fileName || "").trim().slice(0, 180);
      const contentSample = String(req.body?.contentSample || "")
        .trim()
        .slice(0, 600);

      if (!CANDIDATURE_SLOTS.includes(slot) || !fileName) {
        return res.status(400).json({ error: "Pièce ou fichier invalide." });
      }

      const cand = store.candidatures.find(
        (c) => c.candidateId === req.user!.id
      );
      if (!cand) {
        return res.status(404).json({ error: "Aucune candidature active." });
      }

      if (!["Compte créé", "En dépôt", "Incomplet"].includes(cand.status)) {
        return res.status(403).json({
          error: "Le dépôt de pièces n'est plus ouvert pour l'état actuel de votre candidature.",
        });
      }

      const activeDeadline = cand.nouveauDelai || cand.delai;
      if (activeDeadline && todayIsoDate() > activeDeadline) {
        if (cand.status === "Incomplet") {
          cand.status = "Non admis";
          saveStore();
        }
        return res.status(403).json({
          error: "Le délai de dépôt est dépassé.",
        });
      }

      const piece = cand.pieces.find((p) => p.slot === slot);
      if (!piece) {
        return res.status(404).json({ error: "Emplacement de pièce introuvable." });
      }

      if (piece.status === "Conforme") {
        return res.status(403).json({
          error: "Cette pièce a déjà été déclarée conforme.",
        });
      }

      if (cand.status === "Incomplet" && piece.status !== "Non conforme" && piece.status !== "Manquante") {
        return res.status(403).json({
          error: "Seules les pièces manquantes ou non conformes peuvent être déposées durant le nouveau délai.",
        });
      }

      const aiResult = await runGeminiPrecheck({
        candidateName: cand.candidateName,
        slotLabel: CANDIDATURE_SLOT_LABELS[slot],
        fileName,
        contentSample: contentSample || fileName,
      });

      const nowIso = new Date().toISOString();
      piece.fileName = fileName;
      piece.source = "Dépôt candidat";
      piece.status = "Reçue";
      piece.motif = "";
      piece.aiStatus = aiResult.aiStatus;
      piece.aiMotif = aiResult.aiMotif;
      piece.contentSample = contentSample || fileName;
      piece.updatedAt = nowIso;

      if (cand.status === "Compte créé") {
        cand.status = "En dépôt";
      }
      cand.updatedAt = nowIso;
      saveStore();

      return res.json({
        candidature: toPublicCandidature(cand),
      });
    }
  );

  app.post(
    "/api/candidat/sync-academic",
    requireAuth,
    requireRoles(["candidat"]),
    (req: AuthedRequest, res) => {
      const cne = String(req.body?.cne || "").trim().toUpperCase().slice(0, 40);
      const originInstitution = String(req.body?.originInstitution || "")
        .trim()
        .slice(0, 120);

      const cand = store.candidatures.find(
        (c) => c.candidateId === req.user!.id
      );
      if (!cand) {
        return res.status(404).json({ error: "Candidature introuvable." });
      }
      if (!["Compte créé", "En dépôt", "Incomplet"].includes(cand.status)) {
        return res.status(403).json({ error: "Dossier verrouillé." });
      }

      cand.cne = cne;
      cand.originInstitution = originInstitution;
      const synced = buildInitialPiecesForCandidate(cne, originInstitution);
      let retrievedCount = 0;

      for (const sp of synced) {
        if (sp.status === "Reçue" && sp.source !== "Dépôt candidat") {
          const target = cand.pieces.find((p) => p.slot === sp.slot);
          if (target && target.status !== "Conforme") {
            Object.assign(target, sp);
            retrievedCount++;
          }
        }
      }

      if (retrievedCount > 0 && cand.status === "Compte créé") {
        cand.status = "En dépôt";
      }
      cand.updatedAt = new Date().toISOString();
      saveStore();

      return res.json({
        retrievedCount,
        candidature: toPublicCandidature(cand),
      });
    }
  );

  app.post(
    "/api/candidat/recours",
    requireAuth,
    requireRoles(["candidat"]),
    (req: AuthedRequest, res) => {
      enforceAutomaticExpirations();
      const motif = String(req.body?.motif || "").trim().slice(0, 500);
      if (motif.length < 5) {
        return res.status(400).json({
          error: "Veuillez préciser le motif de votre recours.",
        });
      }

      const cand = store.candidatures.find(
        (c) => c.candidateId === req.user!.id
      );
      if (!cand) {
        return res.status(404).json({ error: "Candidature introuvable." });
      }
      if (cand.status !== "Non admis") {
        return res.status(403).json({
          error: "Le recours est uniquement ouvert pour une candidature Non admis.",
        });
      }
      if (cand.recoursMotif) {
        return res.status(409).json({
          error: "Un recours a déjà été enregistré pour ce dossier.",
        });
      }

      cand.recoursMotif = motif;
      cand.updatedAt = new Date().toISOString();
      saveStore();

      return res.json({ candidature: toPublicCandidature(cand) });
    }
  );

  // --- Espace Doctorant (Ma réinscription 2A/3A+) ---

  app.get(
    "/api/doctorant/reinscription",
    requireAuth,
    requireRoles(["doctorant"]),
    (req: AuthedRequest, res) => {
      const rec = store.reinscriptions.find(
        (r) => r.doctorantId === req.user!.id
      );
      return res.json({ reinscription: rec || null });
    }
  );

  app.post(
    "/api/doctorant/upload-piece",
    requireAuth,
    requireRoles(["doctorant"]),
    (req: AuthedRequest, res) => {
      const slot = String(req.body?.slot || "") as ReinscriptionSlot;
      const fileName = String(req.body?.fileName || "").trim().slice(0, 180);

      const rec = store.reinscriptions.find(
        (r) => r.doctorantId === req.user!.id
      );
      if (!rec) {
        return res.status(404).json({ error: "Dossier de réinscription introuvable." });
      }
      if (!["En dépôt", "Incomplet"].includes(rec.status)) {
        return res.status(403).json({
          error: "Le dépôt est fermé pour l'état actuel de votre réinscription.",
        });
      }
      if (rec.delai && todayIsoDate() > rec.delai) {
        return res.status(403).json({ error: "Le délai de réinscription est dépassé." });
      }

      const piece = rec.pieces.find((p) => p.slot === slot);
      if (!piece || !fileName) {
        return res.status(400).json({ error: "Pièce ou fichier invalide." });
      }
      if (piece.status === "Conforme") {
        return res.status(403).json({ error: "Cette pièce est déjà déclarée conforme." });
      }

      const nowIso = new Date().toISOString();
      piece.fileName = fileName;
      piece.status = "Reçue";
      piece.motif = "";
      piece.updatedAt = nowIso;
      rec.updatedAt = nowIso;
      saveStore();

      return res.json({ reinscription: rec });
    }
  );

  // --- Espace Secrétariat / Scolarité CEDoc (Acteur récepteur) ---

  app.get(
    "/api/scolarite/data",
    requireAuth,
    requireRoles(["scolarite"]),
    (_req, res) => {
      enforceAutomaticExpirations();
      return res.json({
        candidatures: store.candidatures,
        reinscriptions: store.reinscriptions,
        cedocGlobalValidated: store.cedocGlobalValidated,
        officialListPublished: store.officialListPublished,
      });
    }
  );

  app.post(
    "/api/scolarite/piece-decision",
    requireAuth,
    requireRoles(["scolarite"]),
    (req, res) => {
      const candidatureId = String(req.body?.candidatureId || "");
      const slot = String(req.body?.slot || "") as CandidatureSlot;
      const decision = String(req.body?.decision || "");
      const motif = String(req.body?.motif || "").trim().slice(0, 400);

      const cand = store.candidatures.find((c) => c.id === candidatureId);
      if (!cand) {
        return res.status(404).json({ error: "Dossier introuvable." });
      }
      const piece = cand.pieces.find((p) => p.slot === slot);
      if (!piece || piece.status === "Manquante") {
        return res.status(400).json({ error: "Aucune pièce reçue sur cet emplacement." });
      }

      if (decision === "Conforme") {
        piece.status = "Conforme";
        piece.motif = "";
      } else if (decision === "Non conforme") {
        if (!motif) {
          return res.status(400).json({
            error: "Le motif est obligatoire pour déclarer une pièce non conforme.",
          });
        }
        piece.status = "Non conforme";
        piece.motif = motif;
      } else {
        return res.status(400).json({ error: "Décision invalide." });
      }

      piece.updatedAt = new Date().toISOString();
      cand.updatedAt = piece.updatedAt;
      saveStore();
      return res.json({ candidature: cand });
    }
  );

  app.post(
    "/api/scolarite/recheck-ai",
    requireAuth,
    requireRoles(["scolarite"]),
    async (req, res) => {
      const candidatureId = String(req.body?.candidatureId || "");
      const slot = String(req.body?.slot || "") as CandidatureSlot;

      const cand = store.candidatures.find((c) => c.id === candidatureId);
      const piece = cand?.pieces.find((p) => p.slot === slot);
      if (!cand || !piece || piece.status === "Manquante") {
        return res.status(404).json({ error: "Pièce introuvable." });
      }

      const aiRes = await runGeminiPrecheck({
        candidateName: cand.candidateName,
        slotLabel: CANDIDATURE_SLOT_LABELS[slot],
        fileName: piece.fileName,
        contentSample: piece.contentSample || piece.fileName,
      });

      piece.aiStatus = aiRes.aiStatus;
      piece.aiMotif = aiRes.aiMotif;
      saveStore();
      return res.json({ candidature: cand });
    }
  );

  app.post(
    "/api/scolarite/dossier-completeness",
    requireAuth,
    requireRoles(["scolarite"]),
    (req, res) => {
      const candidatureId = String(req.body?.candidatureId || "");
      const action = String(req.body?.action || "");
      const nouveauDelai = String(req.body?.nouveauDelai || "").trim();

      const cand = store.candidatures.find((c) => c.id === candidatureId);
      if (!cand) {
        return res.status(404).json({ error: "Dossier introuvable." });
      }

      if (action === "Complet") {
        const allConforme = cand.pieces.every((p) => p.status === "Conforme");
        if (!allConforme) {
          return res.status(400).json({
            error: "Toutes les pièces doivent être validées (Conforme) avant de déclarer le dossier complet.",
          });
        }
        cand.status = "Complet";
        cand.nouveauDelai = "";
      } else if (action === "Incomplet") {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(nouveauDelai)) {
          return res.status(400).json({
            error: "Veuillez fixer une date valide pour le nouveau délai.",
          });
        }
        cand.status = "Incomplet";
        cand.nouveauDelai = nouveauDelai;
      } else {
        return res.status(400).json({ error: "Action invalide." });
      }

      cand.updatedAt = new Date().toISOString();
      enforceAutomaticExpirations();
      saveStore();
      return res.json({ candidature: cand });
    }
  );

  app.post(
    "/api/scolarite/publier-admis",
    requireAuth,
    requireRoles(["scolarite"]),
    (_req, res) => {
      if (!store.cedocGlobalValidated) {
        return res.status(403).json({
          error: "La publication n'est active qu'après validation par le Directeur du CEDoc.",
        });
      }

      const nowIso = new Date().toISOString();
      store.officialListPublished = true;
      for (const c of store.candidatures) {
        if (c.status === "Admis" || c.status === "Inscrit") {
          c.admisPublished = true;
          c.updatedAt = nowIso;
        }
      }
      saveStore();
      return res.json({
        officialListPublished: store.officialListPublished,
        candidatures: store.candidatures,
      });
    }
  );

  app.post(
    "/api/scolarite/inscrire",
    requireAuth,
    requireRoles(["scolarite"]),
    (req, res) => {
      const candidatureId = String(req.body?.candidatureId || "");
      const cand = store.candidatures.find((c) => c.id === candidatureId);
      if (!cand || cand.status !== "Admis" || !cand.admisPublished) {
        return res.status(400).json({
          error: "Seul un candidat Admis sur liste publiée peut passer à l'état Inscrit.",
        });
      }
      cand.status = "Inscrit";
      cand.updatedAt = new Date().toISOString();
      saveStore();
      return res.json({ candidature: cand });
    }
  );

  app.post(
    "/api/scolarite/reinscription-piece",
    requireAuth,
    requireRoles(["scolarite"]),
    (req, res) => {
      const reinscriptionId = String(req.body?.reinscriptionId || "");
      const slot = String(req.body?.slot || "") as ReinscriptionSlot;
      const decision = String(req.body?.decision || "");
      const motif = String(req.body?.motif || "").trim().slice(0, 400);

      const rec = store.reinscriptions.find((r) => r.id === reinscriptionId);
      const piece = rec?.pieces.find((p) => p.slot === slot);
      if (!rec || !piece || piece.status === "Manquante") {
        return res.status(400).json({ error: "Pièce introuvable." });
      }

      if (decision === "Conforme") {
        piece.status = "Conforme";
        piece.motif = "";
      } else if (decision === "Non conforme") {
        if (!motif) {
          return res.status(400).json({ error: "Motif requis." });
        }
        piece.status = "Non conforme";
        piece.motif = motif;
      } else {
        return res.status(400).json({ error: "Décision invalide." });
      }
      piece.updatedAt = new Date().toISOString();
      rec.updatedAt = piece.updatedAt;
      saveStore();
      return res.json({ reinscription: rec });
    }
  );

  app.post(
    "/api/scolarite/reinscription-status",
    requireAuth,
    requireRoles(["scolarite"]),
    (req, res) => {
      const reinscriptionId = String(req.body?.reinscriptionId || "");
      const status = String(req.body?.status || "") as StoredReinscription["status"];
      const delai = String(req.body?.delai || "").trim();

      const rec = store.reinscriptions.find((r) => r.id === reinscriptionId);
      if (!rec) {
        return res.status(404).json({ error: "Dossier introuvable." });
      }
      if (status === "Réinscrit" && !rec.pieces.every((p) => p.status === "Conforme")) {
        return res.status(400).json({
          error: "Toutes les pièces doivent être conformes avant de valider la réinscription.",
        });
      }
      rec.status = status;
      if (delai) rec.delai = delai;
      rec.updatedAt = new Date().toISOString();
      saveStore();
      return res.json({ reinscription: rec });
    }
  );

  // --- Espace Jury / Président (Saisie des résultats sans notes) ---

  app.get(
    "/api/jury/dossiers",
    requireAuth,
    requireRoles(["jury"]),
    (_req, res) => {
      enforceAutomaticExpirations();
      const eligibleStatuses: CandidatureStatus[] = [
        "Complet",
        "Présélectionné",
        "Non présélectionné",
        "Convoqué",
        "Admis",
        "Non admis",
        "Inscrit",
      ];
      const dossiers = store.candidatures
        .filter((c) => eligibleStatuses.includes(c.status))
        .map(toPublicCandidature);
      return res.json({ dossiers });
    }
  );

  app.post(
    "/api/jury/decision",
    requireAuth,
    requireRoles(["jury"]),
    (req, res) => {
      const candidatureId = String(req.body?.candidatureId || "");
      const action = String(req.body?.action || "");
      const convocationDate = String(req.body?.convocationDate || "").trim().slice(0, 40);
      const convocationLieu = String(req.body?.convocationLieu || "").trim().slice(0, 160);

      const cand = store.candidatures.find((c) => c.id === candidatureId);
      if (!cand) {
        return res.status(404).json({ error: "Candidature introuvable." });
      }

      if (action === "Présélectionné" || action === "Non présélectionné") {
        if (!["Complet", "Présélectionné", "Non présélectionné"].includes(cand.status)) {
          return res.status(400).json({
            error: "La présélection ne s'applique qu'aux dossiers déclarés Complets.",
          });
        }
        cand.status = action;
      } else if (action === "Convoqué") {
        if (!["Présélectionné", "Convoqué"].includes(cand.status)) {
          return res.status(400).json({
            error: "Le candidat doit être Présélectionné avant l'envoi de la convocation.",
          });
        }
        if (!convocationDate || !convocationLieu) {
          return res.status(400).json({
            error: "Date/heure et lieu de convocation obligatoires.",
          });
        }
        cand.status = "Convoqué";
        cand.convocationDate = convocationDate;
        cand.convocationLieu = convocationLieu;
      } else if (action === "Admis" || action === "Non admis") {
        if (!["Présélectionné", "Convoqué", "Admis", "Non admis"].includes(cand.status)) {
          return res.status(400).json({
            error: "Le candidat doit avoir été présélectionné/convoqué avant la décision finale.",
          });
        }
        cand.status = action;
        if (action === "Admis") {
          store.cedocGlobalValidated = false;
        }
      } else {
        return res.status(400).json({ error: "Décision invalide." });
      }

      cand.updatedAt = new Date().toISOString();
      saveStore();
      return res.json({ candidature: toPublicCandidature(cand) });
    }
  );

  // --- Espace Directeur de thèse (Mes sujets + Candidats en lecture seule) ---

  app.get(
    "/api/directeur-these/data",
    requireAuth,
    requireRoles(["directeur_these"]),
    (req: AuthedRequest, res) => {
      enforceAutomaticExpirations();
      const mySubjects = store.subjects.filter(
        (s) => s.directorId === req.user!.id
      );
      const myCandidates = store.candidatures
        .filter((c) => c.directorId === req.user!.id)
        .map(toPublicCandidature);
      return res.json({
        subjects: mySubjects,
        candidatures: myCandidates,
      });
    }
  );

  app.post(
    "/api/directeur-these/sujet",
    requireAuth,
    requireRoles(["directeur_these"]),
    (req: AuthedRequest, res) => {
      const id = String(req.body?.id || "").trim();
      const title = String(req.body?.title || "").trim().slice(0, 240);
      const discipline = String(req.body?.discipline || "").trim().slice(0, 120);
      const language = String(req.body?.language || "").trim().slice(0, 60);
      const prerequisites = String(req.body?.prerequisites || "").trim().slice(0, 500);
      const keywordsRaw = String(req.body?.keywords || "");
      const keywords = keywordsRaw
        .split(",")
        .map((k) => k.trim().slice(0, 60))
        .filter(Boolean)
        .slice(0, 10);

      if (title.length < 5 || discipline.length < 2 || language.length < 2) {
        return res.status(400).json({
          error: "Intitulé, discipline et langue sont obligatoires.",
        });
      }

      if (id) {
        const existing = store.subjects.find(
          (s) => s.id === id && s.directorId === req.user!.id
        );
        if (!existing) {
          return res.status(404).json({ error: "Sujet introuvable." });
        }
        existing.title = title;
        existing.discipline = discipline;
        existing.language = language;
        existing.prerequisites = prerequisites;
        existing.keywords = keywords;
        existing.status = "En attente de validation";
        saveStore();
        return res.json({ subject: existing });
      }

      const nextNum = store.subjects.length + 1;
      const newSubject: StoredSubject = {
        id: `sujet_0${nextNum}_${Date.now()}`,
        code: `CEDOC-0${nextNum}`,
        title,
        laboratory: req.user!.laboratory || "LISA",
        discipline,
        thesisDirector: req.user!.fullName,
        directorId: req.user!.id,
        language,
        prerequisites,
        keywords,
        status: "En attente de validation",
      };

      store.subjects.push(newSubject);
      saveStore();
      return res.status(201).json({ subject: newSubject });
    }
  );

  // --- Espace Directeur du laboratoire (Valider / publier les sujets du laboratoire) ---

  app.get(
    "/api/directeur-labo/sujets",
    requireAuth,
    requireRoles(["directeur_labo"]),
    (req: AuthedRequest, res) => {
      const labSubjects = store.subjects.filter(
        (s) => s.laboratory === req.user!.laboratory
      );
      return res.json({
        laboratory: req.user!.laboratory,
        subjects: labSubjects,
      });
    }
  );

  app.post(
    "/api/directeur-labo/statut",
    requireAuth,
    requireRoles(["directeur_labo"]),
    (req: AuthedRequest, res) => {
      const subjectId = String(req.body?.subjectId || "");
      const status = String(req.body?.status || "") as SubjectStatus;

      if (!["Publié", "Refusé", "En attente de validation"].includes(status)) {
        return res.status(400).json({ error: "Statut invalide." });
      }

      const subject = store.subjects.find(
        (s) => s.id === subjectId && s.laboratory === req.user!.laboratory
      );
      if (!subject) {
        return res.status(404).json({ error: "Sujet introuvable dans votre laboratoire." });
      }

      subject.status = status;
      saveStore();
      return res.json({ subject });
    }
  );

  // --- Espace Directeur du CEDoc (Validation finale de la liste des admis) ---

  app.get(
    "/api/directeur-cedoc/admis",
    requireAuth,
    requireRoles(["directeur_cedoc"]),
    (_req, res) => {
      enforceAutomaticExpirations();
      const admitted = store.candidatures
        .filter((c) => c.status === "Admis" || c.status === "Inscrit")
        .map(toPublicCandidature);
      return res.json({
        admitted,
        cedocGlobalValidated: store.cedocGlobalValidated,
        officialListPublished: store.officialListPublished,
      });
    }
  );

  app.post(
    "/api/directeur-cedoc/valider",
    requireAuth,
    requireRoles(["directeur_cedoc"]),
    (_req, res) => {
      const admitted = store.candidatures.filter(
        (c) => c.status === "Admis" || c.status === "Inscrit"
      );
      if (admitted.length === 0) {
        return res.status(400).json({
          error: "Aucun candidat à l'état Admis à valider.",
        });
      }

      const nowIso = new Date().toISOString();
      store.cedocGlobalValidated = true;
      for (const c of admitted) {
        c.cedocValidated = true;
        c.updatedAt = nowIso;
      }
      saveStore();
      return res.json({
        cedocGlobalValidated: true,
        admitted: admitted.map(toPublicCandidature),
      });
    }
  );

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`GCD Platform sur http://0.0.0.0:${PORT}`);
  });
}

startServer();
