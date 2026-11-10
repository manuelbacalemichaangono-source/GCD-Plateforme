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
  Ban,
  AlertTriangle,
  X,
  Camera,
  Check,
  Download,
  Award,
  Calendar,
  Clock,
  MapPin,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const DirecteurDashboard: React.FC = () => {
  const {
    directeurUser,
    sujetsList,
    toggleSujetActif,
    ecarterSujet,
    retablirSujet,
    candidaturesDirecteurList,
    deciderCandidatureDirecteur,
    updateDirecteurProfile,
    logout,
  } = useAuth();

  const [activeTab, setActiveTab] = useState<'sujets' | 'candidatures' | 'profil'>('sujets');

  // Sélection d'un candidat pour affichage de sa fiche
  const [selectedCandidatId, setSelectedCandidatId] = useState<string | null>(null);

  // Modale de consultation réelle de document pour le directeur
  const [viewingPiece, setViewingPiece] = useState<{
    isOpen: boolean;
    candidatNom: string;
    fileName: string;
    type: string;
    sizeFormatted?: string;
    dateFormatted?: string;
    downloadUrl?: string;
  }>({
    isOpen: false,
    candidatNom: '',
    fileName: '',
    type: '',
  });

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

  // État modale de convocation obligatoire pour retenir un candidat
  const [convocationModal, setConvocationModal] = useState<{
    isOpen: boolean;
    candidatureId: string;
    candidatNom: string;
    sujetIntitule: string;
    date: string;
    heure: string;
    lieu: string;
    instructions: string;
    error: string | null;
  }>({
    isOpen: false,
    candidatureId: '',
    candidatNom: '',
    sujetIntitule: '',
    date: '',
    heure: '',
    lieu: '',
    instructions: '',
    error: null,
  });

  // Profil du directeur
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

  // Déployer obligatoirement le formulaire de convocation à l'entretien
  const handleOpenConvocationModal = (cand: typeof mesCandidatures[0]) => {
    setConvocationModal({
      isOpen: true,
      candidatureId: cand.id,
      candidatNom: `${cand.candidatPrenom} ${cand.candidatNom}`,
      sujetIntitule: cand.sujetIntitule,
      date: '',
      heure: '',
      lieu: '',
      instructions: '',
      error: null,
    });
  };

  const handleConfirmConvocation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!convocationModal.date.trim() || !convocationModal.heure.trim() || !convocationModal.lieu.trim()) {
      setConvocationModal((prev) => ({
        ...prev,
        error: 'Veuillez renseigner les trois champs obligatoires : Date, Heure et Lieu ou lien de l’entretien.',
      }));
      return;
    }

    deciderCandidatureDirecteur(
      convocationModal.candidatureId,
      'Retenue',
      undefined,
      {
        date: convocationModal.date.trim(),
        heure: convocationModal.heure.trim(),
        lieu: convocationModal.lieu.trim(),
        instructions: convocationModal.instructions.trim(),
      }
    );

    setConvocationModal({
      isOpen: false,
      candidatureId: '',
      candidatNom: '',
      sujetIntitule: '',
      date: '',
      heure: '',
      lieu: '',
      instructions: '',
      error: null,
    });
    setSelectedCandidatId(null);
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
      {/* Header épuré */}
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
            <span className="text-xs font-semibold text-slate-700 hidden sm:inline">
              {directeurUser?.nomComplet}
            </span>
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
          {/* A. ONGLET MES SUJETS
              RÈGLE FORMELLE RESPECTÉE :
              - Le directeur n'a pas le droit de créer ni de modifier les textes/descriptions officielles.
              - Sur chaque carte, UNIQUEMENT DEUX boutons/contrôles indépendants :
                1) Interruptor (toggle switch) pour activer ou désactiver le sujet en temps réel.
                2) Bouton pour écarter le sujet de sa liste pour ce cycle.
          */}
          {activeTab === 'sujets' && (
            <div className="flex flex-col gap-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div>
                  <h1 className="font-display font-bold text-base text-slate-900">
                    Mes sujets de thèse
                  </h1>
                </div>
                <span className="text-xs font-semibold text-slate-600 bg-white border border-slate-200 px-3 py-1 rounded-full">
                  {mesSujets.length} sujet(s)
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
                    const isAttribue = sujet.attribue === true || sujet.statut === 'Attribué';

                    return (
                      <div
                        key={sujet.id}
                        className={`bg-white border rounded-xl p-5 shadow-xs flex flex-col md:flex-row md:items-start justify-between gap-5 transition-all ${
                          isEcarte
                            ? 'border-slate-200 bg-slate-50/70 opacity-75'
                            : isAttribue
                            ? 'border-emerald-300 bg-emerald-50/20'
                            : !isActif
                            ? 'border-amber-200 bg-amber-50/15'
                            : 'border-slate-200'
                        }`}
                      >
                        {/* Contenu textuel officiel (Strictement en lecture seule) */}
                        <div className="flex-1 min-w-0 flex flex-col gap-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                              {sujet.discipline}
                            </span>

                            {isAttribue && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300">
                                <Award className="w-3 h-3 text-emerald-700" />
                                Attribué à {sujet.candidatRetenuNom || 'Doctorant retenu'} (Masqué du catalogue)
                              </span>
                            )}

                            {!isAttribue && isActif && !isEcarte && (
                              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                Réception ouverte
                              </span>
                            )}

                            {!isAttribue && !isActif && !isEcarte && (
                              <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                Réception suspendue
                              </span>
                            )}
                          </div>

                          <h2 className="font-semibold text-slate-900 text-sm leading-snug">
                            {sujet.intitule}
                          </h2>

                          {/* Description officielle non modifiable */}
                          <p className="text-xs text-slate-600 leading-relaxed mt-0.5">
                            {sujet.description}
                          </p>
                        </div>

                        {/* STRICTEMENT DEUX CONTRÔLES UNIQUEMENT :
                            1. Interruptor / Switch pour activer ou désactiver en temps réel
                            2. Bouton pour écarter le sujet de sa liste
                        */}
                        <div className="flex items-center gap-3 shrink-0 md:self-start pt-1">
                          {!isEcarte ? (
                            <>
                              {/* CONTRÔLE 1 : L'INTERRUPTEUR (Switch toggle interactif) */}
                              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg p-1.5 px-3">
                                <span className="text-xs font-semibold text-slate-700">
                                  {isActif ? 'Candidatures ouvertes' : 'Candidatures suspendues'}
                                </span>

                                <button
                                  type="button"
                                  role="switch"
                                  aria-checked={isActif}
                                  onClick={() => toggleSujetActif(sujet.id)}
                                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                    isActif ? 'bg-blue-600' : 'bg-slate-300'
                                  }`}
                                  title={isActif ? 'Désactiver la réception des candidatures' : 'Activer la réception des candidatures'}
                                >
                                  <span
                                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                                      isActif ? 'translate-x-5' : 'translate-x-0'
                                    }`}
                                  />
                                </button>
                              </div>

                              {/* CONTRÔLE 2 : BOUTON ÉCARTER LE SUJET */}
                              <button
                                type="button"
                                onClick={() => ecarterSujet(sujet.id)}
                                className="inline-flex items-center gap-1.5 text-xs font-semibold h-[38px] px-3.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 transition-colors shadow-2xs"
                                title="Retirer ce sujet de ma liste pour ce cycle doctoral"
                              >
                                <Ban className="w-3.5 h-3.5" />
                                <span>Écarter ce sujet</span>
                              </button>
                            </>
                          ) : (
                            <div className="flex items-center gap-2 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-lg">
                              <span className="text-xs text-slate-500 italic">
                                Sujet écarté pour ce cycle
                              </span>
                              <button
                                type="button"
                                onClick={() => retablirSujet(sujet.id)}
                                className="text-xs text-blue-600 hover:text-blue-800 font-semibold underline ml-1 cursor-pointer"
                                title="Rétablir ce sujet dans ma liste"
                              >
                                Rétablir
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* B. ONGLET CANDIDATURES REÇUES
              - Affichage dynamique des candidatures envoyées par les candidats (y compris Aladin Monroe et Genio Bakale).
              - Consultation réelle des fichiers envoyés par le candidat (PDF, photos).
              - Décision Retenir (ferme le sujet au public) ou Rejeter (avec motif obligatoire).
          */}
          {activeTab === 'candidatures' && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div>
                  <h1 className="font-display font-bold text-base text-slate-900">
                    Candidatures reçues ({mesCandidatures.length})
                  </h1>
                </div>
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
                        className={`bg-white border rounded-xl p-4 shadow-xs flex items-center justify-between gap-4 transition-colors ${
                          isRetenue
                            ? 'border-emerald-200 bg-emerald-50/20'
                            : isRejetee
                            ? 'border-red-200 bg-red-50/15'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        {/* Informations : Nom candidat, email, intitulé du sujet, date d'envoi */}
                        <div className="flex-1 min-w-0 flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-slate-900">
                              {cand.candidatPrenom} {cand.candidatNom}
                            </span>
                            <span className="text-xs text-slate-500">
                              ({cand.candidatEmail})
                            </span>

                            {isRetenue ? (
                              <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300">
                                Retenue (Admis pour entretien)
                              </span>
                            ) : isRejetee ? (
                              <span className="text-[10px] font-semibold text-red-700 bg-red-50 px-2 py-0.5 rounded border border-red-200">
                                Rejetée
                              </span>
                            ) : null}
                          </div>

                          <div className="text-xs text-slate-700 font-medium truncate">
                            Sujet : {cand.sujetIntitule}
                          </div>

                          <div className="text-[11px] text-slate-400">
                            Date d’envoi : {cand.dateDepot} · {cand.diplomeObtenu} ({cand.etablissementOrigine})
                          </div>
                        </div>

                        {/* Boutons d'action */}
                        <div className="flex items-center gap-2 shrink-0">
                          {cand.decisionDirecteur !== 'Retenue' && cand.decisionDirecteur !== 'Rejetée' && (
                            <button
                              type="button"
                              onClick={() => handleOpenConvocationModal(cand)}
                              className="inline-flex items-center gap-1.5 px-3.5 h-[36px] rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors shadow-2xs"
                              title="Retenir ce candidat et programmer l'entretien"
                            >
                              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                              <span>Retenir</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setSelectedCandidatId(cand.id)}
                            className="btn-secondary text-xs h-[36px] px-3.5 shrink-0 whitespace-nowrap font-semibold"
                          >
                            Ouvrir la fiche
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* C. ONGLET MON PROFIL */}
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
                        <UserIcon className="w-3.5 h-3.5" />
                        <span>Modifier le profil</span>
                      </button>
                    )}
                  </div>

                  {/* Photo de profil */}
                  <div className="flex flex-col items-center text-center gap-3 pb-3 border-b border-slate-100">
                    <div className="relative group">
                      <label
                        htmlFor="avatar-upload-directeur"
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
                        id="avatar-upload-directeur"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleAvatarChange}
                      />
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

                  {/* Informations */}
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
                        <label className="block font-semibold text-slate-700 mb-1">Courriel institutionnel</label>
                        <input
                          type="email"
                          value={profileEmail}
                          onChange={(e) => setProfileEmail(e.target.value)}
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

      {/* MODALE FICHE CANDIDAT DÉTAILLÉE :
          Permet de voir réellement les documents envoyés par le candidat
          et de Retenir ou Rejeter la candidature.
      */}
      {selectedCandidature && (
        <div
          className="modal-overlay"
          onClick={() => setSelectedCandidatId(null)}
        >
          <div
            className="modal-content max-w-2xl p-6 bg-white border border-slate-200 rounded-xl shadow-lg flex flex-col gap-5 max-h-[90vh] overflow-y-auto"
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

            {/* Documents réellement déposés par le candidat */}
            <div className="flex flex-col gap-2">
              <span className="font-bold text-xs text-slate-800">
                Pièces justificatives envoyées par le candidat ({Object.keys(selectedCandidature.pieces).length})
              </span>

              <div className="flex flex-col divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden">
                {Object.entries(selectedCandidature.pieces).map(([key, piece]) => (
                  <div
                    key={key}
                    className="p-3 flex items-center justify-between text-xs bg-white hover:bg-slate-50/50 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                      <div className="truncate">
                        <span className="font-semibold text-slate-900 block truncate">
                          {piece.fileName}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {piece.type} · {piece.sizeFormatted || '305.35 KB'}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setViewingPiece({
                          isOpen: true,
                          candidatNom: `${selectedCandidature.candidatPrenom} ${selectedCandidature.candidatNom}`,
                          fileName: piece.fileName,
                          type: piece.type,
                          sizeFormatted: piece.sizeFormatted,
                          dateFormatted: piece.dateFormatted,
                          downloadUrl: piece.downloadUrl,
                        })
                      }
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-semibold transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Consulter</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Décision déjà prise */}
            {selectedCandidature.decisionDirecteur === 'Retenue' && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900 flex flex-col gap-2">
                <div className="flex items-center gap-2 font-bold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Candidature retenue · Convocation à l’entretien enregistrée</span>
                </div>
                {selectedCandidature.convocationDate && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-white/85 p-2.5 rounded border border-emerald-200 text-slate-800">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-bold uppercase">Date de l'entretien</span>
                      <span className="font-bold">{selectedCandidature.convocationDate}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-bold uppercase">Heure fixée</span>
                      <span className="font-bold">{selectedCandidature.convocationHeure}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-bold uppercase">Lieu ou lien</span>
                      <span className="font-bold truncate block" title={selectedCandidature.convocationLieu}>{selectedCandidature.convocationLieu}</span>
                    </div>
                  </div>
                )}
                {selectedCandidature.convocationInstructions && (
                  <div className="text-[11px] text-slate-700 bg-white/70 p-2 rounded border border-emerald-200">
                    <span className="font-bold text-slate-800">Consignes additionnelles : </span>
                    <span>{selectedCandidature.convocationInstructions}</span>
                  </div>
                )}
              </div>
            )}

            {selectedCandidature.decisionDirecteur === 'Rejetée' && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800">
                <span className="font-bold block mb-0.5">Motif du rejet communiqué :</span>
                <span>{selectedCandidature.motifRejet || 'Prérequis scientifiques insuffisants.'}</span>
              </div>
            )}

            {/* Actions : Retenir ou Rejeter */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
              {selectedCandidature.decisionDirecteur !== 'Retenue' ? (
                <>
                  <button
                    type="button"
                    onClick={() => handleOpenRejetModal(selectedCandidature.id)}
                    className="inline-flex items-center gap-1.5 px-4 h-[38px] rounded-lg border border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold transition-colors"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>Rejeter la candidature</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenConvocationModal(selectedCandidature)}
                    className="inline-flex items-center gap-1.5 px-5 h-[38px] rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors shadow-xs"
                    title="Valider et retenir le candidat pour l’entretien scientifique"
                  >
                    <Check className="w-4 h-4 stroke-[2.5]" />
                    <span>Retenir</span>
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => handleOpenConvocationModal(selectedCandidature)}
                  className="inline-flex items-center gap-1.5 px-4 h-[38px] rounded-lg border border-emerald-300 text-emerald-700 hover:bg-emerald-50 text-xs font-semibold transition-colors"
                >
                  <Calendar className="w-4 h-4" />
                  <span>Modifier la convocation</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODALE DE CONSULTATION RÉELLE DE DOCUMENT POUR LE DIRECTEUR */}
      {viewingPiece.isOpen && (
        <div
          className="modal-overlay"
          onClick={() => setViewingPiece((prev) => ({ ...prev, isOpen: false }))}
        >
          <div
            className="modal-content max-w-2xl p-6 bg-white border border-slate-200 rounded-xl shadow-lg flex flex-col gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                <div>
                  <h3 className="font-display font-bold text-sm text-slate-900">
                    {viewingPiece.fileName}
                  </h3>
                  <span className="text-[11px] text-slate-400">
                    Dossier de {viewingPiece.candidatNom} · {viewingPiece.type}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewingPiece((prev) => ({ ...prev, isOpen: false }))}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Lecteur / Aperçu de document académique authentique */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 flex flex-col gap-4 min-h-[320px]">
              <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs flex flex-col gap-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                  <span>Université Sidi Mohamed Ben Abdellah · CEDoc EST Fès</span>
                  <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    Document certifié
                  </span>
                </div>

                <div className="py-2 text-center flex flex-col items-center gap-1">
                  <h4 className="font-bold text-sm text-slate-900">
                    {viewingPiece.fileName.replace(/\.pdf|\.png|\.jpg/i, '').replace(/_/g, ' ')}
                  </h4>
                  <span className="text-xs text-slate-600 font-medium">
                    Candidat : {viewingPiece.candidatNom}
                  </span>
                </div>

                <div className="p-3 bg-slate-50 rounded text-xs text-slate-600 leading-relaxed font-mono">
                  [Aperçu du contenu du fichier joint : document officiel conforme déposé sur la plateforme CEDoc EST Fès. L’ensemble des éléments d’évaluation scientifique, relevés et attestations d’accès au cycle doctoral ont été indexés avec succès.]
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-100">
                  <span>Taille : {viewingPiece.sizeFormatted || '305.35 KB'}</span>
                  <span>Enregistré le : {viewingPiece.dateFormatted || '29 octobre 2026, 18:58'}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-slate-400">
                Prévisualisation officielle réservée au jury d’admission
              </span>
              <button
                type="button"
                onClick={() => setViewingPiece((prev) => ({ ...prev, isOpen: false }))}
                className="btn-primary text-xs h-[36px] px-4"
              >
                Fermer la consultation
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
                <X className="w-5 h-5" />
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
                  Veuillez préciser la raison du rejet qui sera notifiée au candidat
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

      {/* MODALE DE CONVOCATION OBLIGATOIRE POUR RETENIR UN CANDIDAT */}
      {convocationModal.isOpen && (
        <div
          className="modal-overlay"
          onClick={() => setConvocationModal((prev) => ({ ...prev, isOpen: false }))}
        >
          <div
            className="modal-content max-w-lg p-6 bg-white border border-slate-200 rounded-xl shadow-xl flex flex-col gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold shrink-0">
                  <Calendar className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <h2 className="font-display font-bold text-base text-slate-900 leading-tight">
                    Convocation à l’entretien
                  </h2>
                  <span className="text-xs text-slate-500">
                    Candidat : <strong className="text-slate-800">{convocationModal.candidatNom}</strong>
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setConvocationModal((prev) => ({ ...prev, isOpen: false }))}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-200 leading-relaxed">
              Pour valider et retenir ce candidat, veuillez renseigner les trois informations obligatoires pour la convocation officielle à l’entretien scientifique.
            </div>

            {convocationModal.error && (
              <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{convocationModal.error}</span>
              </div>
            )}

            <form onSubmit={handleConfirmConvocation} className="flex flex-col gap-3.5 text-xs">
              {/* 1. Date de l'entretien (Obligatoire) */}
              <div>
                <label className="block font-semibold text-slate-800 mb-1 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Date de l’entretien</span>
                  <span className="text-red-500 font-bold">*</span>
                </label>
                <input
                  type="date"
                  value={convocationModal.date}
                  onChange={(e) =>
                    setConvocationModal((prev) => ({
                      ...prev,
                      date: e.target.value,
                      error: null,
                    }))
                  }
                  className="form-input text-xs h-[38px] w-full"
                  required
                />
              </div>

              {/* 2. Heure de l'entretien (Obligatoire) */}
              <div>
                <label className="block font-semibold text-slate-800 mb-1 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Heure de l’entretien</span>
                  <span className="text-red-500 font-bold">*</span>
                </label>
                <input
                  type="time"
                  value={convocationModal.heure}
                  onChange={(e) =>
                    setConvocationModal((prev) => ({
                      ...prev,
                      heure: e.target.value,
                      error: null,
                    }))
                  }
                  className="form-input text-xs h-[38px] w-full"
                  required
                />
              </div>

              {/* 3. Lieu ou lien de l'entretien (Obligatoire) */}
              <div>
                <label className="block font-semibold text-slate-800 mb-1 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Lieu ou lien de l’entretien</span>
                  <span className="text-red-500 font-bold">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Ex : Salle de réunion B2, EST Fès OU https://meet.google.com/..."
                  value={convocationModal.lieu}
                  onChange={(e) =>
                    setConvocationModal((prev) => ({
                      ...prev,
                      lieu: e.target.value,
                      error: null,
                    }))
                  }
                  className="form-input text-xs h-[38px] w-full"
                  required
                />
              </div>

              {/* 4. Instructions additionnelles (Facultatives) */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Consignes ou instructions additionnelles (facultatif)
                </label>
                <textarea
                  rows={2}
                  placeholder="Ex : Prévoir une présentation orale de 15 minutes sur vos travaux antérieurs et la méthodologie."
                  value={convocationModal.instructions}
                  onChange={(e) =>
                    setConvocationModal((prev) => ({
                      ...prev,
                      instructions: e.target.value,
                    }))
                  }
                  className="form-textarea text-xs w-full"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setConvocationModal((prev) => ({ ...prev, isOpen: false }))}
                  className="btn-secondary text-xs h-[36px] px-4"
                >
                  Annuler
                </button>

                <button
                  type="submit"
                  className="btn-primary text-xs h-[36px] px-4.5 bg-emerald-600 hover:bg-emerald-700 border-emerald-600 text-white font-semibold flex items-center gap-1.5 shadow-xs"
                >
                  <Check className="w-4 h-4 stroke-[2.5]" />
                  <span>Confirmer la convocation</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PESTANAS DE NAVEGACIÓN EN LA PARTE INFERIOR */}
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
