# Security Specification — GCD Platforme (CEDoc EST Fès)

## 1. Architectural & User Constraints
- **Explicit User Requirement on Email Verification**: Per Section 2 of user specifications (*"NO exijas email verificado"*), candidates and staff sign in with Email + Password (and reset password links) without blocking on `email_verified == true`. Identity is bound via `request.auth.uid` for candidates/doctorants and via Firebase Auth's unique normalized lowercase email (`request.auth.token.email.lower()`) matched against `/personnel/{emailLower}` for staff.
- **Seed Administrator**: `aladinmonroe0@gmail.com` may bootstrap `/personnel/aladinmonroe0@gmail.com` once (`!exists(...)`) with role `['Directeur du CEDoc']`. All subsequent staff accounts are created exclusively by `Directeur du CEDoc`.

## 2. Data Invariants
1. **Default Deny**: Any path not explicitly matched is unconditionally denied (`allow read, write: if false`).
2. **Personnel Isolation**: Only `Directeur du CEDoc` can list, create, update, or delete `/personnel/{emailId}` records (except the one-time bootstrap of `aladinmonroe0@gmail.com`). Regular authenticated users can `get` only their own `/personnel/{emailLower}` document to check if they hold a staff role.
3. **Public Subject Filtering**: Unauthenticated visitors and candidates may only read `/sujets` where `resource.data.statut == 'Publié'`. Unpublished (`En attente`, `Refusé`) subjects are restricted to `Directeur de thèse` (own subjects), `Directeur du laboratoire` (own laboratory), and `Directeur du CEDoc`.
4. **Candidature Ownership & State Integrity**:
   - A candidate can only read/write `/candidatures/{uid}` where `uid == request.auth.uid`.
   - Candidates can create a candidature only in `'Compte créé'` or `'En dépôt'` and transition it only up to `'Envoyée'`, or submit a `recours` when `'Non admis'`. Candidates can NEVER set administrative statuses (`Complet`, `Présélectionné`, `Convoqué`, `Admis`, `Inscrit`).
   - Only `Secrétariat CEDoc` can mark dossiers `Complet`, `Incomplet`, `Non admis` (expired deadline), or `Inscrit`.
   - Only `Jury` can transition dossiers through `Présélectionné`, `Non présélectionné`, `Convoqué`, `Admis`, `Non admis`.
5. **Document & AI Pre-check Confidentiality**:
   - Candidates can upload/replace `/candidatures/{uid}/pieces/{slotId}` only with `statut == 'Reçue'`, `sizeBytes <= 5242880`, and only while their parent candidature is not locked (`Compte créé`, `En dépôt`, `Envoyée`, or `Incomplet`).
   - `/candidatures/{uid}/precontrole/{slotId}` is strictly isolated to `Secrétariat CEDoc` (`allow get, create, update: if isSecretariat()`). Candidates have **zero** read or write access to AI pre-check evaluations.
6. **Official Admitted Publication Gate**:
   - `Directeur du CEDoc` sets `valideeParCedoc = true` on `/publication_admis/officielle`.
   - `Secrétariat CEDoc` can set `publieeParSecretariat = true` ONLY when `existing().valideeParCedoc == true`.
   - Candidates/public can `get` `/publication_admis/officielle` ONLY when `resource.data.publieeParSecretariat == true`.
7. **Zero `get()`/`exists()` Inside Subcollection `list`**:
   - Subcollection reads use `resource.data.ownerId == request.auth.uid` or single-document `get` on known fixed slot IDs (`identite`, `diplome`, `releves`, `projet`, `cv`), avoiding O(N) lookup explosions in `list`.

## 3. The "Dirty Dozen" Adversarial Payloads
1. **Self-Promotion to CEDoc Director**: Candidate writes `/personnel/hacker@gmail.com` with `roles: ['Directeur du CEDoc']` -> `PERMISSION_DENIED`.
2. **PII Scraping on Candidatures**: Candidate A lists `/candidatures` or gets `/candidatures/candidateB` -> `PERMISSION_DENIED`.
3. **Status Shortcutting**: Candidate updates own `/candidatures/{uid}` with `statut: 'Admis'` -> `PERMISSION_DENIED`.
4. **Shadow Field Injection**: Candidate creates `/candidatures/{uid}` with extra field `isAdmin: true` -> `PERMISSION_DENIED` (`hasOnly` check).
5. **Piece Self-Validation**: Candidate writes `/candidatures/{uid}/pieces/cv` with `statut: 'Conforme'` -> `PERMISSION_DENIED`.
6. **Oversized File Metadata**: Candidate writes piece with `sizeBytes: 99999999` (> 5 MB) -> `PERMISSION_DENIED`.
7. **Locked Dossier Tampering**: Candidate replaces a piece after parent candidature reached `'Complet'` -> `PERMISSION_DENIED` (Master Gate parent status check).
8. **AI Pre-Check Snooping**: Candidate reads `/candidatures/{uid}/precontrole/cv` -> `PERMISSION_DENIED`.
9. **Unvalidated Subject Publication**: `Directeur de thèse` creates `/sujets/s1` directly with `statut: 'Publié'` -> `PERMISSION_DENIED` (must be `'En attente'`).
10. **Cross-Lab Validation**: `Directeur du laboratoire` of `LISA` validates a subject belonging to `LGIM` -> `PERMISSION_DENIED`.
11. **Premature Admis Publication**: `Secrétariat CEDoc` sets `publieeParSecretariat: true` when `valideeParCedoc == false` -> `PERMISSION_DENIED`.
12. **Client Timestamp Forgery**: Candidate writes `createdAt` with a past/future timestamp `!= request.time` -> `PERMISSION_DENIED`.
