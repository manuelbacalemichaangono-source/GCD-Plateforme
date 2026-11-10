import React from 'react';
import { X, Plus, User } from 'lucide-react';
import { SujetRecord } from '../types/cedoc';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';

interface SubjectDetailModalProps {
  sujet: SujetRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenCart: () => void;
}

export const SubjectDetailModal: React.FC<SubjectDetailModalProps> = ({
  sujet,
  isOpen,
  onClose,
  onOpenCart,
}) => {
  const { candidaturesDirecteurList } = useAuth();
  const {
    isSubjectInCart,
    addToCart,
    removeFromCart,
    replacingSubject,
    replaceInCart,
  } = useCart();

  if (!isOpen || !sujet) return null;

  const isPostule = candidaturesDirecteurList.some((c) => c.sujetId === sujet.id);
  const inCart = isSubjectInCart(sujet.id);

  const handleAction = () => {
    if (replacingSubject) {
      replaceInCart(replacingSubject.id, sujet);
      onClose();
      onOpenCart();
      return;
    }

    if (inCart) {
      removeFromCart(sujet.id);
    } else {
      const res = addToCart(sujet);
      if (res.success) {
        onClose();
        onOpenCart();
      } else {
        onClose();
        onOpenCart();
      }
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content max-w-2xl p-6 bg-white border border-slate-200 rounded-xl shadow-lg flex flex-col gap-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 pb-3 border-b border-slate-100">
          <h2 className="font-display font-bold text-xl text-slate-900 leading-snug">
            {sujet.intitule}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Description complète */}
        <div className="text-sm text-slate-700 leading-relaxed">
          {sujet.description}
        </div>

        {/* En dessous de la description : uniquement le Directeur de thèse (aucun laboratoire) */}
        <div className="flex items-center gap-2 pt-3 border-t border-slate-100 text-sm text-slate-800">
          <User className="w-4 h-4 text-blue-600 shrink-0" />
          <span className="font-semibold">Directeur de thèse :</span>
          <span>{sujet.directeur}</span>
        </div>

        {/* Action */}
        <div className="pt-2 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary h-[38px] text-sm"
          >
            Fermer
          </button>

          {isPostule ? (
            <span className="text-xs font-semibold text-slate-500 bg-slate-100 border border-slate-200 px-3.5 py-2 rounded-lg">
              Indisponible (Candidature déjà transmise)
            </span>
          ) : (
            <button
              type="button"
              onClick={handleAction}
              className={inCart && !replacingSubject ? 'btn-secondary text-red-600 border-red-200 hover:bg-red-50' : 'btn-primary'}
            >
              {replacingSubject ? (
                <span>Remplacer avec ce sujet</span>
              ) : inCart ? (
                <span>Retirer du panier</span>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>Ajouter au panier</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default SubjectDetailModal;
