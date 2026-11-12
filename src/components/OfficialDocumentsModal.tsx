import React, { useState } from 'react';
import {
  X,
  GraduationCap,
  FileText,
  CheckCircle2,
  ShieldCheck,
  Award,
  Loader2,
} from 'lucide-react';
import { InscriptionRecord } from '../types/cedoc';

interface OfficialDocumentsModalProps {
  inscription: InscriptionRecord;
  isLoading?: boolean;
  isValidating?: boolean;
  onInscrire: (inscriptionId: string) => void;
  onClose: () => void;
}

export const OfficialDocumentsModal: React.FC<OfficialDocumentsModalProps> = ({
  inscription,
  isLoading = false,
  isValidating = false,
  onInscrire,
  onClose,
}) => {
  const [activeDoc, setActiveDoc] = useState<'diplome' | 'releves'>('diplome');

  const isValidee = inscription.statut === 'Inscription validée';
  const etablissementNom =
    inscription.etablissementOrigineDetail ||
    inscription.universiteOrigine ||
    'École Supérieure de Technologie de Fès (EST Fès)';

  const diplomeDoc = inscription.documentsOriginaux?.find((d) => d.type === 'diplome');
  const relevesDoc = inscription.documentsOriginaux?.find((d) => d.type === 'releves');

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content max-w-4xl p-5 sm:p-6 bg-white border border-slate-200 rounded-xl shadow-xl flex flex-col gap-4 max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* En-tête de la modale */}
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display font-bold text-sm sm:text-base text-slate-900 leading-tight">
                {inscription.candidatPrenom} {inscription.candidatNom}
              </h2>
              <span className="text-xs text-slate-500">
                Code Massar / CNE : <strong className="font-mono text-slate-800">{inscription.cne}</strong> ·{' '}
                {inscription.universiteOrigine}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sélecteur de document */}
        <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
          <button
            type="button"
            onClick={() => setActiveDoc('diplome')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors ${
              activeDoc === 'diplome'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            <span>Diplôme officiel</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveDoc('releves')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors ${
              activeDoc === 'releves'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Relevé de notes officiel (S1 – S4)</span>
          </button>
        </div>

        {/* Contenu des documents officiels */}
        {isLoading ? (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-12 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
            <span className="text-xs font-medium text-slate-600">
              Chargement des pièces académiques...
            </span>
          </div>
        ) : activeDoc === 'diplome' ? (
          <div className="bg-slate-100 p-3 sm:p-5 rounded-xl border border-slate-200">
            <div className="bg-white border-2 border-slate-800 rounded-sm p-6 sm:p-8 shadow-sm relative">
              <div className="border border-slate-300 p-5 sm:p-6 flex flex-col gap-5">
                {/* En-tête officiel marocain */}
                <div className="flex flex-col items-center text-center border-b-2 border-slate-800 pb-4 gap-1">
                  <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-700">
                    Royaume du Maroc
                  </span>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-600">
                    Ministère de l’Enseignement Supérieur, de la Recherche Scientifique et de l’Innovation
                  </span>
                  <span className="text-xs font-bold uppercase tracking-wide text-slate-900 mt-1">
                    {inscription.universiteOrigine}
                  </span>
                  <span className="text-xs font-semibold text-blue-900">
                    {etablissementNom}
                  </span>
                </div>

                {/* Titre du diplôme */}
                <div className="text-center py-2">
                  <h3 className="font-display font-bold text-lg sm:text-xl uppercase tracking-wider text-slate-900">
                    Attestation Officielle de Réussite et de Diplôme
                  </h3>
                  <span className="text-[11px] font-mono text-slate-500 mt-1 block">
                    Réf. : {diplomeDoc?.referenceDoc || `DIP-${inscription.cne}-2025`}
                  </span>
                </div>

                {/* Corps officiel */}
                <div className="text-xs sm:text-[13px] text-slate-800 leading-relaxed flex flex-col gap-3">
                  <p>
                    Le Chef d’Établissement de <strong>{etablissementNom}</strong> atteste que :
                  </p>

                  <div className="bg-slate-50 border border-slate-200 rounded p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold block">
                        Nom et Prénom
                      </span>
                      <span className="font-bold text-sm text-slate-900 uppercase">
                        {inscription.candidatNom} {inscription.candidatPrenom}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold block">
                        Code National de l’Étudiant (CNE / Massar)
                      </span>
                      <span className="font-mono font-bold text-sm text-slate-900">
                        {inscription.cne}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold block">
                        Diplôme obtenu
                      </span>
                      <span className="font-semibold text-slate-900">
                        {inscription.diplomeMaster ||
                          `Master / Ingénieur en ${inscription.discipline || 'Sciences et Technologies'}`}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold block">
                        Session & Mention
                      </span>
                      <span className="font-semibold text-slate-900">
                        {inscription.anneeObtention || '2025'} · Mention{' '}
                        <strong>{inscription.mention || 'Très Bien'}</strong> (
                        {inscription.moyenneGenerale || 16.42}/20)
                      </span>
                    </div>
                  </div>

                  <p>
                    A satisfait aux épreuves du contrôle des connaissances et à la soutenance du mémoire de fin d’études, lui conférant le droit d’accès au cycle doctoral au titre de l’année universitaire 2026/2027.
                  </p>
                </div>

                {/* Bas de page & cachet */}
                <div className="pt-4 mt-2 border-t border-slate-200 flex flex-col sm:flex-row sm:items-end justify-between gap-4 text-[11px] text-slate-600">
                  <div className="flex flex-col gap-1">
                    <span>
                      Source de vérification :{' '}
                      <strong className="text-slate-900">
                        {inscription.isExterne ? 'API Nationale Massar / Apogée' : 'Système Académique Interne EST Fès'}
                      </strong>
                    </span>
                    <span className="font-mono text-[10px] text-slate-500">
                      Empreinte : {inscription.apiSyncToken || `CERT-${inscription.cne}`}
                    </span>
                  </div>

                  <div className="border-2 border-emerald-700 text-emerald-800 rounded px-4 py-2 text-center bg-emerald-50/40 shrink-0">
                    <span className="text-[10px] font-bold uppercase tracking-wider block">
                      Document Authentifié
                    </span>
                    <span className="text-[11px] font-semibold block">
                      Service de la Scolarité
                    </span>
                    <span className="text-[9px] font-mono block text-emerald-700">
                      {diplomeDoc?.dateCertification || 'Validé 2026'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-slate-100 p-3 sm:p-5 rounded-xl border border-slate-200">
            <div className="bg-white border border-slate-300 rounded-sm p-5 sm:p-7 shadow-sm flex flex-col gap-5">
              {/* En-tête relevé de notes */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b-2 border-slate-800">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block">
                    Royaume du Maroc · {inscription.universiteOrigine}
                  </span>
                  <h3 className="font-display font-bold text-base uppercase text-slate-900 mt-0.5">
                    Relevé Global des Notes et Résultats (S1 – S4)
                  </h3>
                  <span className="text-xs font-medium text-slate-700">
                    {etablissementNom}
                  </span>
                </div>
                <div className="text-left sm:text-right text-[11px]">
                  <span className="font-mono text-slate-600 block">
                    Réf. : {relevesDoc?.referenceDoc || `RN-${inscription.cne}-S1S4`}
                  </span>
                  <span className="font-bold text-slate-900 block">
                    CNE / Massar : <span className="font-mono">{inscription.cne}</span>
                  </span>
                  <span className="text-slate-600 block">
                    Étudiant(e) : <strong>{inscription.candidatPrenom} {inscription.candidatNom}</strong>
                  </span>
                </div>
              </div>

              {/* Semestres et modules détaillés */}
              <div className="grid grid-cols-1 gap-4">
                {(inscription.relevesNotes || []).map((sem, idx) => (
                  <div key={idx} className="border border-slate-200 rounded-lg overflow-hidden">
                    <div className="bg-slate-50 px-3.5 py-2 border-b border-slate-200 flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-900">{sem.semestre}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-slate-600">
                          Moyenne : <strong className="text-slate-900 font-mono">{sem.moyenne.toFixed(2)} / 20</strong>
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {sem.validation}
                        </span>
                      </div>
                    </div>

                    {sem.modules && sem.modules.length > 0 && (
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-white border-b border-slate-200 text-[10px] uppercase text-slate-500">
                            <th className="py-1.5 px-3 font-semibold w-24">Code</th>
                            <th className="py-1.5 px-3 font-semibold">Module / Élément pédagogique</th>
                            <th className="py-1.5 px-3 font-semibold text-right w-24">Note / 20</th>
                            <th className="py-1.5 px-3 font-semibold text-right w-24">Résultat</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {sem.modules.map((mod) => (
                            <tr key={mod.code} className="hover:bg-slate-50/50">
                              <td className="py-1.5 px-3 font-mono text-[11px] text-slate-600">
                                {mod.code}
                              </td>
                              <td className="py-1.5 px-3 font-medium text-slate-800">
                                {mod.intitule}
                              </td>
                              <td className="py-1.5 px-3 text-right font-mono font-semibold text-slate-900">
                                {mod.note.toFixed(2)}
                              </td>
                              <td className="py-1.5 px-3 text-right text-[11px] font-semibold text-emerald-700">
                                {mod.resultat}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                ))}
              </div>

              {/* Récapitulatif global */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2 text-slate-700">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    Moyenne générale du cursus :{' '}
                    <strong className="font-mono text-slate-900">
                      {(inscription.moyenneGenerale || 16.42).toFixed(2)} / 20
                    </strong>
                  </span>
                </div>
                <span className="font-bold text-emerald-800">
                  Mention : {inscription.mention || 'Très Bien'} ({inscription.anneeObtention || '2025'})
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Pied de page avec bouton S'inscrire (pour EST Fès et universités externes) */}
        <div className="pt-3 border-t border-slate-200 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary text-xs h-[38px] px-4"
          >
            Fermer
          </button>

          {isValidee ? (
            <div className="inline-flex items-center gap-2 px-4 h-[38px] rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Inscrit · {inscription.numeroDossier || `DOC-CEDOC-2026-${inscription.cne}`}</span>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => onInscrire(inscription.id)}
              disabled={isValidating || isLoading}
              className="inline-flex items-center gap-2 px-5 h-[38px] rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors shadow-xs disabled:opacity-50"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{isValidating ? 'Inscription...' : "S'inscrire"}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
