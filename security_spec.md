# Security Specification — GCD Platform (CEDoc EST Fès / USMBA)

## 1. Data Invariants

1. **Default-Deny Catch-All**: Unmatched paths in Firestore are unconditionally denied (`allow read, write: if false;`).
2. **Email Verification & Anti-Spoofing**: Every authenticated write and every email-based role lookup requires `request.auth != null && request.auth.token.email_verified == true`.
3. **Zero Self-Assigned Privileged Roles**: Self-registration on `/users/{userId}` can ONLY assign `role == 'candidat'`. Roles `doctorant`, `scolarite`, `jury`, `directeur_these`, `directeur_labo`, and `directeur_cedoc` require either an existing verified `/staff_registry/{email}` document matching that exact role or `isAdmin()`.
4. **PII Split-Collection Isolation**: Emails and student CNE identifiers live exclusively in `/user_private/{userId}`, readable ONLY by `isOwner(userId) || isAdmin()`.
5. **Candidate Data Isolation**: A `candidat` can ONLY read/create/update their own `/candidatures/{candidatureId}` (`candidateUid == request.auth.uid`) and `/candidatures/{candidatureId}/pieces/{pieceId}`.
6. **AI Pre-Check Isolation (System/Receptor-Only)**: `/candidatures/{candidatureId}/ai_controls/{pieceId}` is strictly inaccessible (`read` and `write` denied) to candidates, jury, thesis directors, and lab directors; ONLY `scolarite` and `isAdmin()` may read or write AI pre-checks.
7. **Candidate Cannot Validate Pieces**: Candidates may ONLY create or update a piece with `status == 'Reçue'` and `motif == ''` (never `Conforme` or `Non conforme`), and ONLY when the parent candidature is in `['Compte créé', 'En dépôt', 'Incomplet']`.
8. **Double Gate for Official Publication**: `admisPublished` on `/candidatures/{candidatureId}` and creation in `/admis_publies/{candidatureId}` require `scolarite` AND `cedocValidated == true` (set previously by `directeur_cedoc`).
9. **Terminal State Locking**: Once a candidature reaches `'Inscrit'` (or `'Non présélectionné'`), further non-admin mutations are blocked (except `'Recours'` motif submission by the candidate when `'Non admis'`).
10. **Zero `get()` in `allow list`**: Every `allow list` rule evaluates `resource.data` directly without `get()` or `exists()` calls to prevent O(n) cost amplification.

## 2. The "Dirty Dozen" Payloads (All Must Return `PERMISSION_DENIED`)

1. **Privilege Escalation on Registration**: Authenticated user writes `/users/{uid}` with `{ role: "scolarite" }` without a matching `/staff_registry` entry.
2. **Unverified Email Spoofing**: Attacker signs up with `manuelbacale.michaangono@usmba.ac.ma` (`email_verified: false`) and attempts admin read/write.
3. **Cross-Candidate Dossier Read**: Candidate `uid_A` attempts `get` or `list` on `/candidatures/cand_B` owned by `uid_B`.
4. **Candidate Reads AI Pre-Control**: Candidate `uid_A` attempts `get` on `/candidatures/cand_A/ai_controls/CIN`.
5. **Candidate Self-Validates Document**: Candidate `uid_A` updates `/candidatures/cand_A/pieces/CIN` with `{ status: "Conforme" }`.
6. **Ghost Field Shadow Update**: Candidate updates `/candidatures/cand_A` adding `{ isVerified: true }`.
7. **State Shortcutting by Candidate**: Candidate updates `/candidatures/cand_A` from `'En dépôt'` directly to `'Admis'`.
8. **Jury Evaluates Incomplete Dossier**: Jury member attempts to set `'Présélectionné'` on a candidature whose current status is `'En dépôt'`.
9. **Premature Publication Without CEDoc Director Validation**: `scolarite` attempts to create `/admis_publies/cand_A` when `/candidatures/cand_A.cedocValidated == false`.
10. **PII Leak Across Users**: Authenticated staff or candidate `uid_X` attempts `get` on `/user_private/uid_Y`.
11. **ID / Value Poisoning (1MB Payload)**: Attacker sends a 5,000-character string into `title` or junk characters in `{sujetId}`.
12. **Client-Forged Timestamp**: Client writes `createdAt` or `updatedAt` with a past/future timestamp not equal to `request.time`.
