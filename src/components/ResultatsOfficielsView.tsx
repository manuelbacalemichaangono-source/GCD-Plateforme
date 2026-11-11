import React from 'react';
import { Award, CheckCircle2, Clock, Calendar, ArrowLeft, Search } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface ResultatsOfficielsViewProps {
  onBackToRecherche: () => void;
}

export const ResultatsOfficielsView: React.FC<ResultatsOfficielsViewProps> = ({
  onBackToRecherche,
}) => {
  const { isListeOfficiellePubliee, admisOfficielsList } = useAuth();
  const [searchTerm, setSearchTerm] = React.useState('');

  const filteredAdmis = React.useMemo(() => {
    if (!searchTerm.trim()) return admisOfficielsList;
    const q = searchTerm.toLowerCase();
    return admisOfficielsList.filter(
      (a) =>
        a.nomComplet.toLowerCase().includes(q) ||
        a.cne.toLowerCase().includes(q) ||
        a.sujetIntitule.toLowerCase().includes(q) ||
        a.directeurNom.toLowerCase().includes(q) ||
        a.discipline.toLowerCase().includes(q)
    );
  }, [admisOfficielsList, searchTerm]);

  return (
    <div className="py-6">
      <div className="desktop-container max-w-[920px] mx-auto px-4 flex flex-col gap-6">
        {/* Header de la section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onBackToRecherche}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-colors"
              title="Retour aux sujets"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="font-display font-bold text-base text-slate-900">
                Résultats Officiels · Cycle Doctoral 2026/2027
              </h1>
              <span className="text-xs text-slate-500">
                Centre d’Études Doctorales (CEDoc) · EST Fès, Université Sidi Mohamed Ben Abdellah
              </span>
            </div>
          </div>

          {isListeOfficiellePubliee && (
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 self-start sm:self-auto flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Liste officielle homologuée</span>
            </span>
          )}
        </div>

        {/* CONTENU : Soit la liste officielle publiée, soit le message de délibération en cours */}
        {!isListeOfficiellePubliee || admisOfficielsList.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-8 text-center flex flex-col items-center justify-center gap-3 shadow-xs min-h-[300px]">
            <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-6 h-6 stroke-[1.5]" />
            </div>
            <h2 className="font-display font-bold text-base text-slate-900">
              Délibérations finales en cours d’homologation
            </h2>
            <p className="text-xs text-slate-600 max-w-md leading-relaxed">
              La commission administrative et scientifique procède actuellement à l’examen et à la validation des procès-verbaux d’évaluation du jury.
              La liste officielle des candidats définitivement admis sera affichée ici dès visa de la Direction du CEDoc.
            </p>
            <button
              type="button"
              onClick={onBackToRecherche}
              className="btn-secondary text-xs h-[36px] px-4 mt-2"
            >
              Consulter le catalogue des sujets
            </button>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex flex-col gap-5">
            {/* Bannière institutionnelle officielle */}
            <div className="p-4 bg-emerald-50/50 border border-emerald-200 rounded-xl flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-emerald-950">
                    Procès-Verbal Officiel d’Admission Définitive
                  </h3>
                  <p className="text-xs text-emerald-800 mt-0.5 leading-relaxed">
                    Les candidats ci-dessous sont déclarés définitivement admis au cycle doctoral pour l’année universitaire 2026/2027 suite à l’homologation du Directeur du CEDoc.
                  </p>
                </div>
              </div>
              <div className="text-right text-[11px] text-slate-500 font-medium shrink-0 hidden sm:block">
                <span>Réf. PV-CEDOC-2026/01</span>
                <span className="block mt-0.5">EST Fès</span>
              </div>
            </div>

            {/* Barre de recherche dans la liste des admis */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Rechercher par nom, CNE, sujet ou directeur..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="form-input pl-10 h-[38px] text-xs"
              />
            </div>

            {/* Tableau des admis */}
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4">CNE / Massar</th>
                    <th className="py-3 px-4">Candidat</th>
                    <th className="py-3 px-4">Sujet de thèse retenu</th>
                    <th className="py-3 px-4">Directeur de thèse</th>
                    <th className="py-3 px-4 text-right">Décision</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {filteredAdmis.map((admis) => (
                    <tr key={admis.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-mono font-semibold text-slate-600">
                        {admis.cne}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900 whitespace-nowrap">
                        {admis.nomComplet}
                      </td>
                      <td className="py-3 px-4 max-w-xs font-medium text-slate-800">
                        <div>{admis.sujetIntitule}</div>
                        <span className="text-[10px] text-slate-400 font-normal">
                          {admis.discipline}
                        </span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap font-medium text-slate-700">
                        {admis.directeurNom}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Admis</span>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="text-[11px] text-slate-400 text-right">
              Affichage certifié conforme aux délibérations du jury et à la validation du Directeur du CEDoc.
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResultatsOfficielsView;
