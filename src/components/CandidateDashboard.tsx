import React, { useState, useEffect, useMemo } from 'react';
import {
  Home as HomeIcon,
  FileText,
  User as UserIcon,
  Check,
  Edit2,
  Camera,
  Trash2,
  Bell,
  Calendar,
  Clock,
  MapPin,
  UserCheck,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Info,
  X,
  CheckCheck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { SujetRecord } from '../types/cedoc';
import { HomePage } from './HomePage';
import { CartView } from './CartView';
import { CalendrierView } from './CalendrierView';

interface CandidateDashboardProps {
  initialTab?: 'home' | 'candidature' | 'notifications' | 'profil';
  onViewSubjectDetails: (sujet: SujetRecord) => void;
  onOpenAuth: (mode: 'login' | 'register') => void;
  activeSection?: 'recherche' | 'calendrier';
  onSelectSection?: (sec: 'recherche' | 'calendrier') => void;
}

export const CandidateDashboard: React.FC<CandidateDashboardProps> = ({
  initialTab = 'home',
  onViewSubjectDetails,
  onOpenAuth,
  activeSection = 'recherche',
  onSelectSection,
}) => {
  const {
    user,
    profile,
    candidature,
    candidaturesDirecteurList,
    candidateNotifications,
    sujetsList,
    annulerCandidature,
    updateProfileData,
    markNotificationRead,
    markAllNotificationsRead,
  } = useAuth();

  const { clearCart, cartItems } = useCart();
  const [activeTab, setActiveTab] = useState<'home' | 'candidature' | 'notifications' | 'profil'>(initialTab);
  const [isViewingCart, setIsViewingCart] = useState(false);

  // Modale de confirmation pour annuler la candidature
  const [cancelModal, setCancelModal] = useState<{
    isOpen: boolean;
    candId: string;
    sujetId: string;
    sujetIntitule: string;
  }>({
    isOpen: false,
    candId: '',
    sujetId: '',
    sujetIntitule: '',
  });

  const [cancelFeedback, setCancelFeedback] = useState<string | null>(null);
  const [notificationsFilter, setNotificationsFilter] = useState<'all' | 'success' | 'danger' | 'info'>('all');

  const unreadNotificationsCount = useMemo(() => {
    return candidateNotifications.filter((n) => !n.read).length;
  }, [candidateNotifications]);

  // État profil
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileNom, setProfileNom] = useState(profile.nom || 'Monroe');
  const [profilePrenom, setProfilePrenom] = useState(profile.prenom || 'Aladin');
  const [profileTelephone, setProfileTelephone] = useState(profile.telephone || '+212 6 61 72 83 94');
  const [profileCne, setProfileCne] = useState(profile.cne || 'N138091823');
  const [profileEtablissement, setProfileEtablissement] = useState(
    profile.etablissementOrigine || 'EST Fès'
  );
  const [profileDiplome, setProfileDiplome] = useState(
    profile.diplomeObtenu || 'Master en Informatique et Systèmes Distribués'
  );
  const [profileAvatar, setProfileAvatar] = useState(profile.avatarUrl || '');

  // Sujets avec description développée dans l'historique
  const [expandedSujetIds, setExpandedSujetIds] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setProfileNom(profile.nom);
    setProfilePrenom(profile.prenom);
    setProfileTelephone(profile.telephone);
    setProfileCne(profile.cne);
    setProfileEtablissement(profile.etablissementOrigine);
    setProfileDiplome(profile.diplomeObtenu);
    setProfileAvatar(profile.avatarUrl || '');
  }, [profile]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async () => {
        const url = reader.result as string;
        setProfileAvatar(url);
        await updateProfileData({ avatarUrl: url });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateProfileData({
      nom: profileNom,
      prenom: profilePrenom,
      telephone: profileTelephone,
      cne: profileCne,
      etablissementOrigine: profileEtablissement,
      diplomeObtenu: profileDiplome,
      avatarUrl: profileAvatar,
    });
    setIsEditingProfile(false);
  };

  // Liste des candidatures transmises par ce candidat
  const candidateEmail = (user?.email || profile.email).trim().toLowerCase();
  const mySentCandidatures = candidaturesDirecteurList.filter(
    (c) => c.candidatEmail.trim().toLowerCase() === candidateEmail
  );

  const isEnvoyee = mySentCandidatures.length > 0 || (!!candidature && candidature.statut !== 'En dépôt');
  const candRetenue = mySentCandidatures.find((c) => c.decisionDirecteur === 'Retenue') || (candidature?.statut === 'Convoqué' ? candidature : null);
  const hasRetenue = !!candRetenue;
  const allRejetees = mySentCandidatures.length > 0 && mySentCandidatures.every((c) => c.decisionDirecteur === 'Rejetée');

  const convocationData = useMemo(() => {
    if (!hasRetenue) return null;
    const fromSent = mySentCandidatures.find((c) => c.decisionDirecteur === 'Retenue');
    return {
      date: fromSent?.convocationDate || candidature?.convocationDate || '24 novembre 2026',
      heure: fromSent?.convocationHeure || candidature?.convocationHeure || '10:00',
      lieu: fromSent?.convocationLieu || candidature?.convocationLieu || 'Salle des actes, EST Fès',
      instructions: fromSent?.convocationInstructions || candidature?.convocationInstructions,
      sujetIntitule: fromSent?.sujetIntitule || candidature?.sujetsChoisis?.[0]?.intitule || 'Sujet doctoral sélectionné',
      directeurNom: fromSent?.directeurNom || candidature?.sujetsChoisis?.[0]?.directeur || 'Directeur de thèse',
    };
  }, [hasRetenue, mySentCandidatures, candidature]);

  /*
    RÈGLES FORMELLES DES COULEURS DE PROGRESSION :
    - Étape terminée : VERT
    - Étape à mi-chemin / en cours : ROUGE
    - Étape future / pas encore le moment : GRIS
  */
  const step1State: 'vert' | 'rouge' | 'gris' = isEnvoyee ? 'vert' : 'rouge';
  const step2State: 'vert' | 'rouge' | 'gris' = !isEnvoyee ? 'gris' : hasRetenue || allRejetees ? 'vert' : 'rouge';
  const step3State: 'vert' | 'rouge' | 'gris' = !isEnvoyee ? 'gris' : hasRetenue ? 'vert' : allRejetees ? 'rouge' : 'rouge';
  const step4State: 'vert' | 'rouge' | 'gris' = !isEnvoyee ? 'gris' : hasRetenue ? 'vert' : 'gris';

  const stepsList = [
    { id: 'step_depot', title: '1. Dépôt de candidature', state: step1State },
    { id: 'step_precontrole', title: '2. Pré-contrôle administratif', state: step2State },
    { id: 'step_evaluation', title: '3. Décision du directeur', state: step3State },
    { id: 'step_convocation', title: '4. Convocation à l’entretien', state: step4State },
  ];

  const toggleExpand = (sujetId: string) => {
    setExpandedSujetIds((prev) => ({
      ...prev,
      [sujetId]: !prev[sujetId],
    }));
  };

  const handleOpenCancelModal = (candId: string, sujetId: string, intitule: string) => {
    setCancelModal({
      isOpen: true,
      candId,
      sujetId,
      sujetIntitule: intitule,
    });
  };

  const handleConfirmCancel = async () => {
    if (!cancelModal.sujetId) return;
    const intitule = cancelModal.sujetIntitule;
    await annulerCandidature(cancelModal.candId, cancelModal.sujetId);
    setCancelModal({
      isOpen: false,
      candId: '',
      sujetId: '',
      sujetIntitule: '',
    });
    setCancelFeedback(`La candidature pour « ${intitule} » a été annulée et définitivement supprimée avec succès.`);
    setTimeout(() => {
      setCancelFeedback(null);
    }, 6000);
  };

  return (
    <div className="min-h-[calc(100vh-64px)] pb-20">
      {/* 1. ONGLET HOME */}
      {activeTab === 'home' && (
        !isViewingCart ? (
          activeSection === 'calendrier' ? (
            <CalendrierView
              onBackToRecherche={() => onSelectSection && onSelectSection('recherche')}
            />
          ) : (
            <HomePage
              onViewSubjectDetails={onViewSubjectDetails}
              onOpenCart={() => setIsViewingCart(true)}
              isCandidateMode
            />
          )
        ) : (
          <CartView
            onBackToHome={() => setIsViewingCart(false)}
            onOpenAuth={onOpenAuth}
            onViewSubjectDetails={onViewSubjectDetails}
            onGoToProgression={() => {
              setIsViewingCart(false);
              setActiveTab('candidature');
            }}
          />
        )
      )}

      {/* 2. ONGLET CANDIDATURE (Historique complet + Barre de progression + Journal) */}
      {activeTab === 'candidature' && (
        <div className="py-6">
          <div className="desktop-container max-w-[820px] mx-auto px-4 flex flex-col gap-5">
            {/* Feedback notification après annulation */}
            {cancelFeedback && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-center justify-between shadow-2xs animate-fadeIn">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="font-semibold">{cancelFeedback}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setCancelFeedback(null)}
                  className="text-emerald-700 hover:text-emerald-950 p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* EN-TÊTE DE LA SECTION HISTORIQUE */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col gap-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h1 className="font-display font-bold text-base text-slate-900">
                  Historique de mes candidatures
                </h1>
                <span className="text-xs font-semibold text-slate-600 bg-slate-50 px-2.5 py-1 rounded-full border border-slate-200">
                  {mySentCandidatures.length} candidature{mySentCandidatures.length > 1 ? 's' : ''}
                </span>
              </div>

              {mySentCandidatures.length === 0 ? (
                <div className="py-8 text-center flex flex-col items-center gap-2">
                  <FileText className="w-8 h-8 text-slate-300 stroke-[1.5]" />
                  <p className="text-xs text-slate-500">
                    Aucune candidature transmise pour le moment.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('home')}
                    className="btn-secondary text-xs h-[34px] px-3.5 mt-1"
                  >
                    Explorer les sujets disponibles
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {mySentCandidatures.map((cand) => {
                    const fullSujet = sujetsList.find((s) => s.id === cand.sujetId);
                    const isExpanded = expandedSujetIds[cand.sujetId] ?? true;
                    const isRetenue = cand.decisionDirecteur === 'Retenue';
                    const isRejetee = cand.decisionDirecteur === 'Rejetée';

                    return (
                      <div
                        key={cand.id}
                        className={`border rounded-xl p-4 flex flex-col gap-3 transition-colors ${
                          isRetenue
                            ? 'bg-emerald-50/25 border-emerald-300'
                            : isRejetee
                            ? 'bg-red-50/20 border-red-200'
                            : 'bg-white border-slate-200'
                        }`}
                      >
                        {/* Ligne 1 : Intitulé, spécialité et statut */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block">
                              {fullSujet?.discipline || 'Doctorat'}
                            </span>
                            <h2 className="font-bold text-sm text-slate-900 leading-snug mt-0.5">
                              {cand.sujetIntitule}
                            </h2>
                          </div>

                          <span
                            className={`text-[10px] font-bold px-2.5 py-1 rounded-full border shrink-0 ${
                              isRetenue
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                : isRejetee
                                ? 'bg-red-100 text-red-800 border-red-300'
                                : 'bg-blue-50 text-blue-700 border-blue-200'
                            }`}
                          >
                            {isRetenue
                              ? 'Retenue (Admis pour entretien)'
                              : isRejetee
                              ? 'Candidature non retenue'
                              : 'En cours d’instruction'}
                          </span>
                        </div>

                        {/* Ligne 2 : Directeur et date d'envoi */}
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 border-y border-slate-100 py-2">
                          <div className="flex items-center gap-1.5 font-medium">
                            <UserCheck className="w-3.5 h-3.5 text-blue-600" />
                            <span>{cand.directeurNom}</span>
                          </div>
                          <div className="flex items-center gap-1.5 font-medium">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            <span>Date d’envoi : {cand.dateDepot}</span>
                          </div>
                        </div>

                        {/* Ligne 3 : Description officielle du sujet */}
                        {fullSujet?.description && (
                          <div className="flex flex-col gap-1 text-xs text-slate-600">
                            <button
                              type="button"
                              onClick={() => toggleExpand(cand.sujetId)}
                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-700 hover:text-blue-600 self-start"
                            >
                              <span>Description officielle du sujet</span>
                              {isExpanded ? (
                                <ChevronUp className="w-3.5 h-3.5" />
                              ) : (
                                <ChevronDown className="w-3.5 h-3.5" />
                              )}
                            </button>

                            {isExpanded && (
                              <p className="p-3 bg-slate-50 border border-slate-100 rounded-lg text-slate-700 leading-relaxed text-xs">
                                {fullSujet.description}
                              </p>
                            )}
                          </div>
                        )}

                        {/* Motif du rejet affiché clairement */}
                        {isRejetee && cand.motifRejet && (
                          <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800">
                            <span className="font-bold block mb-0.5">Motif communiqué :</span>
                            <span>{cand.motifRejet}</span>
                          </div>
                        )}

                        {/* Détails de la convocation si retenue */}
                        {isRetenue && (cand.convocationDate || cand.convocationHeure || cand.convocationLieu) && (
                          <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-lg flex flex-col gap-2 text-xs">
                            <span className="font-bold text-emerald-900 flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-emerald-700" />
                              <span>Convocation officielle à l’entretien fixée par le directeur :</span>
                            </span>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-white/90 p-2 rounded border border-emerald-200 text-slate-800">
                              <div>
                                <span className="text-[10px] text-slate-400 block font-bold uppercase">Date</span>
                                <span className="font-bold">{cand.convocationDate}</span>
                              </div>
                              <div>
                                <span className="text-[10px] text-slate-400 block font-bold uppercase">Heure</span>
                                <span className="font-bold">{cand.convocationHeure}</span>
                              </div>
                              <div>
                                <span className="text-[10px] text-slate-400 block font-bold uppercase">Lieu ou lien</span>
                                <span className="font-bold truncate block" title={cand.convocationLieu}>{cand.convocationLieu}</span>
                              </div>
                            </div>
                            {cand.convocationInstructions && (
                              <div className="text-[11px] text-slate-700 bg-white/70 p-2 rounded border border-emerald-200">
                                <strong>Consignes : </strong>{cand.convocationInstructions}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Bouton d'annulation de la candidature */}
                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                          <span className="text-[11px] text-slate-400">
                            Candidature transmise · Dossier actif
                          </span>
                          <button
                            type="button"
                            onClick={() => handleOpenCancelModal(cand.id, cand.sujetId, cand.sujetIntitule)}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-lg border border-red-200 transition-colors shadow-2xs"
                            title="Annuler et supprimer définitivement cette candidature"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Annuler la candidature</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* PARTIE PROGRESSION (Épurée sans descriptions de couleurs ni détails encombrants) */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex flex-col gap-5">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h2 className="font-display font-bold text-base text-slate-900">
                  Progression de la candidature
                </h2>
              </div>

              {/* Stepper horizontal épuré */}
              <div className="py-4 px-2">
                <div className="grid grid-cols-4 gap-4 relative">
                  <div className="absolute top-5 left-10 right-10 h-0.5 bg-slate-200 -z-0" />

                  {stepsList.map((st, index) => {
                    const isVert = st.state === 'vert';
                    const isRouge = st.state === 'rouge';

                    return (
                      <div
                        key={st.id}
                        className="flex flex-col items-center text-center relative z-10"
                      >
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-colors ${
                            isVert
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : isRouge
                              ? 'bg-red-600 text-white shadow-xs'
                              : 'bg-white border-2 border-slate-300 text-slate-400'
                          }`}
                        >
                          {isVert ? (
                            <Check className="w-5 h-5 stroke-[2.5]" />
                          ) : (
                            <span>{index + 1}</span>
                          )}
                        </div>

                        <span className="font-semibold text-slate-900 text-xs mt-3 leading-snug">
                          {st.title}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* DÉTAILS DE LA CONVOCATION À L'ENTRETIEN */}
              {hasRetenue && convocationData && (
                <div className="p-5 rounded-xl border border-emerald-300 bg-emerald-50/40 flex flex-col gap-3.5">
                  <div className="flex items-center justify-between pb-2 border-b border-emerald-200/60">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
                        <Calendar className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-emerald-950">
                          Convocation officielle à l’entretien scientifique
                        </h3>
                        <span className="text-[11px] text-emerald-800">
                          Votre dossier a été validé et retenu par Pr. {convocationData.directeurNom}.
                        </span>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-3 py-1 rounded-full">
                      Candidat retenu
                    </span>
                  </div>

                  <div className="text-xs text-slate-800 bg-white/80 p-2.5 rounded-lg border border-emerald-200">
                    <span className="font-medium text-slate-500">Sujet de thèse : </span>
                    <span className="font-bold text-slate-900">{convocationData.sujetIntitule}</span>
                  </div>

                  {/* Les 3 données clés obligatoires : date fixée, heure exacte, lieu ou lien */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div className="bg-white p-3 rounded-lg border border-emerald-200 flex flex-col gap-1 shadow-2xs">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-emerald-600" /> Date fixée
                      </span>
                      <span className="font-bold text-slate-900 text-sm">
                        {convocationData.date || 'À déterminer'}
                      </span>
                    </div>

                    <div className="bg-white p-3 rounded-lg border border-emerald-200 flex flex-col gap-1 shadow-2xs">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-emerald-600" /> Heure exacte
                      </span>
                      <span className="font-bold text-slate-900 text-sm">
                        {convocationData.heure || '10:00'}
                      </span>
                    </div>

                    <div className="bg-white p-3 rounded-lg border border-emerald-200 flex flex-col gap-1 shadow-2xs">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-emerald-600" /> Lieu ou lien
                      </span>
                      <span className="font-bold text-slate-900 text-sm truncate" title={convocationData.lieu}>
                        {convocationData.lieu || 'Salle des actes, EST Fès'}
                      </span>
                    </div>
                  </div>

                  {/* Consignes ou instructions additionnelles */}
                  {convocationData.instructions && (
                    <div className="bg-white p-3 rounded-lg border border-emerald-200 text-xs text-slate-700 flex flex-col gap-1">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        Consignes ou instructions additionnelles du jury :
                      </span>
                      <p className="text-slate-800 leading-relaxed font-medium">
                        {convocationData.instructions}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* 3. NOUVEL ONGLET DÉDIÉ : JOURNAL DES NOTIFICATIONS */}
      {activeTab === 'notifications' && (
        <div className="py-6">
          <div className="desktop-container max-w-[820px] mx-auto px-4 flex flex-col gap-5">
            <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-xs flex flex-col gap-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <Bell className="w-5 h-5" />
                  </div>
                  <div>
                    <h1 className="font-display font-bold text-base text-slate-900 leading-tight">
                      Journal des notifications
                    </h1>
                    <span className="text-xs text-slate-500">
                      Suivi en temps réel des convocations, décisions de directeurs et avis officiels
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                    {candidateNotifications.length} notification{candidateNotifications.length > 1 ? 's' : ''}
                  </span>
                  {unreadNotificationsCount > 0 && (
                    <button
                      type="button"
                      onClick={markAllNotificationsRead}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-2.5 py-1 rounded-md transition-colors"
                      title="Marquer toutes les notifications comme lues"
                    >
                      <CheckCheck className="w-3.5 h-3.5" />
                      <span>Tout marquer comme lu</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Filtres de notifications */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setNotificationsFilter('all')}
                  className={`px-3 py-1.5 rounded-lg transition-all whitespace-nowrap ${
                    notificationsFilter === 'all'
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Toutes ({candidateNotifications.length})
                </button>
                <button
                  type="button"
                  onClick={() => setNotificationsFilter('success')}
                  className={`px-3 py-1.5 rounded-lg transition-all whitespace-nowrap ${
                    notificationsFilter === 'success'
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Convocations & Retenues
                </button>
                <button
                  type="button"
                  onClick={() => setNotificationsFilter('danger')}
                  className={`px-3 py-1.5 rounded-lg transition-all whitespace-nowrap ${
                    notificationsFilter === 'danger'
                      ? 'bg-red-600 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Décisions & Rejets
                </button>
                <button
                  type="button"
                  onClick={() => setNotificationsFilter('info')}
                  className={`px-3 py-1.5 rounded-lg transition-all whitespace-nowrap ${
                    notificationsFilter === 'info'
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Informations
                </button>
              </div>

              {/* Liste des notifications */}
              {candidateNotifications.length === 0 ? (
                <div className="py-12 text-center flex flex-col items-center justify-center gap-2">
                  <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                    <Bell className="w-6 h-6 stroke-[1.5]" />
                  </div>
                  <h3 className="font-semibold text-slate-800 text-sm">
                    Aucune notification pour le moment
                  </h3>
                  <p className="text-xs text-slate-500 max-w-sm">
                    Les convocations aux entretiens et les décisions des directeurs de thèse apparaîtront ici dès leur émission.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-2.5">
                  {candidateNotifications
                    .filter((n) => {
                      if (notificationsFilter === 'all') return true;
                      return n.type === notificationsFilter;
                    })
                    .map((notif) => {
                      const isSuccess = notif.type === 'success';
                      const isDanger = notif.type === 'danger';

                      return (
                        <div
                          key={notif.id}
                          onClick={() => markNotificationRead(notif.id)}
                          className={`p-4 rounded-xl border transition-all cursor-pointer flex items-start justify-between gap-3 ${
                            isSuccess
                              ? 'bg-emerald-50/40 border-emerald-200 hover:border-emerald-300'
                              : isDanger
                              ? 'bg-red-50/30 border-red-200 hover:border-red-300'
                              : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-2xs'
                          }`}
                        >
                          <div className="flex items-start gap-3 min-w-0">
                            <div
                              className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                                isSuccess
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : isDanger
                                  ? 'bg-red-100 text-red-700'
                                  : 'bg-blue-50 text-blue-600'
                              }`}
                            >
                              {isSuccess ? (
                                <CheckCircle2 className="w-4 h-4" />
                              ) : isDanger ? (
                                <AlertTriangle className="w-4 h-4" />
                              ) : (
                                <Info className="w-4 h-4" />
                              )}
                            </div>

                            <div className="flex flex-col gap-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="font-bold text-xs sm:text-sm text-slate-900 leading-snug">
                                  {notif.title}
                                </h3>
                                {!notif.read && (
                                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-blue-600 text-white">
                                    Nouveau
                                  </span>
                                )}
                              </div>

                              {notif.detail && (
                                <p className="text-xs text-slate-600 leading-relaxed">
                                  {notif.detail}
                                </p>
                              )}

                              <span className="text-[10px] text-slate-400 mt-0.5 font-medium">
                                {notif.date}
                              </span>
                            </div>
                          </div>

                          {!notif.read && (
                            <span className="w-2.5 h-2.5 rounded-full bg-blue-600 shrink-0 mt-2" title="Non lu" />
                          )}
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 3. ONGLET PROFIL */}
      {activeTab === 'profil' && (
        <div className="py-6">
          <div className="desktop-container max-w-[540px] mx-auto px-4 flex flex-col gap-5">
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex flex-col gap-6">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h1 className="font-display font-bold text-base text-slate-900">
                  Profil du Candidat
                </h1>

                {!isEditingProfile && (
                  <button
                    type="button"
                    onClick={() => setIsEditingProfile(true)}
                    className="inline-flex items-center gap-1.5 btn-sm-secondary text-xs h-[34px] px-3.5"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Modifier le profil</span>
                  </button>
                )}
              </div>

              {/* Photo de profil cliquable */}
              <div className="flex flex-col items-center text-center gap-3 pb-3 border-b border-slate-100">
                <div className="relative group">
                  <label
                    htmlFor="avatar-upload"
                    className="w-20 h-20 rounded-full overflow-hidden bg-slate-100 border-2 border-slate-200 flex items-center justify-center cursor-pointer transition-all hover:border-blue-500 shadow-xs block relative"
                    title="Changer la photo"
                  >
                    {profileAvatar ? (
                      <img
                        src={profileAvatar}
                        alt="Photo de profil"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-xl">
                        {profilePrenom.charAt(0)}
                        {profileNom.charAt(0)}
                      </div>
                    )}

                    <div className="absolute inset-0 bg-slate-900/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                      <Camera className="w-5 h-5" />
                    </div>
                  </label>

                  <input
                    id="avatar-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarChange}
                  />

                  <label
                    htmlFor="avatar-upload"
                    className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center cursor-pointer shadow-xs hover:bg-blue-700 transition-colors"
                  >
                    <Camera className="w-3.5 h-3.5" />
                  </label>
                </div>

                <div>
                  <h2 className="font-display font-bold text-base text-slate-900 leading-tight">
                    {profilePrenom} {profileNom}
                  </h2>
                  <span className="text-xs text-slate-500 font-medium">
                    {profileCne || 'Étudiant candidat'} · {profileEtablissement}
                  </span>
                </div>
              </div>

              {/* Informations essentielles */}
              {!isEditingProfile ? (
                <div className="flex flex-col divide-y divide-slate-100 text-xs">
                  <div className="py-2.5 flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Nom</span>
                    <span className="font-semibold text-slate-900">{profileNom}</span>
                  </div>
                  <div className="py-2.5 flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Prénom</span>
                    <span className="font-semibold text-slate-900">{profilePrenom}</span>
                  </div>
                  <div className="py-2.5 flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Email académique</span>
                    <span className="font-semibold text-slate-900">{profile.email}</span>
                  </div>
                  <div className="py-2.5 flex items-center justify-between">
                    <span className="text-slate-500 font-medium">CNE / Code Massar</span>
                    <span className="font-semibold text-slate-900">{profileCne}</span>
                  </div>
                  <div className="py-2.5 flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Téléphone</span>
                    <span className="font-semibold text-slate-900">{profileTelephone}</span>
                  </div>
                  <div className="py-2.5 flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Établissement d’origine</span>
                    <span className="font-semibold text-slate-900">{profileEtablissement}</span>
                  </div>
                  <div className="py-2.5 flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Diplôme d’accès</span>
                    <span className="font-semibold text-slate-900">{profileDiplome}</span>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSaveProfile} className="flex flex-col gap-3.5 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Nom</label>
                    <input
                      type="text"
                      value={profileNom}
                      onChange={(e) => setProfileNom(e.target.value)}
                      className="form-input text-xs h-[36px]"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Prénom</label>
                    <input
                      type="text"
                      value={profilePrenom}
                      onChange={(e) => setProfilePrenom(e.target.value)}
                      className="form-input text-xs h-[36px]"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Téléphone</label>
                    <input
                      type="text"
                      value={profileTelephone}
                      onChange={(e) => setProfileTelephone(e.target.value)}
                      className="form-input text-xs h-[36px]"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">CNE / Code Massar</label>
                    <input
                      type="text"
                      value={profileCne}
                      onChange={(e) => setProfileCne(e.target.value)}
                      className="form-input text-xs h-[36px]"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Établissement d’origine</label>
                    <input
                      type="text"
                      value={profileEtablissement}
                      onChange={(e) => setProfileEtablissement(e.target.value)}
                      className="form-input text-xs h-[36px]"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Diplôme d’accès</label>
                    <input
                      type="text"
                      value={profileDiplome}
                      onChange={(e) => setProfileDiplome(e.target.value)}
                      className="form-input text-xs h-[36px]"
                    />
                  </div>
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                    <button
                      type="button"
                      onClick={() => setIsEditingProfile(false)}
                      className="btn-secondary text-xs h-[34px] px-3"
                    >
                      Annuler
                    </button>
                    <button type="submit" className="btn-primary text-xs h-[34px] px-3.5">
                      Enregistrer
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODALE DE CONFIRMATION : ANNULER ET SUPPRIMER LA CANDIDATURE */}
      {cancelModal.isOpen && (
        <div
          className="modal-overlay"
          onClick={() => setCancelModal((prev) => ({ ...prev, isOpen: false }))}
        >
          <div
            className="modal-content max-w-md p-6 bg-white border border-slate-200 rounded-xl shadow-xl flex flex-col gap-4 animate-scaleUp"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-red-100 text-red-700 flex items-center justify-center shrink-0">
                  <Trash2 className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h2 className="font-display font-bold text-sm text-slate-900 leading-tight">
                    Annuler la candidature
                  </h2>
                  <span className="text-xs text-slate-500">
                    Confirmation de suppression définitive
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCancelModal((prev) => ({ ...prev, isOpen: false }))}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3.5 rounded-lg border border-slate-200 flex flex-col gap-2">
              <p>
                Êtes-vous sûr de vouloir annuler et supprimer définitivement votre candidature pour le sujet :
              </p>
              <p className="font-bold text-slate-900 bg-white p-2.5 rounded border border-slate-200 text-xs">
                « {cancelModal.sujetIntitule} »
              </p>
              <p className="text-[11px] text-red-600 font-medium">
                Cette action est immédiate : votre candidature sera retirée de la liste d’évaluation du directeur et le sujet sera libéré dans le catalogue.
              </p>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setCancelModal((prev) => ({ ...prev, isOpen: false }))}
                className="btn-secondary text-xs h-[36px] px-3.5"
              >
                Conserver la candidature
              </button>

              <button
                type="button"
                onClick={handleConfirmCancel}
                className="btn-primary text-xs h-[36px] px-4 bg-red-600 hover:bg-red-700 border-red-600 text-white font-semibold flex items-center gap-1.5 shadow-xs"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Oui, annuler et supprimer</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PESTAÑAS DE NAVEGACIÓN EN LA PARTE INFERIOR: Home, Candidature, Notifications, Profil */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 shadow-md h-[54px] flex items-center justify-center">
        <div className="desktop-container flex items-center justify-around max-w-lg w-full px-2">
          <button
            type="button"
            onClick={() => {
              setIsViewingCart(false);
              setActiveTab('home');
            }}
            className={`flex flex-col items-center gap-1 text-xs font-semibold transition-colors ${
              activeTab === 'home' && !isViewingCart
                ? 'text-blue-600'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <HomeIcon className="w-5 h-5" />
            <span>Home</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setIsViewingCart(false);
              setActiveTab('candidature');
            }}
            className={`flex flex-col items-center gap-1 text-xs font-semibold transition-colors ${
              activeTab === 'candidature'
                ? 'text-blue-600'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileText className="w-5 h-5" />
            <span>Candidature</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setIsViewingCart(false);
              setActiveTab('notifications');
            }}
            className={`relative flex flex-col items-center gap-1 text-xs font-semibold transition-colors ${
              activeTab === 'notifications'
                ? 'text-blue-600'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <div className="relative">
              <Bell className="w-5 h-5" />
              {unreadNotificationsCount > 0 && (
                <span className="absolute -top-1 -right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-red-600 text-white text-[9px] font-bold flex items-center justify-center leading-none">
                  {unreadNotificationsCount}
                </span>
              )}
            </div>
            <span>Notifications</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setIsViewingCart(false);
              setActiveTab('profil');
            }}
            className={`flex flex-col items-center gap-1 text-xs font-semibold transition-colors ${
              activeTab === 'profil'
                ? 'text-blue-600'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <UserIcon className="w-5 h-5" />
            <span>Profil</span>
          </button>
        </div>
      </nav>
    </div>
  );
};

export default CandidateDashboard;
