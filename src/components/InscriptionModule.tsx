import React, { useState } from 'react';
import {
  GraduationCap,
  Download,
  CheckCircle2,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { downloadInscriptionReceiptPdf } from '../utils/pdfGenerator';

interface InscriptionModuleProps {
  onBackToDashboard?: () => void;
}

const UNIVERSITES_MAROC = [
  'Université Sidi Mohamed Ben Abdellah (EST Fès)',
  'Université Mohammed V de Rabat',
  'Université Cadi Ayyad de Marrakech',
  'Université Hassan II de Casablanca',
  'Université Abdelmalek Essaâdi de Tétouan',
  'Université Ibn Tofail de Kénitra',
  'Université Chouaib Doukkali d’El Jadida',
  'Université Moulay Ismaïl de Meknès',
  'Université Mohammed Premier d’Oujda',
  'Université Sultan Moulay Slimane de Béni Mellal',
  'Université Ibn Zohr d’Agadir',
];

export const InscriptionModule: React.FC<InscriptionModuleProps> = () => {
  const {
    user,
    profile,
    getInscriptionForCandidat,
    soumettreDemandeInscription,
  } = useAuth();

  const currentEmail = user?.email || profile.email;
  const inscription = getInscriptionForCandidat(currentEmail);

  const [cneCode, setCneCode] = useState(inscription?.cne || profile.cne || 'N138091823');
  const [universite, setUniversite] = useState(
    inscription?.universiteOrigine || 'Université Sidi Mohamed Ben Abdellah (EST Fès)'
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cneCode.trim()) return;
    setIsSubmitting(true);
    setFeedbackMsg(null);
    try {
      await soumettreDemandeInscription(cneCode.trim().toUpperCase(), universite);
      setFeedbackMsg('Demande d’inscription transmise avec succès au Directeur de thèse.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownloadReceipt = () => {
    if (!inscription) return;
    downloadInscriptionReceiptPdf(inscription);
  };

  const isValidee = inscription?.statut === 'Inscription validée';
  const isTransmise = inscription?.statut === 'Demande transmise au directeur';

  return (
    <div className="flex flex-col gap-5">
      {/* En-tête */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display font-bold text-base text-slate-900">
              Inscription administrative
            </h1>
            <span
              className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${
                isValidee
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : isTransmise
                  ? 'bg-blue-50 text-blue-800 border-blue-200'
                  : 'bg-slate-100 text-slate-700 border-slate-200'
              }`}
            >
              {isValidee
                ? 'Inscription validée'
                : isTransmise
                ? 'Demande transmise au Directeur'
                : 'Formulaire à compléter'}
            </span>
          </div>
          <span className="text-xs text-slate-500">
            {inscription?.sujetIntitule || 'Sujet doctoral attribué'} · {inscription?.directeurNom || 'Directeur de thèse'}
          </span>
        </div>

        {isValidee && inscription?.recuEnvoye && (
          <button
            type="button"
            onClick={handleDownloadReceipt}
            className="inline-flex items-center gap-1.5 btn-primary text-xs h-[36px] px-3.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Télécharger le reçu officiel (PDF)</span>
          </button>
        )}
      </div>

      {/* Si l'inscription est validée : Formulaire officiel finalisé */}
      {isValidee && (
        <div className="bg-white border border-emerald-200 rounded-xl p-5 shadow-2xs flex flex-col gap-4">
          <div className="flex items-center gap-2 text-emerald-800 font-display font-semibold text-xs pb-2 border-b border-emerald-100">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Formulaire d'inscription officiel finalisé</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <span className="text-[10px] text-slate-400 block font-semibold uppercase">
                Numéro de dossier doctoral
              </span>
              <span className="font-mono font-bold text-slate-900">
                {inscription.numeroDossier || `DOC-CEDOC-2026-${inscription.cne}`}
              </span>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <span className="text-[10px] text-slate-400 block font-semibold uppercase">
                Numéro de récépissé
              </span>
              <span className="font-mono font-bold text-blue-600">
                {inscription.receiptNumber || 'REC-INSC-2026-08492'}
              </span>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <span className="text-[10px] text-slate-400 block font-semibold uppercase">
                Date de validation
              </span>
              <span className="font-semibold text-slate-800">
                {inscription.dateValidationDirecteur || 'Aujourd’hui'}
              </span>
            </div>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs flex flex-col gap-1">
            <span className="font-semibold text-slate-800">Diplôme validé :</span>
            <span className="text-slate-600">
              {inscription.diplomeMaster || 'Master en Informatique et Systèmes Décisionnels'} ({inscription.anneeObtention || '2026'}) · {inscription.universiteOrigine}
            </span>
          </div>
        </div>
      )}

      {/* Si demande déjà transmise et en attente */}
      {isTransmise && !isValidee && (
        <div className="bg-white border border-blue-200 rounded-xl p-5 shadow-2xs flex flex-col gap-3 text-xs">
          <div className="flex items-center gap-2 text-blue-900 font-semibold">
            <Clock className="w-4 h-4 text-blue-600 shrink-0" />
            <span>Demande d'inscription transmise au Directeur de thèse</span>
          </div>
          <p className="text-slate-600 leading-relaxed">
            Votre demande avec le Code CNE/Massar <strong className="font-mono text-slate-800">{inscription?.cne}</strong> a été envoyée directement à votre Directeur de thèse (<strong className="text-slate-800">{inscription?.directeurNom}</strong>). Dès validation, vous recevrez votre récépissé officiel.
          </p>
        </div>
      )}

      {/* Formulaire d'inscription simplifié (aucun chargement de fichier, seulement 2 champs) */}
      {!isValidee && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs flex flex-col gap-4">
          <div className="pb-2 border-b border-slate-100">
            <h2 className="font-display font-semibold text-xs text-slate-900">
              Formulaire d'inscription simplifié
            </h2>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Code CNE / Massar
                </label>
                <input
                  type="text"
                  value={cneCode}
                  onChange={(e) => setCneCode(e.target.value.toUpperCase())}
                  disabled={isTransmise}
                  className="w-full h-[36px] px-3 rounded-lg border border-slate-300 text-xs font-mono font-semibold text-slate-800 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-slate-50"
                  placeholder="Ex. N138091823"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Université d'origine
                </label>
                <select
                  value={universite}
                  onChange={(e) => setUniversite(e.target.value)}
                  disabled={isTransmise}
                  className="w-full h-[36px] px-3 rounded-lg border border-slate-300 text-xs text-slate-800 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-slate-50"
                >
                  {UNIVERSITES_MAROC.map((univ) => (
                    <option key={univ} value={univ}>
                      {univ}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {feedbackMsg && (
              <div className="p-2.5 bg-emerald-50 border border-emerald-100 rounded-lg text-xs text-emerald-900 flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>{feedbackMsg}</span>
              </div>
            )}

            {!isTransmise && (
              <div className="flex items-center justify-end pt-2 border-t border-slate-100">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-primary text-xs h-[36px] px-4"
                >
                  <GraduationCap className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? 'Transmission...' : 'Soumettre ma demande d’inscription'}</span>
                </button>
              </div>
            )}
          </form>
        </div>
      )}
    </div>
  );
};
