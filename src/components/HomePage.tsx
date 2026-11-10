import React, { useState, useMemo } from 'react';
import { Search, ChevronLeft, ChevronRight, Plus, Check, ShoppingBag } from 'lucide-react';
import { SujetRecord } from '../types/cedoc';
import { SPECIALITES_INITIALES } from '../data/initialCatalog';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';

interface HomePageProps {
  onViewSubjectDetails: (sujet: SujetRecord) => void;
  onOpenCart: () => void;
  isCandidateMode?: boolean;
}

const ITEMS_PER_FRAME = 4;

export const HomePage: React.FC<HomePageProps> = ({
  onViewSubjectDetails,
  onOpenCart,
  isCandidateMode = false,
}) => {
  const { sujetsList, candidaturesDirecteurList } = useAuth();
  const {
    cartItems,
    maxCapacity,
    isSubjectInCart,
    addToCart,
    replacingSubject,
    replaceInCart,
  } = useCart();

  const [activeDiscipline, setActiveDiscipline] = useState<string>('Tous');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Filtrage des sujets selon disponibilité stricte :
  // RÈGLE FORMELLE : Un sujet de thèse est UNIQUE à un seul doctorant.
  // Dès qu'une candidature a été transmise pour un sujet, il devient immédiatement indisponible
  // et masqué du catalogue public et du home candidat (deux doctorants ne peuvent postuler au même thème).
  const filteredSubjects = useMemo(() => {
    return sujetsList.filter((sujet) => {
      // 1. Sujet déjà postulé par un candidat (indisponible pour tout autre candidat)
      const isPostule = candidaturesDirecteurList.some((c) => c.sujetId === sujet.id);
      if (isPostule) {
        return false;
      }

      // 2. Sujet attribué définitivement
      if (sujet.attribue || sujet.statut === 'Attribué') {
        return false;
      }
      if (sujet.actif === false) {
        return false;
      }
      if (sujet.ecarte) {
        return false;
      }
      if (activeDiscipline !== 'Tous' && sujet.discipline !== activeDiscipline) {
        return false;
      }
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        if (
          !sujet.intitule.toLowerCase().includes(query) &&
          !sujet.description.toLowerCase().includes(query)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [sujetsList, activeDiscipline, searchTerm]);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [activeDiscipline, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredSubjects.length / ITEMS_PER_FRAME));
  const currentSubjects = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_FRAME;
    return filteredSubjects.slice(start, start + ITEMS_PER_FRAME);
  }, [filteredSubjects, currentPage]);

  const currentTheme = currentSubjects[0]?.discipline || activeDiscipline;

  const handleCardAction = (e: React.MouseEvent, sujet: SujetRecord) => {
    e.stopPropagation();
    if (replacingSubject) {
      replaceInCart(replacingSubject.id, sujet);
      onOpenCart();
      return;
    }
    if (!isSubjectInCart(sujet.id)) {
      const res = addToCart(sujet);
      if (!res.success) {
        onOpenCart();
      }
    } else {
      onOpenCart();
    }
  };

  return (
    <div className={`py-6 ${isCandidateMode ? 'pb-20' : ''}`}>
      <div className="desktop-container flex flex-col gap-5 max-w-[820px] mx-auto px-4">
        {/* PAR DESSUS : BARRE DE RECHERCHE AVANCÉE & BOUTON PANIER DYNAMIQUE */}
        <section className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Recherche avancée de sujets..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="form-input pl-10 h-[40px] text-sm"
            />
          </div>

          <div className="w-56">
            <select
              value={activeDiscipline}
              onChange={(e) => setActiveDiscipline(e.target.value)}
              className="form-select h-[40px] text-sm"
            >
              <option value="Tous">Toutes les spécialités</option>
              {SPECIALITES_INITIALES.map((spec) => (
                <option key={spec} value={spec}>
                  {spec}
                </option>
              ))}
            </select>
          </div>

          {/* BOUTON DYNAMIQUE DE LA CESTA */}
          <button
            type="button"
            onClick={onOpenCart}
            className="flex items-center gap-2 h-[40px] px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors font-semibold text-xs shrink-0"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Panier ({cartItems.length}/{maxCapacity})</span>
          </button>
        </section>

        {replacingSubject && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between text-xs text-blue-800">
            <span>
              Choisissez un sujet pour remplacer : <strong>{replacingSubject.intitule}</strong>
            </span>
            <button
              type="button"
              onClick={() => replaceInCart('', replacingSubject)}
              className="underline font-semibold"
            >
              Annuler
            </button>
          </div>
        )}

        {/* EN MILIEU : LE GRAND CADRE AVEC LES SUJETS */}
        <section className="relative my-1">
          {totalPages > 1 && (
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="absolute -left-4 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-white border border-slate-200 shadow-md flex items-center justify-center text-slate-600 hover:text-blue-600 hover:border-blue-300 disabled:opacity-30 disabled:pointer-events-none transition-all"
              title="Page précédente"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}

          {totalPages > 1 && (
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="absolute -right-4 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-white border border-slate-200 shadow-md flex items-center justify-center text-slate-600 hover:text-blue-600 hover:border-blue-300 disabled:opacity-30 disabled:pointer-events-none transition-all"
              title="Page suivante"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          )}

          <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/70 text-xs">
              <span className="font-semibold text-slate-800">
                {currentTheme !== 'Tous' ? currentTheme : 'Sujets doctoraux disponibles'}
              </span>

              {totalPages > 1 && (
                <span className="text-slate-500 font-medium">
                  {currentPage} / {totalPages}
                </span>
              )}
            </div>

            {currentSubjects.length === 0 ? (
              <div className="py-10 text-center text-xs text-slate-500">
                Aucun sujet disponible pour le moment.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {currentSubjects.map((sujet) => {
                  const inCart = isSubjectInCart(sujet.id);

                  return (
                    <div
                      key={sujet.id}
                      onClick={() => onViewSubjectDetails(sujet)}
                      className="p-4 flex items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors cursor-pointer"
                    >
                      <div className="flex-1 min-w-0">
                        <h2 className="font-semibold text-slate-900 text-xs leading-snug line-clamp-2 hover:text-blue-600 transition-colors">
                          {sujet.intitule}
                        </h2>
                      </div>

                      <div className="shrink-0 flex items-center gap-2">
                        {replacingSubject ? (
                          <button
                            type="button"
                            onClick={(e) => handleCardAction(e, sujet)}
                            className="btn-sm-primary text-xs h-[30px] px-3"
                          >
                            Remplacer
                          </button>
                        ) : inCart ? (
                          <button
                            type="button"
                            onClick={(e) => handleCardAction(e, sujet)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Dans le panier</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => handleCardAction(e, sujet)}
                            className="btn-sm-secondary text-xs h-[30px] px-3"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Ajouter</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* EN BAS : DESCRIPTION INSTITUTIONNELLE */}
        {!isCandidateMode && (
          <section className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs text-xs text-slate-600 leading-relaxed mt-2">
            <span className="font-semibold text-slate-900 block mb-1">
              Centre d’Études Doctorales (CEDoc) — EST Fès
            </span>
            <p>
              Le Centre d’Études Doctorales de l’École Supérieure de Technologie de Fès fédère l’ensemble des structures et laboratoires de recherche accrédités au sein de l’Université Sidi Mohamed Ben Abdellah. Chaque sujet de recherche doctorale est unique et attribué à un seul doctorant retenu après délibération de la commission scientifique.
            </p>
          </section>
        )}
      </div>
    </div>
  );
};

export default HomePage;
