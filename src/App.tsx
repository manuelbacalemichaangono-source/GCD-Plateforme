/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import {
  ThesisSubject,
  SubjectStatus,
  CandidateApplication,
  ReenrollmentRecord,
} from "./types/cedoc";
import {
  INITIAL_SUBJECTS,
  INITIAL_CANDIDATES,
  INITIAL_REENROLLMENTS,
} from "./data/cedocData";
import { CandidateWorkspace } from "./components/CandidateWorkspace";
import { GovernanceWorkspace } from "./components/GovernanceWorkspace";

export default function App() {
  const [space, setSpace] = useState<"candidat" | "gestion">("candidat");

  const [subjects, setSubjects] = useState<ThesisSubject[]>(INITIAL_SUBJECTS);
  const [candidates, setCandidates] =
    useState<CandidateApplication[]>(INITIAL_CANDIDATES);
  const [reenrollments, setReenrollments] =
    useState<ReenrollmentRecord[]>(INITIAL_REENROLLMENTS);

  const [presidentSigned, setPresidentSigned] = useState(true);
  const [cedocDirectorSigned, setCedocDirectorSigned] = useState(false);
  const [principalQuota, setPrincipalQuota] = useState(2);

  const handleUpdateSubjectStatus = (id: string, status: SubjectStatus) => {
    setSubjects((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status } : s))
    );
  };

  const handleCreateCandidate = (app: CandidateApplication) => {
    setCandidates((prev) => [app, ...prev]);
  };

  const handleUpdateCandidate = (updated: CandidateApplication) => {
    setCandidates((prev) =>
      prev.map((c) => (c.id === updated.id ? updated : c))
    );
  };

  const handleUpdateReenrollment = (updated: ReenrollmentRecord) => {
    setReenrollments((prev) =>
      prev.map((r) => (r.id === updated.id ? updated : r))
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* Barre supérieure épurée : uniquement "GCD Platforme" et le basculement entre les 2 espaces demandés */}
      <header className="bg-white border-b border-slate-200 px-6 py-2.5 flex items-center justify-between gap-8">
        <span className="font-display text-sm font-bold tracking-tight text-slate-950 whitespace-nowrap shrink-0">
          GCD Platforme
        </span>

        <div className="flex items-center gap-1 p-0.5 bg-slate-100 rounded-md shrink-0">
          <button
            onClick={() => setSpace("candidat")}
            className={`px-3 py-1 text-xs font-semibold rounded transition-colors whitespace-nowrap ${
              space === "candidat"
                ? "bg-white text-slate-950 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Espace Candidat / Doctorant
          </button>
          <button
            onClick={() => setSpace("gestion")}
            className={`px-3 py-1 text-xs font-semibold rounded transition-colors whitespace-nowrap ${
              space === "gestion"
                ? "bg-white text-slate-950 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Espace Gestionnaires & Présidents
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-[1360px] w-full mx-auto px-4 sm:px-6 py-4">
        {space === "candidat" ? (
          <CandidateWorkspace
            subjects={subjects}
            candidates={candidates}
            onCreateApplication={handleCreateCandidate}
            onUpdateApplication={handleUpdateCandidate}
            reenrollments={reenrollments}
            onUpdateReenrollment={handleUpdateReenrollment}
            officialResultsPublished={presidentSigned && cedocDirectorSigned}
            principalQuota={principalQuota}
          />
        ) : (
          <GovernanceWorkspace
            subjects={subjects}
            onUpdateSubjectStatus={handleUpdateSubjectStatus}
            candidates={candidates}
            onUpdateCandidate={handleUpdateCandidate}
            onCreateCandidate={handleCreateCandidate}
            reenrollments={reenrollments}
            onUpdateReenrollment={handleUpdateReenrollment}
            presidentSigned={presidentSigned}
            setPresidentSigned={setPresidentSigned}
            cedocDirectorSigned={cedocDirectorSigned}
            setCedocDirectorSigned={setCedocDirectorSigned}
            principalQuota={principalQuota}
            setPrincipalQuota={setPrincipalQuota}
          />
        )}
      </main>
    </div>
  );
}
