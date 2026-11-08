import React, { useState } from 'react';
import {
  Home as HomeIcon,
  Clock,
  User as UserIcon,
  Check,
  X,
  Edit2,
  Camera,
  CheckCircle2,
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

  // État profil
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
  const [profileAvatar, setProfileAvatar] = useState(profile.avatarUrl || '');

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

  // 4 étapes strictes de la timeline
  const isEnvoyee = candidature?.statut === 'Envoyée' || candidature?.statut === 'Présélectionné' || candidature?.statut === 'Convoqué' || candidature?.statut === 'Admis';

  const timelineSteps: TimelineStep[] = [
    {
      id: 'depot',
      title: 'Candidature envoyée',
      subtitle: '',
      state: isEnvoyee ? 'validee' : 'en_attente',
      dateInfo: candidature?.dateSoumission || '',
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
      {/* 1. ONGLET HOME */}
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

      {/* 2. ONGLET PROGRESSION */}
      {activeTab === 'progression' && (
        <div className="py-6">
          <div className="desktop-container max-w-[820px] mx-auto px-4 flex flex-col gap-5">
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex flex-col gap-6">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h1 className="font-display font-bold text-base text-slate-900">
                  Progression de la candidature
                </h1>
                {isEnvoyee && (
                  <span className="inline-flex items-center gap-1.5 text-xs text-emerald-700 font-semibold bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Dossier transmis
                  </span>
                )}
              </div>

              {/* Frise chronologique horizontale */}
              <div className="py-6 px-2">
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

                        {step.dateInfo && (
                          <span className="text-[10px] text-slate-400 mt-1">
                            {step.dateInfo}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. ONGLET PROFIL : PROFIL ÉTUDIANT SÉRIEUX, PHOTO EN HAUT ET INFORMATIONS EN COLONNE */}
      {activeTab === 'profil' && (
        <div className="py-6">
          <div className="desktop-container max-w-[540px] mx-auto px-4 flex flex-col gap-5">
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex flex-col gap-6">
              {/* EN-TÊTE DU PROFIL AVEC PHOTO DE PROFIL CLIQUABLE */}
              <div className="flex flex-col items-center text-center gap-3 pb-5 border-b border-slate-100">
                <div className="relative group">
                  <label
                    htmlFor="avatar-upload"
                    className="w-20 h-20 rounded-full overflow-hidden bg-slate-100 border-2 border-slate-200 flex items-center justify-center cursor-pointer transition-all hover:border-blue-500 shadow-xs block relative"
                    title="Cliquer pour changer la photo de profil"
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
                    title="Ajouter une photo"
                  >
                    <Camera className="w-3.5 h-3.5" />
                  </label>
                </div>

                <div>
                  <h1 className="font-display font-bold text-base text-slate-900 leading-tight">
                    {profilePrenom} {profileNom}
                  </h1>
                  <span className="text-xs text-slate-500 font-medium">
                    {profileCne || 'Étudiant candidat'} · {profileEtablissement}
                  </span>
                </div>
              </div>

              {/* INFORMATIONS ESSENTIELLES EN FORME DE COLONNE UNIQUE */}
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

                  <div className="pt-4 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setIsEditingProfile(true)}
                      className="inline-flex items-center gap-1.5 btn-sm-secondary text-xs h-[34px] px-3.5"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Modifier le profil</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* FORMULAIRE D'ÉDITION EN FORME DE COLONNE */
                <form onSubmit={handleSaveProfile} className="flex flex-col gap-3.5 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Nom
                    </label>
                    <input
                      type="text"
                      value={profileNom}
                      onChange={(e) => setProfileNom(e.target.value)}
                      className="form-input text-xs h-[36px]"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Prénom
                    </label>
                    <input
                      type="text"
                      value={profilePrenom}
                      onChange={(e) => setProfilePrenom(e.target.value)}
                      className="form-input text-xs h-[36px]"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Téléphone
                    </label>
                    <input
                      type="text"
                      value={profileTelephone}
                      onChange={(e) => setProfileTelephone(e.target.value)}
                      className="form-input text-xs h-[36px]"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      CNE / Code Massar
                    </label>
                    <input
                      type="text"
                      value={profileCne}
                      onChange={(e) => setProfileCne(e.target.value)}
                      className="form-input text-xs h-[36px]"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Établissement d’origine
                    </label>
                    <input
                      type="text"
                      value={profileEtablissement}
                      onChange={(e) => setProfileEtablissement(e.target.value)}
                      className="form-input text-xs h-[36px]"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Diplôme d’accès
                    </label>
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
