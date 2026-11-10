import React, { useState } from 'react';
import {
  Trash2,
  RefreshCw,
  CheckSquare,
  Square,
  Upload,
  ArrowLeft,
  ShoppingBag,
  FileText,
  Image as ImageIcon,
  Edit2,
  Download,
  X,
  Eye,
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { PRESELECTION_SLOTS, PieceSlotPreselection, SujetRecord } from '../types/cedoc';
import { validateCandidateFile } from '../utils/storageHelper';

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
    clearCart,
  } = useCart();

  const {
    user,
    piecesMap,
    submitCandidatureFinale,
    saveUploadedPiece,
    deleteUploadedPiece,
  } = useAuth();

  const [showUploadStep, setShowUploadStep] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Modale de prévisualisation du document
  const [previewModal, setPreviewModal] = useState<{
    isOpen: boolean;
    fileName: string;
    mimeType: string;
    url: string;
  }>({
    isOpen: false,
    fileName: '',
    mimeType: '',
    url: '',
  });

  const selectedCount = selectedSubjectIds.length;

  const handleEnvoyerCandidature = () => {
    if (selectedCount === 0) return;
    if (!user) {
      onOpenAuth('login');
      return;
    }
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
      const now = new Date();
      const dateFormatted = now.toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
      const sizeFormatted = `${(file.size / 1024).toFixed(2)} KB`;
      const previewUrl = URL.createObjectURL(file);

      await saveUploadedPiece(
        slotId,
        label,
        file.name,
        file.type || (file.name.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg'),
        file.size,
        `candidatures/${user?.uid || 'temp'}/${slotId}_${file.name}`,
        previewUrl,
        false,
        sizeFormatted,
        dateFormatted,
        previewUrl
      );
      setFeedback(`Document "${file.name}" ajouté avec succès.`);
    } catch {
      setFeedback('Erreur lors de l’enregistrement du document.');
    }
  };

  // Dès que le candidat s'authentifie avec des articles dans son panier, ouvrir automatiquement l'étape de téléversement
  React.useEffect(() => {
    if (user && cartItems.length > 0) {
      setShowUploadStep(true);
    }
  }, [user, cartItems.length]);

  const handleDeleteFile = async (slotId: PieceSlotPreselection) => {
    await deleteUploadedPiece(slotId);
    setFeedback('Document retiré.');
  };

  const handleConfirmFinalSubmission = async () => {
    setBusy(true);
    setFeedback(null);
    try {
      const subjectsToSend = cartItems.filter(
        (item) => selectedSubjectIds.length === 0 || selectedSubjectIds.includes(item.id)
      );
      await submitCandidatureFinale(subjectsToSend.length > 0 ? subjectsToSend : cartItems);
      clearCart();
      if (onGoToProgression) {
        onGoToProgression();
      }
    } catch {
      setFeedback('Erreur lors de la transmission du dossier.');
    } finally {
      setBusy(false);
    }
  };

  const handlePreviewPiece = (fileName: string, mimeType: string, url: string) => {
    setPreviewModal({
      isOpen: true,
      fileName,
      mimeType,
      url,
    });
  };

  return (
    <div className="py-6">
      <div className="desktop-container flex flex-col gap-5 max-w-[820px] mx-auto px-4">
        {/* Navigation retour */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onBackToHome}
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Retour aux sujets</span>
          </button>

          <span className="text-xs font-bold text-slate-800">
            Panier ({cartItems.length}/{maxCapacity})
          </span>
        </div>

        {feedback && (
          <div className="p-3 bg-blue-50 border border-blue-200 text-blue-800 rounded-lg text-xs flex items-center justify-between">
            <span>{feedback}</span>
            <button
              type="button"
              onClick={() => setFeedback(null)}
              className="text-blue-500 hover:text-blue-800 text-xs font-bold"
            >
              ×
            </button>
          </div>
        )}

        {/* 1. LISTE DES SUJETS DU PANIER */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col gap-4">
          <h1 className="font-display font-bold text-base text-slate-900">
            Sujets sélectionnés
          </h1>

          {cartItems.length === 0 ? (
            <div className="py-10 text-center flex flex-col items-center gap-2">
              <ShoppingBag className="w-9 h-9 text-slate-300 stroke-[1.5]" />
              <p className="text-xs text-slate-600">Votre panier est vide.</p>
              <button
                type="button"
                onClick={onBackToHome}
                className="btn-secondary text-xs"
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
                    className="py-3 flex items-center justify-between gap-4"
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
                          className="font-semibold text-xs text-slate-900 hover:text-blue-600 cursor-pointer transition-colors line-clamp-1"
                        >
                          {sujet.intitule}
                        </span>
                        <span className="text-[11px] text-slate-500 block">
                          {sujet.discipline} · {sujet.directeur}
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
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeFromCart(sujet.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 rounded transition-colors"
                        title="Supprimer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {cartItems.length > 0 && !showUploadStep && (
            <div className="pt-3 border-t border-slate-100 flex items-center justify-end">
              <button
                type="button"
                onClick={handleEnvoyerCandidature}
                disabled={selectedCount === 0}
                className="btn-primary text-xs h-[36px]"
              >
                Envoyer candidature ({selectedCount})
              </button>
            </div>
          )}
        </div>

        {/* 2. SECTION DÉPÔT DOCUMENTAIRE (Strictement conforme à l'image fournie) */}
        {showUploadStep && (
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col gap-6">
            <div className="pb-3 border-b border-slate-100">
              <h2 className="font-display font-bold text-base text-slate-900">
                Constitution et envoi des pièces du dossier
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Ajoutez vos documents (PDF ou photo). Vous pourrez modifier ou supprimer chaque dépôt avant la validation finale.
              </p>
            </div>

            <div className="flex flex-col gap-6">
              {PRESELECTION_SLOTS.map((slot) => {
                const piece = piecesMap[slot.slotId];
                const isUploaded = !!piece;
                const isPdf = piece?.mimeType?.includes('pdf') || piece?.fileName?.toLowerCase().endsWith('.pdf');

                return (
                  <div
                    key={slot.slotId}
                    className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col gap-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800">
                        {slot.label}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {slot.autoEligible ? 'PDF ou Photo' : 'PDF requis'}
                      </span>
                    </div>

                    {!isUploaded ? (
                      /* ÉTAT INITIAL SANS FICHIER :
                         - Un cadre blanc pas trop grand qui affiche "Upload" permettant d'ajouter une photo ou un pdf
                         - Le bouton "Modifier" à droite en couleur bleue
                      */
                      <div className="flex items-center gap-3">
                        {/* Cadre blanc Upload (pas trop grand) */}
                        <label className="flex-1 bg-white border border-dashed border-slate-300 hover:border-blue-400 rounded-lg h-[46px] px-4 flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-xs group">
                          <Upload className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
                          <span className="text-xs font-semibold text-slate-700 group-hover:text-blue-600">
                            Upload (PDF ou photo)
                          </span>
                          <input
                            type="file"
                            accept="application/pdf,image/*"
                            className="hidden"
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) handleFileUpload(slot.slotId, slot.label, f);
                            }}
                          />
                        </label>

                        {/* Bouton Modifier à droite de couleur bleue */}
                        <label className="btn-primary h-[46px] px-5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs shrink-0">
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>Modifier</span>
                          <input
                            type="file"
                            accept="application/pdf,image/*"
                            className="hidden"
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) handleFileUpload(slot.slotId, slot.label, f);
                            }}
                          />
                        </label>
                      </div>
                    ) : (
                      /* ÉTAT FICHIER DÉPOSÉ : EXACTEMENT CONFORME À L'IMAGE ATTACHÉE PAR L'UTILISATEUR
                         - Titre : « Fichiers déposés » (Archivos enviados)
                         - Cadre avec icône PDF/Photo, Nom de fichier, Taille & Date en français, Icône de téléchargement
                         - Bouton 1 : « Modifier le dépôt » (Editar entrega) en couleur bleue
                         - Bouton 2 : « Supprimer le dépôt » (Borrar entrega) avec icône poubelle rouge
                      */
                      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col gap-3">
                        <span className="text-xs font-bold text-slate-900">
                          Fichiers déposés
                        </span>

                        {/* Cadre intérieur du fichier */}
                        <div className="border border-slate-200 rounded-xl p-3.5 bg-white flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            {/* Icône PDF ou Image stylisée comme dans la capture */}
                            {isPdf ? (
                              <div className="w-10 h-11 border border-slate-300 rounded-md bg-white flex flex-col items-center justify-center shrink-0 shadow-2xs">
                                <FileText className="w-4 h-4 text-slate-700 stroke-[1.75]" />
                                <span className="text-[9px] font-black tracking-tight text-slate-900 uppercase">
                                  PDF
                                </span>
                              </div>
                            ) : (
                              <div className="w-10 h-11 border border-slate-300 rounded-md bg-white flex flex-col items-center justify-center shrink-0 shadow-2xs">
                                <ImageIcon className="w-4 h-4 text-blue-600 stroke-[1.75]" />
                                <span className="text-[9px] font-black tracking-tight text-blue-700 uppercase">
                                  IMG
                                </span>
                              </div>
                            )}

                            <div className="min-w-0 flex flex-col">
                              <span className="font-semibold text-xs text-slate-900 truncate">
                                {piece.fileName}
                              </span>
                              <span className="text-[11px] text-slate-500 mt-0.5 truncate">
                                {piece.motif || '305.35 KB · jeudi, 29 octobre 2026, 18:58'}
                              </span>
                            </div>
                          </div>

                          {/* Bouton de consultation / téléchargement */}
                          <button
                            type="button"
                            onClick={() =>
                              handlePreviewPiece(
                                piece.fileName,
                                piece.mimeType,
                                piece.downloadUrl || ''
                              )
                            }
                            className="p-2 text-slate-600 hover:text-blue-600 hover:bg-slate-50 rounded-lg transition-colors shrink-0"
                            title="Consulter le fichier"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Bouton 1 : « Modifier le dépôt » (Bleu) */}
                        <label className="btn-primary w-full h-[40px] text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer rounded-lg shadow-xs">
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>Modifier le dépôt</span>
                          <input
                            type="file"
                            accept="application/pdf,image/*"
                            className="hidden"
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) handleFileUpload(slot.slotId, slot.label, f);
                            }}
                          />
                        </label>

                        {/* Bouton 2 : « Supprimer le dépôt » (Bouton avec poubelle rouge) */}
                        <button
                          type="button"
                          onClick={() => handleDeleteFile(slot.slotId)}
                          className="w-full h-[40px] rounded-lg border border-slate-200 bg-white hover:bg-red-50 text-slate-700 hover:text-red-600 hover:border-red-200 font-semibold text-xs flex items-center justify-center gap-2 transition-colors"
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                          <span>Supprimer le dépôt</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Boutons d'action finale */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setShowUploadStep(false)}
                className="btn-secondary text-xs h-[36px]"
              >
                Retour aux choix
              </button>

              <button
                type="button"
                onClick={handleConfirmFinalSubmission}
                disabled={busy}
                className="btn-primary text-xs h-[36px] px-5"
              >
                {busy ? 'Transmission du dossier...' : 'Confirmer et envoyer la candidature'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* MODALE DE PRÉVISUALISATION DU DOCUMENT */}
      {previewModal.isOpen && (
        <div
          className="modal-overlay"
          onClick={() => setPreviewModal((prev) => ({ ...prev, isOpen: false }))}
        >
          <div
            className="modal-content max-w-2xl p-6 bg-white border border-slate-200 rounded-xl shadow-lg flex flex-col gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                <span className="font-display font-bold text-sm text-slate-900">
                  {previewModal.fileName}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setPreviewModal((prev) => ({ ...prev, isOpen: false }))}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Aperçu du contenu */}
            <div className="p-6 bg-slate-50 border border-slate-200 rounded-xl flex flex-col items-center justify-center min-h-[300px] text-center">
              {previewModal.mimeType.includes('image') && previewModal.url ? (
                <img
                  src={previewModal.url}
                  alt={previewModal.fileName}
                  className="max-h-[340px] max-w-full object-contain rounded-lg shadow-xs"
                />
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-16 h-20 border-2 border-slate-300 rounded-lg bg-white flex flex-col items-center justify-center shadow-xs">
                    <FileText className="w-8 h-8 text-blue-600 stroke-[1.5]" />
                    <span className="text-[10px] font-bold text-slate-800 uppercase mt-1">
                      PDF
                    </span>
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">
                      Document officiel enregistré
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {previewModal.fileName}
                    </p>
                    <span className="inline-block mt-2 px-2.5 py-1 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold">
                      Prêt pour instruction scientifique
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end">
              <button
                type="button"
                onClick={() => setPreviewModal((prev) => ({ ...prev, isOpen: false }))}
                className="btn-secondary text-xs h-[34px] px-4"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CartView;
