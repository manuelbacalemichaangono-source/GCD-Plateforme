import React, { useState, useMemo, useEffect } from 'react';
import {
  BookOpen,
  Users,
  User as UserIcon,
  CheckCircle2,
  XCircle,
  FileText,
  Eye,
  LogOut,
  Edit2,
  Ban,
  AlertTriangle,
  X,
  FileCheck,
  Camera,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const DirecteurDashboard: React.FC = () => {
  const {
    directeurUser,
    sujetsList,
    toggleSujetActif,
    ecarterSujet,
    updateSujetDescription,
    candidaturesDirecteurList,
    deciderCandidatureDirecteur,
    updateDirecteurProfile,
    logout,
  } = useAuth();

  const [activeTab, setActiveTab] = useState<'sujets' | 'candidatures' | 'profil'>('sujets');

  // Sélection d'un candidat pour affichage de sa fiche
  const [selectedCandidatId, setSelectedCandidatId] = useState<string | null>(null);

  // Édition de la description d'un sujet
  const [editingSujetId, setEditingSujetId] = useState<string | null>(null);
  const [editedDescriptionText, setEditedDescriptionText] = useState('');

  // État modale de rejet avec motif obligatoire
  const [rejetModal, setRejetModal] = useState<{
    isOpen: boolean;
    candidatureId: string;
    motif: string;
    error: string | null;
  }>({
    isOpen: false,
    candidatureId: '',
    motif: '',
    error: null,
  });

  // Profil du directeur (identique au profil candidat, seules les données changent)
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileNom, setProfileNom] = useState(directeurUser?.nom || 'El Mansouri');
  const [profilePrenom, setProfilePrenom] = useState(directeurUser?.prenom || 'Karim');
  const [profileEmail, setProfileEmail] = useState(directeurUser?.email || 'k.elmansouri@usmba.ac.ma');
  const [profileTelephone, setProfileTelephone] = useState(
    directeurUser?.telephone || '+212 5 35 60 05 84'
  );
  const [profileGrade, setProfileGrade] = useState(
    directeurUser?.grade || "Professeur de l'Enseignement Supérieur (PES)"
  );
  const [profileEtablissement, setProfileEtablissement] = useState(
    directeurUser?.etablissement || 'EST Fès'
  );
  const [profileDepartement, setProfileDepartement] = useState(
    directeurUser?.departement || 'Génie Informatique'
  );
  const [profileAvatar, setProfileAvatar] = useState(directeurUser?.avatarUrl || '');

  useEffect(() => {
    if (directeurUser) {
      setProfileNom(directeurUser.nom);
      setProfilePrenom(directeurUser.prenom);
      setProfileEmail(directeurUser.email);
      if (directeurUser.telephone) setProfileTelephone(directeurUser.telephone);
      if (directeurUser.grade) setProfileGrade(directeurUser.grade);
      if (directeurUser.etablissement) setProfileEtablissement(directeurUser.etablissement);
      if (directeurUser.departement) setProfileDepartement(directeurUser.departement);
      if (directeurUser.avatarUrl !== undefined) setProfileAvatar(directeurUser.avatarUrl);
    }
  }, [directeurUser]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const url = reader.result as string;
        setProfileAvatar(url);
        updateDirecteurProfile({ avatarUrl: url });
      };
      reader.readAsDataURL(file);
    }
  };

  // Filtrer les sujets assignés à ce professeur
  const mesSujets = useMemo(() => {
    if (!directeurUser) return [];
    const dirNom = directeurUser.nomComplet.toLowerCase();
    const dirEmail = directeurUser.email.toLowerCase();
    return sujetsList.filter(
      (s) =>
        s.directeur.toLowerCase().includes(dirNom) ||
        s.directeurEmail.toLowerCase() === dirEmail
    );
  }, [sujetsList, directeurUser]);

  // Filtrer les candidatures reçues pour ses sujets
  const mesCandidatures = useMemo(() => {
    if (!directeurUser) return [];
    const mySubjectIds = new Set(mesSujets.map((s) => s.id));
    return candidaturesDirecteurList.filter(
      (c) =>
        mySubjectIds.has(c.sujetId) ||
        c.directeurNom.toLowerCase() === directeurUser.nomComplet.toLowerCase()
    );
  }, [candidaturesDirecteurList, mesSujets, directeurUser]);

  const selectedCandidature = useMemo(() => {
    return mesCandidatures.find((c) => c.id === selectedCandidatId) || null;
  }, [mesCandidatures, selectedCandidatId]);

  const handleStartEditDescription = (sujetId: string, currentDesc: string) => {
    setEditingSujetId(sujetId);
    setEditedDescriptionText(currentDesc);
  };

  const handleSaveDescription = (sujetId: string) => {
    if (editedDescriptionText.trim()) {
      updateSujetDescription(sujetId, editedDescriptionText);
    }
    setEditingSujetId(null);
    setEditedDescriptionText('');
  };

  const handleCancelEditDescription = () => {
    setEditingSujetId(null);
    setEditedDescriptionText('');
  };

  const handleRetenir = (candidatureId: string) => {
    deciderCandidatureDirecteur(candidatureId, 'Retenue');
  };

  const handleOpenRejetModal = (candidatureId: string) => {
    setRejetModal({
      isOpen: true,
      candidatureId,
      motif: '',
      error: null,
    });
  };

  const handleConfirmRejet = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejetModal.motif.trim()) {
      setRejetModal((prev) => ({
        ...prev,
        error: 'La saisie d’un motif de rejet est obligatoire.',
      }));
      return;
    }
    deciderCandidatureDirecteur(rejetModal.candidatureId, 'Rejetée', rejetModal.motif.trim());
    setRejetModal({
      isOpen: false,
      candidatureId: '',
      motif: '',
      error: null,
    });
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateDirecteurProfile({
      nom: profileNom,
      prenom: profilePrenom,
      email: profileEmail,
      telephone: profileTelephone,
      grade: profileGrade,
      etablissement: profileEtablissement,
      departement: profileDepartement,
      avatarUrl: profileAvatar,
    });
    setIsEditingProfile(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-slate-900 font-sans pb-20">
      {/* Header épuré sans nom de personne */}
      <header className="desktop-header">
        <div className="desktop-container flex items-center justify-between h-[64px] max-w-[1240px]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
              G
            </div>
            <span className="font-display font-bold text-slate-900 text-base tracking-tight">
              GCD Plateforme
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={logout}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-red-600 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Se déconnecter</span>
            </button>
          </div>
        </div>
      </header>

      {/* CONTENU PRINCIPAL SANS FOOTER */}
      <main className="flex-1 py-8">
        <div className="desktop-container max-w-[1240px]">
          {/* A. ONGLET MES SUJETS */}
          {activeTab === 'sujets' && (
            <div className="flex flex-col gap-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <h1 className="font-display font-bold text-base text-slate-900">
                  Mes sujets de thèse
                </h1>
                <span className="text-xs text-slate-500 font-medium">
                  Cycle doctoral actuel
                </span>
              </div>

              {mesSujets.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-xs text-slate-500">
                  Aucun sujet assigné pour ce cycle doctoral.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {mesSujets.map((sujet) => {
                    const isActif = sujet.actif !== false;
                    const isEcarte = sujet.ecarte === true;
                    const isEditing = editingSujetId === sujet.id;

                    return (
                      <div
                        key={sujet.id}
                        className={`bg-white border rounded-xl p-5 shadow-xs flex flex-col md:flex-row md:items-start justify-between gap-5 transition-all ${
                          isEcarte
                            ? 'border-slate-200 bg-slate-50/70 opacity-75'
                            : !isActif
                            ? 'border-amber-200 bg-amber-50/15'
                            : 'border-slate-200'
                        }`}
                      >
                        <div className="flex-1 min-w-0 flex flex-col gap-2">
                          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                            {sujet.discipline}
                          </span>

                          <h2 className="font-semibold text-slate-900 text-sm leading-snug">
                            {sujet.intitule}
                          </h2>

                          {isEditing ? (
                            <div className="flex flex-col gap-2 mt-1">
                              <label className="text-xs font-semibold text-slate-700">
                                Modifier la description :
                              </label>
                              <textarea
                                rows={4}
                                value={editedDescriptionText}
                                onChange={(e) => setEditedDescriptionText(e.target.value)}
                                className="form-textarea text-xs w-full"
                              />
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleSaveDescription(sujet.id)}
                                  className="btn-primary text-xs h-[32px] px-3.5"
                                >
                                  Enregistrer
                                </button>
                                <button
                                  type="button"
                                  onClick={handleCancelEditDescription}
                                  className="btn-secondary text-xs h-[32px] px-3"
                                >
                                  Annuler
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-col gap-1.5 mt-0.5">
                              <p className="text-xs text-slate-600 leading-relaxed">
                                {sujet.description}
                              </p>
                              {!isEcarte && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleStartEditDescription(sujet.id, sujet.description)
                                  }
                                  className="self-start inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-700 hover:underline pt-1"
                                >
                                  <Edit2 className="w-3 h-3" />
                                  <span>Modifier la description</span>
                                </button>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Actions : Activer / Désactiver et Écarter */}
                        <div className="flex items-center gap-2 shrink-0 md:self-start pt-1">
                          {!isEcarte ? (
                            <>
                              <button
                                type="button"
                                onClick={() => toggleSujetActif(sujet.id)}
                                className={`text-xs font-semibold h-[34px] px-3.5 rounded-lg border transition-colors ${
                                  isActif
                                    ? 'border-amber-200 text-amber-700 hover:bg-amber-50'
                                    : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                                }`}
                              >
                                {isActif ? 'Désactiver' : 'Activer'}
                              </button>

                              <button
                                type="button"
                                onClick={() => ecarterSujet(sujet.id)}
                                className="inline-flex items-center gap-1 text-xs font-semibold h-[34px] px-3.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
                              >
                                <Ban className="w-3.5 h-3.5" />
                                <span>Écarter</span>
                              </button>
                            </>
                          ) : (
                            <span className="text-xs text-slate-400 italic">
                              Sujet écarté
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* B. ONGLET CANDIDATURES REÇUES */}
          {activeTab === 'candidatures' && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <h1 className="font-display font-bold text-base text-slate-900">
                  Candidatures reçues ({mesCandidatures.length})
                </h1>
              </div>

              {mesCandidatures.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-xs text-slate-500">
                  Aucune candidature reçue pour le moment.
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {mesCandidatures.map((cand) => {
                    const isRetenue = cand.decisionDirecteur === 'Retenue';
                    const isRejetee = cand.decisionDirecteur === 'Rejetée';

                    return (
                      <div
                        key={cand.id}
                        className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex items-center justify-between gap-4 hover:border-slate-300 transition-colors"
                      >
                        {/* Informations strictes : Nom candidat, intitulé du sujet, date d'envoi */}
                        <div className="flex-1 min-w-0 flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-slate-900">
                              {cand.candidatPrenom} {cand.candidatNom}
                            </span>
                            {isRetenue ? (
                              <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                Retenue
                              </span>
                            ) : isRejetee ? (
                              <span className="text-[10px] font-semibold text-red-700 bg-red-50 px-2 py-0.5 rounded border border-red-200">
                                Rejetée
                              </span>
                            ) : null}
                          </div>

                          <div className="text-xs text-slate-700 truncate">
                            {cand.sujetIntitule}
                          </div>

                          <div className="text-[11px] text-slate-400">
                            Date d’envoi : {cand.dateDepot}
                          </div>
                        </div>

                        {/* Bouton juste à côté sur la même ligne */}
                        <button
                          type="button"
                          onClick={() => setSelectedCandidatId(cand.id)}
                          className="btn-secondary text-xs h-[34px] px-3.5 shrink-0 whitespace-nowrap"
                        >
                          Ouvrir la fiche
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* C. ONGLET MON PROFIL : IDENTIQUE AU PROFIL CANDIDAT, SEULES LES DONNÉES CHANGENT */}
          {activeTab === 'profil' && (
            <div className="py-6">
              <div className="desktop-container max-w-[820px] mx-auto px-4 flex flex-col gap-5">
                <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex flex-col gap-6">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <h1 className="font-display font-bold text-base text-slate-900">
                      Mon profil
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

                  {/* PHOTO DE PROFIL CLIQUABLE */}
                  <div className="flex flex-col items-center text-center gap-3 pb-3 border-b border-slate-100">
                    <div className="relative group">
                      <label
                        htmlFor="avatar-upload-directeur"
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
                        id="avatar-upload-directeur"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleAvatarChange}
                      />

                      <label
                        htmlFor="avatar-upload-directeur"
                        className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center cursor-pointer shadow-xs hover:bg-blue-700 transition-colors"
                        title="Ajouter une photo"
                      >
                        <Camera className="w-3.5 h-3.5" />
                      </label>
                    </div>

                    <div>
                      <h2 className="font-display font-bold text-base text-slate-900 leading-tight">
                        Pr. {profilePrenom} {profileNom}
                      </h2>
                      <span className="text-xs text-slate-500 font-medium">
                        {profileGrade} · {profileEtablissement}
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
                        <span className="text-slate-500 font-medium">Courriel institutionnel</span>
                        <span className="font-semibold text-slate-900">{profileEmail}</span>
                      </div>

                      <div className="py-2.5 flex items-center justify-between">
                        <span className="text-slate-500 font-medium">Téléphone</span>
                        <span className="font-semibold text-slate-900">{profileTelephone}</span>
                      </div>

                      <div className="py-2.5 flex items-center justify-between">
                        <span className="text-slate-500 font-medium">Grade / Titre</span>
                        <span className="font-semibold text-slate-900">{profileGrade}</span>
                      </div>

                      <div className="py-2.5 flex items-center justify-between">
                        <span className="text-slate-500 font-medium">Établissement</span>
                        <span className="font-semibold text-slate-900">{profileEtablissement}</span>
                      </div>

                      <div className="py-2.5 flex items-center justify-between">
                        <span className="text-slate-500 font-medium">Département</span>
                        <span className="font-semibold text-slate-900">{profileDepartement}</span>
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
                          Courriel institutionnel
                        </label>
                        <input
                          type="email"
                          value={profileEmail}
                          onChange={(e) => setProfileEmail(e.target.value)}
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
                          Grade / Titre
                        </label>
                        <input
                          type="text"
                          value={profileGrade}
                          onChange={(e) => setProfileGrade(e.target.value)}
                          className="form-input text-xs h-[36px]"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">
                          Établissement
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
                          Département
                        </label>
                        <input
                          type="text"
                          value={profileDepartement}
                          onChange={(e) => setProfileDepartement(e.target.value)}
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
        </div>
      </main>

      {/* MODALE FICHE CANDIDAT DÉTAILLÉE (OUVERTE VIA « OUVRIR LA FICHE ») */}
      {selectedCandidature && (
        <div
          className="modal-overlay"
          onClick={() => setSelectedCandidatId(null)}
        >
          <div
            className="modal-content max-w-2xl p-6 bg-white border border-slate-200 rounded-xl shadow-lg flex flex-col gap-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div>
                <h2 className="font-display font-bold text-base text-slate-900">
                  {selectedCandidature.candidatPrenom} {selectedCandidature.candidatNom}
                </h2>
                <span className="text-xs text-slate-500">
                  {selectedCandidature.cne} · {selectedCandidature.candidatEmail} · {selectedCandidature.candidatTelephone}
                </span>
              </div>

              <button
                type="button"
                onClick={() => setSelectedCandidatId(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Parcours académique du candidat */}
            <div className="flex flex-col gap-1.5 p-3.5 bg-slate-50 rounded-lg text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Établissement d’origine</span>
                <span className="font-semibold text-slate-800">
                  {selectedCandidature.etablissementOrigine}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Diplôme d’accès</span>
                <span className="font-semibold text-slate-800">
                  {selectedCandidature.diplomeObtenu}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Sujet postulé</span>
                <span className="font-semibold text-slate-800 truncate max-w-md">
                  {selectedCandidature.sujetIntitule}
                </span>
              </div>
            </div>

            {/* Documents téléversés */}
            <div className="flex flex-col gap-2">
              <span className="font-bold text-xs text-slate-800">
                Pièces justificatives du dossier
              </span>

              <div className="flex flex-col divide-y divide-slate-100 border border-slate-100 rounded-lg overflow-hidden">
                {Object.entries(selectedCandidature.pieces).map(([key, piece]) => (
                  <div
                    key={key}
                    className="p-3 flex items-center justify-between text-xs bg-white"
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-blue-600" />
                      <span className="font-medium text-slate-800">{piece.fileName}</span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 uppercase">
                        {piece.type}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => alert(`Consultation du document : ${piece.fileName}`)}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:underline"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Consulter</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Motif de rejet affiché si déjà rejetée */}
            {selectedCandidature.decisionDirecteur === 'Rejetée' && selectedCandidature.motifRejet && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800">
                <span className="font-bold block mb-0.5">Motif du rejet :</span>
                <span>{selectedCandidature.motifRejet}</span>
              </div>
            )}

            {/* Actions de décision : Retenir ou Rejeter */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => handleOpenRejetModal(selectedCandidature.id)}
                className="inline-flex items-center gap-1.5 px-4 h-[36px] rounded-lg border border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold transition-colors"
              >
                <XCircle className="w-4 h-4" />
                <span>Rejeter la candidature</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  handleRetenir(selectedCandidature.id);
                  setSelectedCandidatId(null);
                }}
                className="inline-flex items-center gap-1.5 px-4 h-[36px] rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors shadow-xs"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Retenir pour l’entretien</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODALE DE REJET AVEC MOTIF OBLIGATOIRE */}
      {rejetModal.isOpen && (
        <div
          className="modal-overlay"
          onClick={() => setRejetModal((prev) => ({ ...prev, isOpen: false }))}
        >
          <div
            className="modal-content max-w-md p-6 bg-white border border-slate-200 rounded-xl shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="font-display font-bold text-sm text-slate-900 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                <span>Motif du rejet (obligatoire)</span>
              </h2>
              <button
                type="button"
                onClick={() => setRejetModal((prev) => ({ ...prev, isOpen: false }))}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {rejetModal.error && (
              <div className="mt-3 p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
                {rejetModal.error}
              </div>
            )}

            <form onSubmit={handleConfirmRejet} className="mt-4 flex flex-col gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Veuillez préciser la raison du rejet pour l’informer de la décision
                </label>
                <textarea
                  rows={3}
                  value={rejetModal.motif}
                  onChange={(e) =>
                    setRejetModal((prev) => ({
                      ...prev,
                      motif: e.target.value,
                      error: null,
                    }))
                  }
                  placeholder="Ex : Prérequis scientifiques insuffisants en méthodes formelles et cloud."
                  className="form-textarea text-xs w-full"
                  required
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setRejetModal((prev) => ({ ...prev, isOpen: false }))}
                  className="btn-secondary text-xs h-[34px] px-3"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="btn-primary text-xs h-[34px] px-3.5 bg-red-600 border-red-600 hover:bg-red-700"
                >
                  Confirmer le rejet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PESTANAS DE NAVEGACIÓN EN LA PARTE INFERIOR (Exactamente abajo de la app) */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 shadow-md h-[54px] flex items-center justify-center">
        <div className="desktop-container flex items-center justify-around max-w-md w-full">
          <button
            type="button"
            onClick={() => setActiveTab('sujets')}
            className={`flex flex-col items-center gap-1 text-xs font-semibold transition-colors ${
              activeTab === 'sujets' ? 'text-blue-600' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <BookOpen className="w-5 h-5" />
            <span>Mes sujets</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('candidatures')}
            className={`flex flex-col items-center gap-1 text-xs font-semibold transition-colors ${
              activeTab === 'candidatures' ? 'text-blue-600' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Users className="w-5 h-5" />
            <span>Candidatures</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('profil')}
            className={`flex flex-col items-center gap-1 text-xs font-semibold transition-colors ${
              activeTab === 'profil' ? 'text-blue-600' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <UserIcon className="w-5 h-5" />
            <span>Mon profil</span>
          </button>
        </div>
      </nav>
    </div>
  );
};

export default DirecteurDashboard;
