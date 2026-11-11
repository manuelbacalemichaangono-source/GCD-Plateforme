import React from 'react';
import { ArrowLeft } from 'lucide-react';

interface CalendrierViewProps {
  onBackToRecherche: () => void;
}

export const CalendrierView: React.FC<CalendrierViewProps> = ({ onBackToRecherche }) => {
  const phases = [
    {
      phaseNumber: 'Phase 01',
      dateRange: '15 octobre – 20 décembre 2026',
      title: 'Publication des sujets et dépôt des candidatures en ligne',
      description:
        'Consultation libre des sujets par facettes, comparaison multicritères et transmission des dossiers auprès des directeurs de thèse.',
    },
    {
      phaseNumber: 'Phase 02',
      dateRange: '21 décembre 2026 – 08 janvier 2027',
      title: 'Examen des dossiers par les commissions de laboratoires',
      description:
        'Étude des prérequis académiques et publication de la liste des candidats retenus pour les auditions scientifiques.',
    },
    {
      phaseNumber: 'Phase 03',
      dateRange: '11 janvier – 22 janvier 2027',
      title: 'Auditions devant les jurys thématiques du CEDoc',
      description:
        'Audition scientifique des candidats avec les membres du jury autour du sujet doctoral.',
    },
    {
      phaseNumber: 'Phase 04',
      dateRange: 'À partir du 1er février 2027',
      title: 'Résultats définitifs et inscription administrative',
      description:
        'Signature de la charte du doctorat, conventionnement financier et démarrage effectif au sein du laboratoire d’accueil.',
    },
  ];

  return (
    <div className="py-8 bg-[#F8FAFC]">
      <div className="desktop-container max-w-[1140px] mx-auto px-4 sm:px-6">
        {/* En-tête officiel du Calendrier */}
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6 pb-8">
          <div className="flex-1 max-w-2xl">
            <span className="text-xs font-semibold text-slate-500 tracking-wide block mb-1.5">
              Campagne annuelle de recrutement doctoral
            </span>
            <h1 className="font-display font-bold text-3xl sm:text-4xl text-slate-900 tracking-tight leading-tight">
              Calendrier officiel 2026–2027
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 mt-3 leading-relaxed">
              Attention : chaque sujet dispose d’une date limite propre comprise entre fin novembre et mi-décembre 2026 selon l’organisme financeur. Vérifiez l’échéance affichée sur chaque fiche sujet.
            </p>
          </div>

          <div className="shrink-0 md:pt-4">
            <button
              type="button"
              onClick={onBackToRecherche}
              className="inline-flex items-center gap-2 bg-[#0F172A] hover:bg-slate-800 text-white font-semibold text-xs py-2.5 px-4 rounded-lg shadow-xs transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Revenir à la recherche de sujets</span>
            </button>
          </div>
        </div>

        {/* Tableau / Carte des 4 phases officiel */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs divide-y divide-slate-100 overflow-hidden">
          {phases.map((item, index) => (
            <div
              key={index}
              className="p-6 sm:p-8 flex flex-col md:flex-row md:items-start gap-4 md:gap-12 hover:bg-slate-50/40 transition-colors"
            >
              {/* Colonne Gauche : Numéro et Dates */}
              <div className="md:w-[260px] shrink-0 flex flex-col gap-1">
                <span className="text-[11px] font-mono font-bold text-slate-400 tracking-wider uppercase">
                  {item.phaseNumber}
                </span>
                <span className="font-display font-bold text-sm sm:text-base text-slate-900">
                  {item.dateRange}
                </span>
              </div>

              {/* Colonne Droite : Titre et Description de la phase */}
              <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                <h2 className="font-display font-bold text-sm sm:text-base text-slate-900 leading-snug">
                  {item.title}
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CalendrierView;
