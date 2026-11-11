import React, { useState } from 'react';
import {
  GraduationCap,
  Building2,
  Printer,
  CheckCircle2,
  Clock,
  ShieldCheck,
  FileCheck,
  Hash,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { InscriptionRecord } from '../types/cedoc';

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

  const handlePrintReceipt = () => {
    if (!inscription) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const receiptNum = inscription.receiptNumber || 'REC-INSC-2026-08492';
    const dossierNum = inscription.numeroDossier || `DOC-CEDOC-2026-${inscription.cne}`;
    const token = inscription.signatureElectroniqueToken || 'VISA-CEDOC-ESTFES-ONLINE-VALIDATED';

    printWindow.document.write(`<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <title>Récépissé officiel d'inscription doctorale - CEDoc EST Fès</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 40px; color: #0f172a; line-height: 1.5; font-size: 13px; }
    .header { text-align: center; border-bottom: 2px solid #2563eb; padding-bottom: 16px; margin-bottom: 24px; }
    .sub { font-size: 11px; text-transform: uppercase; font-weight: 700; color: #475569; letter-spacing: 0.5px; }
    .center-name { font-size: 15px; font-weight: 800; color: #1e40af; margin-top: 4px; }
    .doc-title { font-size: 18px; font-weight: 800; text-transform: uppercase; margin-top: 14px; color: #0f172a; letter-spacing: 0.5px; }
    .receipt-id { font-size: 12px; color: #2563eb; font-weight: 700; margin-top: 4px; }
    .card { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 14px 18px; margin-bottom: 14px; }
    .card-title { font-size: 11px; font-weight: 800; text-transform: uppercase; color: #475569; margin-bottom: 10px; letter-spacing: 0.5px; }
    .row { display: flex; margin-bottom: 6px; font-size: 13px; }
    .label { width: 180px; font-weight: 700; color: #334155; }
    .val { flex: 1; color: #0f172a; }
    .table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 12px; }
    .table th, .table td { border: 1px solid #cbd5e1; padding: 6px 10px; text-align: left; }
    .table th { background: #e2e8f0; font-weight: 700; color: #334155; }
    .badge { display: inline-block; padding: 2px 8px; background: #ecfdf5; color: #065f46; border: 1px solid #a7f3d0; border-radius: 4px; font-weight: 700; font-size: 11px; }
    .footer { margin-top: 36px; display: flex; justify-content: space-between; align-items: flex-end; }
    .stamp { border: 1.5px dashed #94a3b8; border-radius: 6px; padding: 12px 18px; text-align: center; font-size: 11px; color: #475569; background: #ffffff; }
    .qr { font-family: monospace; font-size: 10px; color: #64748b; background: #f1f5f9; padding: 6px 10px; border-radius: 4px; border: 1px solid #e2e8f0; }
    @media print { body { padding: 12px; } }
  </style>
</head>
<body>
  <div class="header">
    <div class="sub">Royaume du Maroc · Université Sidi Mohamed Ben Abdellah</div>
    <div class="center-name">Centre d’Études Doctorales (CEDoc) - École Supérieure de Technologie de Fès</div>
    <div class="doc-title">Récépissé Officiel d'Inscription Administrative</div>
    <div class="receipt-id">Récépissé Nº ${receiptNum} · Dossier Doctoral ${dossierNum}</div>
  </div>

  <div class="card">
    <div class="card-title">Informations du Doctorant</div>
    <div class="row"><div class="label">Nom et Prénom :</div><div class="val"><strong>${inscription.candidatPrenom} ${inscription.candidatNom}</strong></div></div>
    <div class="row"><div class="label">Code CNE / Massar :</div><div class="val"><strong>${inscription.cne}</strong></div></div>
    <div class="row"><div class="label">Courriel :</div><div class="val">${inscription.candidatEmail}</div></div>
    <div class="row"><div class="label">Université d’origine :</div><div class="val">${inscription.universiteOrigine}</div></div>
  </div>

  <div class="card">
    <div class="card-title">Sujet de Thèse et Encadrement</div>
    <div class="row"><div class="label">Intitulé de la thèse :</div><div class="val"><strong>${inscription.sujetIntitule}</strong></div></div>
    <div class="row"><div class="label">Directeur de Thèse :</div><div class="val"><strong>${inscription.directeurNom}</strong></div></div>
    <div class="row"><div class="label">Établissement :</div><div class="val">CEDoc - EST Fès (USMBA)</div></div>
    <div class="row"><div class="label">Année universitaire :</div><div class="val">2026 / 2027</div></div>
  </div>

  <div class="card">
    <div class="card-title">Données Académiques Validées</div>
    <div class="row"><div class="label">Diplôme d'accès :</div><div class="val">${inscription.diplomeMaster || 'Master en Informatique et Systèmes Décisionnels'} (${inscription.anneeObtention || '2026'})</div></div>
    <div class="row"><div class="label">Statut des pièces :</div><div class="val"><span class="badge">Vérifié et Conforme</span></div></div>
  </div>

  <div class="footer">
    <div>
      <div class="qr">
        AUTHENTIFICATION : ${token}<br>
        Inscription administrative finalisée par le Directeur de Thèse.
      </div>
    </div>
    <div class="stamp">
      <strong>Visa du Directeur de Thèse</strong><br>
      ${inscription.directeurNom}<br>
      CEDoc EST Fès
    </div>
  </div>
</body>
</html>`);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
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

        {isValidee && (
          <button
            type="button"
            onClick={handlePrintReceipt}
            className="inline-flex items-center gap-1.5 btn-primary text-xs h-[36px] px-3.5"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Imprimer le récépissé officiel</span>
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
