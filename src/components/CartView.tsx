import React, { useState } from 'react';
import {
  Trash2,
  RefreshCw,
  CheckSquare,
  Square,
  Upload,
  FileCheck,
  ArrowLeft,
  ShoppingBag,
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { PRESELECTION_SLOTS, PieceSlotPreselection, SujetRecord } from '../types/cedoc';
import { validateCandidateFile, uploadDossierFile } from '../utils/storageHelper';

interface CartViewProps {
  onBackToHome: () => void;
  onOpenAuth: (mode: 'login' | 'register') => void;
  onViewSubjectDetails: (sujet: SujetRecord) => void;
  onGoToProgression?: () => void;
}

export const CartView: React.FC<CartViewProps> = ({
  onBackToHome,
  onOpenAuth,
  onViewSubjectDetails,
  onGoToProgression,
}) => {
  const {
    cartItems,
    selectedSubjectIds,
    maxCapacity,
    removeFromCart,
    startReplacing,
    toggleSubjectSelection,
  } = useCart();

  const { user, candidature, piecesMap, submitCandidatureFinale, saveUploadedPiece } = useAuth();

  const [showUploadStep, setShowUploadStep] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const selectedCount = selectedSubjectIds.length;

  const handleEnvoyerCandidature = () => {
    if (selectedCount === 0) return;
    if (!user) {
      onOpenAuth('register');
      return;
    }
    // Affiche l'interface de téléversement des documents
    setShowUploadStep(true);
  };

  const handleFileUpload = async (slotId: PieceSlotPreselection, label: string, file: File) => {
    setFeedback(null);
    const err = validateCandidateFile(file);
    if (err) {
      setFeedback(`Erreur : ${err}`);
      return;
    }

    try {
      const res = await uploadDossierFile('candidatures', user?.uid || 'visiteur', slotId, file);
      await saveUploadedPiece(
        slotId,
        label,
        res.fileName,
        res.mimeType,
        res.sizeBytes,
        res.storagePath,
        res.downloadUrl,
        false
      );
      setFeedback(`Fichier "${file.name}" enregistré.`);
    } catch {
      setFeedback('Erreur lors du téléversement.');
    }
  };

  const handleConfirmFinalSubmission = async () => {
    setBusy(true);
    setFeedback(null);
    try {
      await submitCandidatureFinale();
      if (onGoToProgression) {
        onGoToProgression();
      }
    } catch {
      setFeedback('Erreur lors de la transmission du dossier.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="py-8">
      <div className="desktop-container flex flex-col gap-6 max-w-4xl">
        {/* Navigation retour */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onBackToHome}
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Retour aux sujets</span>
          </button>

          <span className="text-sm font-bold text-slate-800">
            Panier ({cartItems.length}/{maxCapacity})
          </span>
        </div>

        {feedback && (
          <div className="p-3 bg-blue-50 border border-blue-200 text-blue-800 rounded-lg text-xs">
            {feedback}
          </div>
        )}

        {/* Liste des sujets du panier */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex flex-col gap-4">
          <h1 className="font-display font-bold text-lg text-slate-900">
            Sujets sélectionnés
          </h1>

          {cartItems.length === 0 ? (
            <div className="py-12 text-center flex flex-col items-center gap-3">
              <ShoppingBag className="w-10 h-10 text-slate-300 stroke-[1.5]" />
              <p className="text-sm text-slate-600">Votre panier est vide.</p>
              <button
                type="button"
                onClick={onBackToHome}
                className="btn-secondary text-sm"
              >
                Consulter les sujets
              </button>
            </div>
          ) : (
            <div className="flex flex-col divide-y divide-slate-100">
              {cartItems.map((sujet) => {
                const isSelected = selectedSubjectIds.includes(sujet.id);

                return (
                  <div
                    key={sujet.id}
                    className="py-3.5 flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <button
                        type="button"
                        onClick={() => toggleSubjectSelection(sujet.id)}
                        className="text-blue-600 shrink-0"
                      >
                        {isSelected ? (
                          <CheckSquare className="w-5 h-5" />
                        ) : (
                          <Square className="w-5 h-5 text-slate-300" />
                        )}
                      </button>

                      <div className="min-w-0">
                        <span
                          onClick={() => onViewSubjectDetails(sujet)}
                          className="font-semibold text-sm text-slate-900 hover:text-blue-600 cursor-pointer transition-colors line-clamp-1"
                        >
                          {sujet.intitule}
                        </span>
                        <span className="text-xs text-slate-500 block">
                          {sujet.discipline}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          startReplacing(sujet);
                          onBackToHome();
                        }}
                        className="p-1.5 text-slate-400 hover:text-blue-600 rounded transition-colors"
                        title="Remplacer"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeFromCart(sujet.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 rounded transition-colors"
                        title="Supprimer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {cartItems.length > 0 && !showUploadStep && (
            <div className="pt-4 border-t border-slate-100 flex items-center justify-end">
              <button
                type="button"
                onClick={handleEnvoyerCandidature}
                disabled={selectedCount === 0}
                className="btn-primary"
              >
                Envoyer candidature ({selectedCount})
              </button>
            </div>
          )}
        </div>

        {/* INTERFACE POUR SUBIR LOS DOCUMENTOS CONCERNIENTES (Dépôt des pièces) */}
        {showUploadStep && (
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex flex-col gap-4">
            <h2 className="font-display font-bold text-base text-slate-900">
              Documents du dossier (PDF)
            </h2>

            <div className="flex flex-col divide-y divide-slate-100">
              {PRESELECTION_SLOTS.map((slot) => {
                const piece = piecesMap[slot.slotId];
                const isUploaded = !!piece;

                return (
                  <div
                    key={slot.slotId}
                    className="py-3 flex items-center justify-between gap-4"
                  >
                    <div className="min-w-0">
                      <span className="text-sm font-semibold text-slate-800 block">
                        {slot.label}
                      </span>
                      {isUploaded && (
                        <span className="text-xs text-emerald-600 flex items-center gap-1 mt-0.5">
                          <FileCheck className="w-3.5 h-3.5" />
                          {piece.fileName}
                        </span>
                      )}
                    </div>

                    <label className="btn-sm-secondary cursor-pointer shrink-0">
                      <Upload className="w-3.5 h-3.5 mr-1" />
                      <span>{isUploaded ? 'Remplacer' : 'Téléverser'}</span>
                      <input
                        type="file"
                        accept="application/pdf"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleFileUpload(slot.slotId, slot.label, f);
                        }}
                      />
                    </label>
                  </div>
                );
              })}
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setShowUploadStep(false)}
                className="btn-secondary text-xs"
              >
                Retour aux choix
              </button>

              <button
                type="button"
                onClick={handleConfirmFinalSubmission}
                disabled={busy}
                className="btn-primary"
              >
                {busy ? 'Transmission...' : 'Confirmer et envoyer'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CartView;
