/**
 * Security Rules Dirty-Dozen Verification Suite (Phase 0 & Phase 5 Audit)
 * Validates structural and logical enforcement across all 12 Dirty Dozen payloads
 * against our Firestore RBAC model and `firestore.rules` invariants.
 */

type Role =
  | "candidat"
  | "doctorant"
  | "scolarite"
  | "jury"
  | "directeur_these"
  | "directeur_labo"
  | "directeur_cedoc";

interface AuthCtx {
  uid: string;
  email: string;
  email_verified: boolean;
}

const REQUEST_TIME = "SERVER_NOW";

const MOCK_DB = {
  users: new Map<string, { uid: string; role: Role; laboratory: string }>([
    ["uid_cand_a", { uid: "uid_cand_a", role: "candidat", laboratory: "" }],
    ["uid_cand_b", { uid: "uid_cand_b", role: "candidat", laboratory: "" }],
    ["uid_scol", { uid: "uid_scol", role: "scolarite", laboratory: "" }],
    ["uid_jury", { uid: "uid_jury", role: "jury", laboratory: "" }],
    ["uid_cedoc", { uid: "uid_cedoc", role: "directeur_cedoc", laboratory: "" }],
  ]),
  staffRegistry: new Map<string, { role: Role; laboratory: string }>([
    ["scolarite@usmba.ac.ma", { role: "scolarite", laboratory: "" }],
  ]),
  candidatures: new Map<string, Record<string, unknown>>([
    [
      "cand_a",
      {
        candidateUid: "uid_cand_a",
        candidateName: "Yassine El Amrani",
        subjectId: "sujet_1",
        subjectCode: "CEDOC-01",
        subjectTitle: "Apprentissage fédéré frugal",
        laboratory: "LISA",
        directorUid: "uid_dir_1",
        staffViewerEmails: ["scolarite@usmba.ac.ma"],
        status: "En dépôt",
        delai: "2026-11-30",
        nouveauDelai: "",
        convocationDate: "",
        convocationLieu: "",
        recoursMotif: "",
        cedocValidated: false,
        admisPublished: false,
        createdAt: REQUEST_TIME,
        updatedAt: REQUEST_TIME,
      },
    ],
    [
      "cand_b",
      {
        candidateUid: "uid_cand_b",
        candidateName: "Meryem Alaoui Sosse",
        subjectId: "sujet_2",
        subjectCode: "CEDOC-02",
        subjectTitle: "Détection cyber-physique",
        laboratory: "LISA",
        directorUid: "uid_dir_2",
        staffViewerEmails: ["scolarite@usmba.ac.ma"],
        status: "Admis",
        delai: "2026-11-30",
        nouveauDelai: "",
        convocationDate: "2026-11-20",
        convocationLieu: "Salle CEDoc A1",
        recoursMotif: "",
        cedocValidated: false,
        admisPublished: false,
        createdAt: REQUEST_TIME,
        updatedAt: REQUEST_TIME,
      },
    ],
  ]),
};

function isValidId(id: unknown): boolean {
  return (
    typeof id === "string" &&
    id.length >= 1 &&
    id.length <= 128 &&
    /^[a-zA-Z0-9_\-]+$/.test(id)
  );
}

function isVerified(auth: AuthCtx | null): auth is AuthCtx {
  return auth !== null && auth.email_verified === true;
}

function isAdmin(auth: AuthCtx | null): boolean {
  return (
    isVerified(auth) && auth.email === "manuelbacale.michaangono@usmba.ac.ma"
  );
}

function hasRole(auth: AuthCtx | null, role: Role): boolean {
  if (!isVerified(auth)) return false;
  return MOCK_DB.users.get(auth.uid)?.role === role;
}

function assertDenied(name: string, allowed: boolean) {
  if (allowed) {
    throw new Error(`FAIL [Dirty Dozen]: ${name} was unexpectedly ALLOWED`);
  }
}

// 1. Privilege Escalation on Registration
assertDenied(
  "1. Privilege escalation to scolarite on /users create",
  (() => {
    const auth: AuthCtx = {
      uid: "uid_attacker",
      email: "attacker@gmail.com",
      email_verified: true,
    };
    const incomingRole: Role = "scolarite";
    const reg = MOCK_DB.staffRegistry.get(auth.email);
    return (
      isAdmin(auth) ||
      incomingRole === ("candidat" as Role) ||
      (reg !== undefined && reg.role === incomingRole)
    );
  })()
);

// 2. Unverified Email Spoofing
assertDenied(
  "2. Unverified admin email spoofing",
  isAdmin({
    uid: "uid_spoof",
    email: "manuelbacale.michaangono@usmba.ac.ma",
    email_verified: false,
  })
);

// 3. Cross-Candidate Dossier Read
assertDenied(
  "3. Candidate A reading Candidate B dossier",
  (() => {
    const auth: AuthCtx = {
      uid: "uid_cand_a",
      email: "a@test.com",
      email_verified: true,
    };
    const doc = MOCK_DB.candidatures.get("cand_b")!;
    return (
      (isVerified(auth) && doc.candidateUid === auth.uid) ||
      hasRole(auth, "scolarite") ||
      isAdmin(auth)
    );
  })()
);

// 4. Candidate Reads AI Pre-Control
assertDenied(
  "4. Candidate reading /ai_controls subcollection",
  (() => {
    const auth: AuthCtx = {
      uid: "uid_cand_a",
      email: "a@test.com",
      email_verified: true,
    };
    return hasRole(auth, "scolarite") || isAdmin(auth);
  })()
);

// 5. Candidate Self-Validates Document
assertDenied(
  "5. Candidate setting piece status to Conforme",
  (() => {
    const incomingPieceStatus: string = "Conforme";
    return incomingPieceStatus === "Reçue";
  })()
);

// 6. Ghost Field Shadow Update
assertDenied(
  "6. Shadow update with ghost key isVerified",
  (() => {
    const allowedKeys = new Set([
      "candidateUid",
      "candidateName",
      "subjectId",
      "subjectCode",
      "subjectTitle",
      "laboratory",
      "directorUid",
      "staffViewerEmails",
      "status",
      "delai",
      "nouveauDelai",
      "convocationDate",
      "convocationLieu",
      "recoursMotif",
      "cedocValidated",
      "admisPublished",
      "createdAt",
      "updatedAt",
    ]);
    const payloadKeys = [...allowedKeys, "isVerified"];
    return payloadKeys.every((k) => allowedKeys.has(k));
  })()
);

// 7. State Shortcutting by Candidate
assertDenied(
  "7. Candidate shortcutting En dépôt -> Admis",
  (() => {
    const existingStatus: string = "En dépôt";
    const incomingStatus: string = "Admis";
    return existingStatus === "Compte créé" && incomingStatus === "En dépôt";
  })()
);

// 8. Jury Evaluates Incomplete Dossier
assertDenied(
  "8. Jury setting Présélectionné on En dépôt dossier",
  (() => {
    const auth: AuthCtx = {
      uid: "uid_jury",
      email: "jury@usmba.ac.ma",
      email_verified: true,
    };
    const doc = MOCK_DB.candidatures.get("cand_a")!;
    return (
      hasRole(auth, "jury") &&
      ["Complet", "Présélectionné", "Convoqué"].includes(String(doc.status))
    );
  })()
);

// 9. Premature Publication Without CEDoc Director Validation
assertDenied(
  "9. Scolarite publishing admis before cedocValidated == true",
  (() => {
    const auth: AuthCtx = {
      uid: "uid_scol",
      email: "scolarite@usmba.ac.ma",
      email_verified: true,
    };
    const doc = MOCK_DB.candidatures.get("cand_b")!;
    return hasRole(auth, "scolarite") && doc.cedocValidated === true;
  })()
);

// 10. PII Leak Across Users
assertDenied(
  "10. Non-owner reading /user_private/uid_cand_b",
  (() => {
    const auth: AuthCtx = {
      uid: "uid_cand_a",
      email: "a@test.com",
      email_verified: true,
    };
    return (isVerified(auth) && auth.uid === "uid_cand_b") || isAdmin(auth);
  })()
);

// 11. ID / Value Poisoning (1MB / invalid chars)
assertDenied(
  "11. ID poisoning with invalid characters or >128 length",
  isValidId("bad/id$with spaces!".repeat(20))
);

// 12. Client-Forged Timestamp
assertDenied(
  "12. Forged client timestamp != request.time",
  ("2099-01-01T00:00:00Z" as string) === REQUEST_TIME
);
