import React, { useState } from 'react';
import {
  Home as HomeIcon,
  Clock,
  User as UserIcon,
  Check,
  X,
  Edit2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { SujetRecord, TimelineStep } from '../types/cedoc';
import { HomePage } from './HomePage';
import { CartView } from './CartView';

interface CandidateDashboardProps {
  initialTab?: 'home' | 'progression' | 'profil';
  onViewSubjectDetails: (sujet: SujetRecord) => void;
  onOpenAuth: (mode: 'login' | 'register') => void;
}

export const CandidateDashboard: React.FC<CandidateDashboardProps> = ({
  initialTab = 'home',
  onViewSubjectDetails,
  onOpenAuth,
}) => {
  const { profile, candidature, updateProfileData } = useAuth();
  const [activeTab, setActiveTab] = useState<'home' | 'progression' | 'profil'>(initialTab);
  const [isViewingCart, setIsViewingCart] = useState(false);

  // Mode édition pour le profil (inactif par défaut)
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileNom, setProfileNom] = useState(profile.nom || 'Micha');
  const [profilePrenom, setProfilePrenom] = useState(profile.prenom || 'Manuel');
  const [profileTelephone, setProfileTelephone] = useState(profile.telephone || '+212 6 12 34 56 78');
  const [profileCne, setProfileCne] = useState(profile.cne || 'N134098712');
  const [profileEtablissement, setProfileEtablissement] = useState(
    profile.etablissementOrigine || 'EST Fès'
  );
  const [profileDiplome, setProfileDiplome] = useState(
    profile.diplomeObtenu || 'Master en Informatique'
  );

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateProfileData({
      nom: profileNom,
      prenom: profilePrenom,
      telephone: profileTelephone,
      cne: profileCne,
      etablissementOrigine: profileEtablissement,
      diplomeObtenu: profileDiplome,
    });
    setIsEditingProfile(false);
  };

  // 4 étapes strictes sans sous-titres superflus ni "en attente"
  const timelineSteps: TimelineStep[] = [
    {
      id: 'depot',
      title: 'Candidature envoyée',
      subtitle: '',
      state:
        candidature && candidature.statut !== 'En dépôt' && candidature.statut !== 'Compte créé'
          ? 'validee'
          : 'en_attente',
      dateInfo: '',
    },
    {
      id: 'precontrole',
      title: 'Pré-contrôle administratif',
      subtitle: '',
      state:
        candidature?.statut === 'Présélectionné' ||
        candidature?.statut === 'Convoqué' ||
        candidature?.statut === 'Admis'
          ? 'validee'
          : candidature?.statut === 'Non présélectionné' || candidature?.statut === 'Incomplet'
          ? 'action_requise'
          : 'en_attente',
      dateInfo: '',
    },
    {
      id: 'evaluation',
      title: 'Évaluation scientifique',
      subtitle: '',
      state:
        candidature?.statut === 'Convoqué' || candidature?.statut === 'Admis'
          ? 'validee'
          : candidature?.statut === 'Non admis'
          ? 'action_requise'
          : 'en_attente',
      dateInfo: '',
    },
    {
      id: 'convocation',
      title: 'Convocation à l’entretien',
      subtitle: '',
      state:
        candidature?.statut === 'Convoqué' || candidature?.statut === 'Admis'
          ? 'validee'
          : 'en_attente',
      dateInfo: '',
    },
  ];

  return (
    <div className="min-h-[calc(100vh-64px)] pb-20">
      {/* 1. ONGLET HOME (Accueil / Recherche de sujets avec le grand cadre et panier dynamique) */}
      {activeTab === 'home' && (
        !isViewingCart ? (
          <HomePage
            onViewSubjectDetails={onViewSubjectDetails}
            onOpenCart={() => setIsViewingCart(true)}
            isCandidateMode
          />
        ) : (
          <CartView
            onBackToHome={() => setIsViewingCart(false)}
            onOpenAuth={onOpenAuth}
            onViewSubjectDetails={onViewSubjectDetails}
            onGoToProgression={() => {
              setIsViewingCart(false);
              setActiveTab('progression');
            }}
          />
        )
      )}

      {/* 2. ONGLET PROGRESSION (Timeline 4 étapes avec pastilles 🟢 Vert, 🔴 Rouge, ⚪ Gris) */}
      {activeTab === 'progression' && (
        <div className="py-8">
          <div className="desktop-container max-w-4xl flex flex-col gap-6">
            <div className="bg-white border border-slate-200 rounded-xl p-8 shadow-xs">
              <h1 className="font-display font-bold text-lg text-slate-900 pb-6 border-b border-slate-100">
                Progression de la candidature
              </h1>

              <div className="py-8 px-4">
                <div className="grid grid-cols-4 gap-4 relative">
                  <div className="absolute top-5 left-10 right-10 h-0.5 bg-slate-200 -z-0" />

                  {timelineSteps.map((step, index) => {
                    const isValide = step.state === 'validee';
                    const isActionRequise = step.state === 'action_requise';

                    return (
                      <div
                        key={step.id}
                        className="flex flex-col items-center text-center relative z-10"
                      >
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                            isValide
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : isActionRequise
                              ? 'bg-red-600 text-white shadow-xs'
                              : 'bg-white border-2 border-slate-300 text-slate-400'
                          }`}
                        >
                          {isValide ? (
                            <Check className="w-5 h-5 stroke-[2.5]" />
                          ) : isActionRequise ? (
                            <X className="w-5 h-5 stroke-[2.5]" />
                          ) : (
                            <span>{index + 1}</span>
                          )}
                        </div>

                        <span className="font-semibold text-slate-900 text-xs mt-3 leading-snug">
                          {step.title}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. ONGLET PROFIL (Mode lecture par défaut, éditable uniquement au clic sur Modifier) */}
      {activeTab === 'profil' && (
        <div className="py-8">
          <div className="desktop-container max-w-3xl flex flex-col gap-6">
            <div className="bg-white border border-slate-200 rounded-xl p-8 shadow-xs flex flex-col gap-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <h1 className="font-display font-bold text-lg text-slate-900">
                  Profil du candidat
                </h1>

                {!isEditingProfile && (
                  <button
                    type="button"
                    onClick={() => setIsEditingProfile(true)}
                    className="inline-flex items-center gap-1.5 btn-sm-secondary"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Modifier le profil</span>
                  </button>
                )}
              </div>

              {!isEditingProfile ? (
                <div className="grid grid-cols-2 gap-6 text-sm">
                  <div>
                    <span className="text-xs text-slate-400 font-medium block">Nom</span>
                    <span className="font-semibold text-slate-800">{profileNom}</span>
                  </div>

                  <div>
                    <span className="text-xs text-slate-400 font-medium block">Prénom</span>
                    <span className="font-semibold text-slate-800">{profilePrenom}</span>
                  </div>

                  <div>
                    <span className="text-xs text-slate-400 font-medium block">Email</span>
                    <span className="font-semibold text-slate-800">{profile.email}</span>
                  </div>

                  <div>
                    <span className="text-xs text-slate-400 font-medium block">Téléphone</span>
                    <span className="font-semibold text-slate-800">{profileTelephone}</span>
                  </div>

                  <div>
                    <span className="text-xs text-slate-400 font-medium block">CNE / Massar</span>
                    <span className="font-semibold text-slate-800">{profileCne}</span>
                  </div>

                  <div>
                    <span className="text-xs text-slate-400 font-medium block">Établissement</span>
                    <span className="font-semibold text-slate-800">{profileEtablissement}</span>
                  </div>

                  <div className="col-span-2">
                    <span className="text-xs text-slate-400 font-medium block">Diplôme</span>
                    <span className="font-semibold text-slate-800">{profileDiplome}</span>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSaveProfile} className="flex flex-col gap-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Nom
                      </label>
                      <input
                        type="text"
                        value={profileNom}
                        onChange={(e) => setProfileNom(e.target.value)}
                        className="form-input text-sm"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Prénom
                      </label>
                      <input
                        type="text"
                        value={profilePrenom}
                        onChange={(e) => setProfilePrenom(e.target.value)}
                        className="form-input text-sm"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Téléphone
                      </label>
                      <input
                        type="text"
                        value={profileTelephone}
                        onChange={(e) => setProfileTelephone(e.target.value)}
                        className="form-input text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        CNE / Code Massar
                      </label>
                      <input
                        type="text"
                        value={profileCne}
                        onChange={(e) => setProfileCne(e.target.value)}
                        className="form-input text-sm"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Établissement
                      </label>
                      <input
                        type="text"
                        value={profileEtablissement}
                        onChange={(e) => setProfileEtablissement(e.target.value)}
                        className="form-input text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Diplôme
                      </label>
                      <input
                        type="text"
                        value={profileDiplome}
                        onChange={(e) => setProfileDiplome(e.target.value)}
                        className="form-input text-sm"
                      />
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setIsEditingProfile(false)}
                      className="btn-secondary text-xs"
                    >
                      Annuler
                    </button>
                    <button type="submit" className="btn-primary text-xs">
                      Enregistrer
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* PESTANAS DE NAVEGACION EN LA PARTE INFERIOR : Exactamente Home, Progression, Profil */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 shadow-md h-[54px] flex items-center justify-center">
        <div className="desktop-container flex items-center justify-around max-w-md w-full">
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
              setActiveTab('progression');
            }}
            className={`flex flex-col items-center gap-1 text-xs font-semibold transition-colors ${
              activeTab === 'progression'
                ? 'text-blue-600'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Clock className="w-5 h-5" />
            <span>Progression</span>
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
