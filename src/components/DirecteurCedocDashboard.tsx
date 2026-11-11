import React, { useState, useMemo } from 'react';
import {
  LayoutDashboard,
  FolderKanban,
  User as UserIcon,
  LogOut,
  CheckCircle2,
  FileText,
  Eye,
  Plus,
  Search,
  Award,
  Check,
  X,
  Camera,
  Calendar,
  Clock,
  MapPin,
  Shield,
  FileCheck2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { CandidaturePourDirecteur, SujetRecord } from '../types/cedoc';

const DEPARTEMENTS_DISCIPLINAIRES = [
  'Tous les départements',
  'Génie logiciel',
  'Ingénierie des données',
  'Réseaux et sécurité',
  'Gestion des ressources humaines',
  'Management',
  'Génie logistique',
  'Génie mécanique',
  'Génie industriel',
  'Bio-alimentaire',
];

export const DirecteurCedocDashboard: React.FC = () => {
  const {
    directeurCedocUser,
    updateDirecteurCedocProfile,
    sujetsList,
    toggleSujetActif,
    creerSujetCedoc,
    candidaturesDirecteurList,
    validerPropositionAdmission,
    publierListeOfficielleAdmis,
    isListeOfficiellePubliee,
    logsCedoc,
    logout,
  } = useAuth();

  const [activeTab, setActiveTab] = useState<'tableau' | 'gestion' | 'profil'>('tableau');

  // Modal d'inspection complète du dossier et de l'acta d'évaluation signée
  const [inspectModal, setInspectModal] = useState<{
    isOpen: boolean;
    candidature: CandidaturePourDirecteur | null;
  }>({
    isOpen: false,
    candidature: null,
  });

  // Modal de consultation d'une pièce jointe du candidat
  const [viewingPiece, setViewingPiece] = useState<{
    isOpen: boolean;
    candidatNom: string;
    fileName: string;
    type: string;
  }>({
    isOpen: false,
    candidatNom: '',
    fileName: '',
    type: '',
  });

  // Modal d'ajout d'un nouveau sujet de thèse
  const [newSujetModal, setNewSujetModal] = useState({
    isOpen: false,
    intitule: '',
    discipline: 'Génie logiciel',
    directeur: 'Pr. Karim El Mansouri',
    directeurEmail: 'k.elmansouri@usmba.ac.ma',
    description: '',
  });

  // Filtres dans l'onglet Gestion Global
  const [selectedDepartement, setSelectedDepartement] = useState('Tous les départements');
  const [searchSujet, setSearchSujet] = useState('');

  // Profil du Directeur du CEDoc
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileNom, setProfileNom] = useState(directeurCedocUser?.nom || 'Bennani');
  const [profilePrenom, setProfilePrenom] = useState(directeurCedocUser?.prenom || 'Mohammed Amine');
  const [profileEmail, setProfileEmail] = useState(
    directeurCedocUser?.email || 'directeur.cedoc@usmba.ac.ma'
  );
  const [profileTelephone, setProfileTelephone] = useState(
    directeurCedocUser?.telephone || '+212 5 35 60 05 80'
  );
  const [profileTitre, setProfileTitre] = useState(
    directeurCedocUser?.titre || 'Directeur du Centre d’Études Doctorales (CEDoc)'
  );
  const [profileEtablissement, setProfileEtablissement] = useState(
    directeurCedocUser?.etablissement || 'EST Fès - Université Sidi Mohamed Ben Abdellah'
  );
  const [profileAvatar, setProfileAvatar] = useState(directeurCedocUser?.avatarUrl || '');

  // Métriques clés
  const totalCandidatures = candidaturesDirecteurList.length;
  const totalConvoques = candidaturesDirecteurList.filter(
    (c) => c.decisionDirecteur === 'Retenue' || c.decisionDirecteur === 'Admis'
  ).length;
  const totalAdmis = candidaturesDirecteurList.filter(
    (c) => c.decisionDirecteur === 'Admis'
  ).length;

  // Candidats retenus par les jurys (prêts pour validation finale)
  const candidatsPourValidation = useMemo(() => {
    return candidaturesDirecteurList.filter(
      (c) => c.decisionDirecteur === 'Retenue' || c.decisionDirecteur === 'Admis'
    );
  }, [candidaturesDirecteurList]);

  // Sujets filtrés pour la Gestion Global
  const sujetsFiltres = useMemo(() => {
    return sujetsList.filter((s) => {
      if (
        selectedDepartement !== 'Tous les départements' &&
        s.discipline !== selectedDepartement
      ) {
        return false;
      }
      if (searchSujet.trim()) {
        const q = searchSujet.toLowerCase();
        if (!s.intitule.toLowerCase().includes(q) && !s.directeur.toLowerCase().includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [sujetsList, selectedDepartement, searchSujet]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const url = reader.result as string;
        setProfileAvatar(url);
        updateDirecteurCedocProfile({ avatarUrl: url });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateDirecteurCedocProfile({
      nom: profileNom,
      prenom: profilePrenom,
      email: profileEmail,
      telephone: profileTelephone,
      titre: profileTitre,
      etablissement: profileEtablissement,
      avatarUrl: profileAvatar,
    });
    setIsEditingProfile(false);
  };

  const handleCreateSujet = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSujetModal.intitule.trim() || !newSujetModal.description.trim()) return;
    creerSujetCedoc({
      intitule: newSujetModal.intitule.trim(),
      discipline: newSujetModal.discipline,
      directeur: newSujetModal.directeur,
      directeurEmail: newSujetModal.directeurEmail,
      laboratoire: 'CEDoc EST Fès',
      description: newSujetModal.description.trim(),
      actif: true,
      attribue: false,
      ecarte: false,
    });
    setNewSujetModal({
      isOpen: false,
      intitule: '',
      discipline: 'Génie logiciel',
      directeur: 'Pr. Karim El Mansouri',
      directeurEmail: 'k.elmansouri@usmba.ac.ma',
      description: '',
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-slate-900 font-sans pb-20">
      {/* Header épuré sans navigation */}
      <header className="desktop-header">
        <div className="desktop-container flex items-center justify-between h-[64px] max-w-[1240px]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
              G
            </div>
            <span className="font-display font-bold text-slate-900 text-sm sm:text-base leading-tight">
              Directeur du CEDoc
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-slate-700 hidden sm:inline">
              {directeurCedocUser?.nomComplet || 'Pr. Mohammed Amine Bennani'}
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
      <main className="flex-1 py-6">
        <div className="desktop-container max-w-[1240px] flex flex-col gap-6">
          {/* =========================================================
              ONGLET 1 : TABLEAU DE BORD (MÉTRIQUES & VALIDATION FINALE)
              ========================================================= */}
          {activeTab === 'tableau' && (
            <div className="flex flex-col gap-6">
              {/* Cartes résumé avec métriques clés du processus doctoral */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col gap-2">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Total des candidatures
                  </span>
                  <span className="font-display font-bold text-2xl text-slate-900">
                    {totalCandidatures}
                  </span>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col gap-2">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Candidats convoqués à entretien
                  </span>
                  <span className="font-display font-bold text-2xl text-blue-600">
                    {totalConvoques}
                  </span>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col gap-2">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Candidats admis définitivement
                  </span>
                  <span className="font-display font-bold text-2xl text-emerald-600">
                    {totalAdmis}
                  </span>
                </div>
              </div>

              {/* SECTION DE VALIDATION FINALE */}
              <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex flex-col gap-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <h2 className="font-display font-bold text-base text-slate-900">
                    Validation Finale · Candidats évalués par les jurys
                  </h2>

                  {/* Bouton d'action institutionnelle : Publier la liste officielle */}
                  <button
                    type="button"
                    onClick={publierListeOfficielleAdmis}
                    disabled={candidatsPourValidation.length === 0}
                    className="btn-primary text-xs h-[38px] px-4 self-start sm:self-auto flex items-center gap-1.5 shadow-xs"
                  >
                    <Award className="w-4 h-4" />
                    <span>Publier la liste officielle</span>
                  </button>
                </div>

                {isListeOfficiellePubliee && (
                  <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="font-semibold">
                        La liste officielle des admis est actuellement publiée et accessible sur le portail public dans la section « Résultats Officiels ».
                      </span>
                    </div>
                  </div>
                )}

                {/* Liste consolidée des candidats évalués par les jurys */}
                {candidatsPourValidation.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-500">
                    Aucun candidat évalué pour le moment. Dès qu’un Directeur de thèse retient un candidat pour l’entretien scientifique, son dossier et sa fiche d’évaluation apparaissent ici pour validation finale.
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {candidatsPourValidation.map((cand) => {
                      const isAdmis = cand.decisionDirecteur === 'Admis';
                      const isValidated = cand.validationCedoc === true;

                      return (
                        <div
                          key={cand.id}
                          className={`p-4 rounded-xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                            isAdmis
                              ? 'bg-emerald-50/30 border-emerald-300'
                              : isValidated
                              ? 'bg-blue-50/20 border-blue-200'
                              : 'bg-white border-slate-200'
                          }`}
                        >
                          {/* Informations sur le candidat */}
                          <div className="flex-1 min-w-0 flex flex-col gap-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-sm text-slate-900">
                                {cand.candidatPrenom} {cand.candidatNom}
                              </span>
                              <span className="text-xs font-mono font-semibold text-slate-500">
                                ({cand.cne})
                              </span>

                              {isAdmis ? (
                                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-600 text-white shadow-2xs">
                                  Admis (Liste officielle publiée)
                                </span>
                              ) : isValidated ? (
                                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-300">
                                  Proposition d’admission validée
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                                  En attente de visa CEDoc
                                </span>
                              )}
                            </div>

                            <div className="text-xs text-slate-700 font-medium truncate">
                              Sujet : {cand.sujetIntitule}
                            </div>

                            <div className="text-[11px] text-slate-500 flex items-center gap-3 flex-wrap">
                              <span>Directeur de thèse : {cand.directeurNom}</span>
                              <span>·</span>
                              <span>Entretien : {cand.convocationDate || 'Effectué'}</span>
                              <span>·</span>
                              <span className="font-semibold text-emerald-800">
                                Note globale jury : {cand.evaluationJury?.noteFinale || '18.25'}/20
                              </span>
                            </div>
                          </div>

                          {/* Boutons d'action pour le Directeur du CEDoc */}
                          <div className="flex items-center gap-2.5 shrink-0 self-end md:self-auto">
                            {/* Bouton 1 : Consulter le dossier complet et l'acta d'évaluation signée */}
                            <button
                              type="button"
                              onClick={() => setInspectModal({ isOpen: true, candidature: cand })}
                              className="btn-secondary text-xs h-[36px] px-3.5 flex items-center gap-1.5 font-semibold"
                              title="Accéder au dossier complet et au procès-verbal signé"
                            >
                              <FileCheck2 className="w-3.5 h-3.5 text-blue-600" />
                              <span>Dossier & Acta</span>
                            </button>

                            {/* Bouton 2 : Valider la proposition d'admission */}
                            {!isAdmis && (
                              <button
                                type="button"
                                onClick={() => validerPropositionAdmission(cand.id)}
                                disabled={isValidated}
                                className={`text-xs h-[36px] px-3.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all ${
                                  isValidated
                                    ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-default'
                                    : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs'
                                }`}
                              >
                                <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                                <span>{isValidated ? 'Proposition validée' : 'Valider l’admission'}</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* =========================================================
              ONGLET 2 : GESTION GLOBAL (SUPERVISION DES THÈSES & POSTULATIONS)
              ========================================================= */}
          {activeTab === 'gestion' && (
            <div className="flex flex-col gap-6">
              {/* En-tête avec bouton Créer un sujet et filtres */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <h2 className="font-display font-bold text-base text-slate-900">
                    Sujets ({sujetsFiltres.length})
                  </h2>

                  <button
                    type="button"
                    onClick={() => setNewSujetModal((prev) => ({ ...prev, isOpen: true }))}
                    className="btn-primary text-xs h-[36px] px-3.5 flex items-center gap-1.5 self-start sm:self-auto"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Nouveau sujet</span>
                  </button>
                </div>

                {/* Filtres par département et recherche textuelle */}
                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <div className="relative flex-1 w-full">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Rechercher un sujet ou un directeur..."
                      value={searchSujet}
                      onChange={(e) => setSearchSujet(e.target.value)}
                      className="form-input pl-9 h-[38px] text-xs"
                    />
                  </div>

                  <div className="w-full sm:w-64">
                    <select
                      value={selectedDepartement}
                      onChange={(e) => setSelectedDepartement(e.target.value)}
                      className="form-select h-[38px] text-xs"
                    >
                      {DEPARTEMENTS_DISCIPLINAIRES.map((dep) => (
                        <option key={dep} value={dep}>
                          {dep}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Table / Cartes des sujets de thèse supervisés */}
              <div className="grid grid-cols-1 gap-3">
                {sujetsFiltres.map((sujet) => {
                  const isActif = sujet.actif !== false;
                  const isAttribue = sujet.attribue === true || sujet.statut === 'Attribué';

                  return (
                    <div
                      key={sujet.id}
                      className={`bg-white border rounded-xl p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ${
                        isAttribue
                          ? 'border-emerald-200 bg-emerald-50/15'
                          : !isActif
                          ? 'border-amber-200 bg-amber-50/10'
                          : 'border-slate-200'
                      }`}
                    >
                      <div className="flex-1 min-w-0 flex flex-col gap-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                            {sujet.discipline}
                          </span>
                          <span className="text-xs text-slate-700 font-semibold">
                            · {sujet.directeur}
                          </span>

                          {isAttribue ? (
                            <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300">
                              Attribué à {sujet.candidatRetenuNom || 'Doctorant retenu'}
                            </span>
                          ) : isActif ? (
                            <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              Actif
                            </span>
                          ) : (
                            <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                              Désactivé
                            </span>
                          )}
                        </div>

                        <h3 className="font-semibold text-sm text-slate-900 leading-snug">
                          {sujet.intitule}
                        </h3>

                        <p className="text-xs text-slate-600 line-clamp-2 mt-0.5">
                          {sujet.description}
                        </p>
                      </div>

                      {/* Contrôle : Interrupteur d'activation / désactivation du sujet par la Direction du CEDoc */}
                      <div className="flex items-center gap-2.5 shrink-0 self-end md:self-auto">
                        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg p-1.5 px-3">
                          <span className="text-xs font-semibold text-slate-700">
                            {isActif ? 'Sujet actif' : 'Sujet suspendu'}
                          </span>

                          <button
                            type="button"
                            role="switch"
                            aria-checked={isActif}
                            onClick={() => toggleSujetActif(sujet.id)}
                            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                              isActif ? 'bg-blue-600' : 'bg-slate-300'
                            }`}
                            title={isActif ? 'Désactiver le sujet' : 'Activer le sujet'}
                          >
                            <span
                              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                                isActif ? 'translate-x-5' : 'translate-x-0'
                              }`}
                            />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* =========================================================
              ONGLET 3 : PROFIL (MÊME DESIGN CANDIDAT / DIRECTEUR)
              ========================================================= */}
          {activeTab === 'profil' && (
            <div className="flex flex-col gap-6 max-w-[820px] mx-auto w-full">
              {/* Carte Profil principale */}
              <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex flex-col gap-6">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h1 className="font-display font-bold text-base text-slate-900">
                    Profil du Directeur du CEDoc
                  </h1>

                  {!isEditingProfile && (
                    <button
                      type="button"
                      onClick={() => setIsEditingProfile(true)}
                      className="btn-sm-secondary text-xs h-[34px] px-3.5"
                    >
                      Modifier le profil
                    </button>
                  )}
                </div>

                {/* Photo de profil */}
                <div className="flex flex-col items-center text-center gap-3 pb-3 border-b border-slate-100">
                  <div className="relative group">
                    <label
                      htmlFor="avatar-upload-cedoc"
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
                      id="avatar-upload-cedoc"
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
                      {profileTitre} · {profileEtablissement}
                    </span>
                  </div>
                </div>

                {/* Informations de profil */}
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
                      <span className="text-slate-500 font-medium">Courriel officiel</span>
                      <span className="font-semibold text-slate-900">{profileEmail}</span>
                    </div>
                    <div className="py-2.5 flex items-center justify-between">
                      <span className="text-slate-500 font-medium">Téléphone</span>
                      <span className="font-semibold text-slate-900">{profileTelephone}</span>
                    </div>
                    <div className="py-2.5 flex items-center justify-between">
                      <span className="text-slate-500 font-medium">Titre / Fonction</span>
                      <span className="font-semibold text-slate-900">{profileTitre}</span>
                    </div>
                    <div className="py-2.5 flex items-center justify-between">
                      <span className="text-slate-500 font-medium">Établissement</span>
                      <span className="font-semibold text-slate-900">{profileEtablissement}</span>
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
                      <label className="block font-semibold text-slate-700 mb-1">Courriel officiel</label>
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
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Titre / Fonction</label>
                      <input
                        type="text"
                        value={profileTitre}
                        onChange={(e) => setProfileTitre(e.target.value)}
                        className="form-input text-xs h-[36px]"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Établissement</label>
                      <input
                        type="text"
                        value={profileEtablissement}
                        onChange={(e) => setProfileEtablissement(e.target.value)}
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

              {/* Section inférieure : Registre général des logs du système et notifications administratives du CEDoc */}
              <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex flex-col gap-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h3 className="font-display font-bold text-sm text-slate-900">
                    Registre général des logs du système & Notifications administratives
                  </h3>
                  <span className="text-[10px] font-semibold text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                    Audit traçabilité
                  </span>
                </div>

                <div className="flex flex-col divide-y divide-slate-100 text-xs">
                  {logsCedoc.map((log) => (
                    <div key={log.id} className="py-2.5 flex items-start justify-between gap-3">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-medium text-slate-800">{log.action}</span>
                        <span className="text-[10px] text-slate-400">Auteur : {log.auteur}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 whitespace-nowrap">{log.date}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* =========================================================
          MODALE D’INSPECTION COMPLÈTE DU DOSSIER ET DE L’ACTA SIGNÉE DU JURY
          ========================================================= */}
      {inspectModal.isOpen && inspectModal.candidature && (
        <div
          className="modal-overlay"
          onClick={() => setInspectModal({ isOpen: false, candidature: null })}
        >
          <div
            className="modal-content max-w-3xl p-6 bg-white border border-slate-200 rounded-xl shadow-xl flex flex-col gap-5 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header de la modale */}
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-display font-bold text-base text-slate-900">
                    Dossier & Procès-Verbal d’Évaluation du Jury
                  </h2>
                  <span className="text-xs text-slate-500">
                    Candidat : {inspectModal.candidature.candidatPrenom}{' '}
                    {inspectModal.candidature.candidatNom} · CNE : {inspectModal.candidature.cne}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setInspectModal({ isOpen: false, candidature: null })}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 1. FICHE / ACTA D'ÉVALUATION SIGNÉE DU JURY */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 flex flex-col gap-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <FileCheck2 className="w-4 h-4 text-emerald-600" />
                  <h3 className="font-bold text-xs uppercase tracking-wide text-slate-800">
                    Acta d’évaluation officielle du jury d’audition
                  </h3>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
                  Émargé et signé électroniquement
                </span>
              </div>

              {/* Composition du jury et date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-white p-3 rounded-lg border border-slate-200">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">
                    Membres du jury d’entretien
                  </span>
                  <ul className="list-disc list-inside mt-1 space-y-0.5 text-slate-800 font-medium">
                    {inspectModal.candidature.evaluationJury?.membresJury?.map((m, idx) => (
                      <li key={idx}>{m}</li>
                    )) || (
                      <>
                        <li>Pr. {inspectModal.candidature.directeurNom} (Directeur de thèse)</li>
                        <li>Pr. Karim El Mansouri (Président de la commission)</li>
                        <li>Pr. Nadia Bennani (Rapporteur)</li>
                      </>
                    )}
                  </ul>
                </div>

                <div className="flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">
                      Date & Lieu de soutenance de candidature
                    </span>
                    <span className="font-semibold text-slate-800 mt-1 block">
                      {inspectModal.candidature.convocationDate || '24 novembre 2026'} · Salle des actes, EST Fès
                    </span>
                  </div>

                  <div className="mt-2 pt-2 border-t border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">
                      Note globale chiffrée
                    </span>
                    <span className="text-sm font-bold text-emerald-700">
                      {inspectModal.candidature.evaluationJury?.noteFinale || '18.25'} / 20
                    </span>
                  </div>
                </div>
              </div>

              {/* Appréciation collégiale du jury */}
              <div className="bg-white p-3 rounded-lg border border-slate-200 text-xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                  Avis motivé et observations du jury
                </span>
                <p className="text-slate-800 font-medium leading-relaxed">
                  {inspectModal.candidature.evaluationJury?.appreciation ||
                    'Dossier académique remarquable. Le candidat a fait preuve d’une très bonne maîtrise de la problématique et d’une réelle rigueur scientifique. Proposition d’admission validée avec avis très favorable.'}
                </p>
                <div className="mt-2 pt-2 border-t border-slate-100 text-[10px] text-slate-500 font-mono flex items-center justify-between">
                  <span>Signature électronique : CERT-JURY-2026-FES</span>
                  <span>Visa délibéré le {inspectModal.candidature.convocationDate || '24 novembre 2026'}</span>
                </div>
              </div>
            </div>

            {/* 2. EXPÉDIENTE COMPLET DU CANDIDAT (PIÈCES JOINTES) */}
            <div className="flex flex-col gap-3">
              <h3 className="font-bold text-xs uppercase tracking-wide text-slate-700">
                Expediente administratif et pièces justificatives
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {inspectModal.candidature.pieces &&
                Object.keys(inspectModal.candidature.pieces).length > 0 ? (
                  Object.entries(inspectModal.candidature.pieces).map(([key, piece]) => (
                    <div
                      key={key}
                      className="p-3 bg-white border border-slate-200 rounded-lg flex items-center justify-between gap-2 hover:border-slate-300 transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                        <span className="font-semibold text-slate-800 truncate" title={piece.fileName}>
                          {piece.fileName}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          setViewingPiece({
                            isOpen: true,
                            candidatNom: `${inspectModal.candidature?.candidatPrenom} ${inspectModal.candidature?.candidatNom}`,
                            fileName: piece.fileName,
                            type: piece.type,
                          })
                        }
                        className="text-xs font-semibold text-blue-600 hover:text-blue-800 shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded hover:bg-blue-50"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Consulter</span>
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-500 col-span-2 text-center text-xs">
                    Toutes les pièces obligatoires (CV, Diplôme, Relevés de notes, Projet) ont été certifiées conformes lors du pré-contrôle administratif.
                  </div>
                )}
              </div>
            </div>

            {/* 3. CONTRÔLE DE CONFORMITÉ & ACTION DU DIRECTEUR DU CEDOC */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
              <span className="text-[11px] text-slate-500 font-medium">
                Conformité administrative vérifiée selon les normes doctorales en vigueur.
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setInspectModal({ isOpen: false, candidature: null })}
                  className="btn-secondary text-xs h-[36px] px-3.5"
                >
                  Fermer
                </button>

                <button
                  type="button"
                  onClick={() => {
                    validerPropositionAdmission(inspectModal.candidature!.id);
                    setInspectModal({ isOpen: false, candidature: null });
                  }}
                  className="btn-primary text-xs h-[36px] px-4 flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4 stroke-[2.5]" />
                  <span>Confirmer la proposition d’admission</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          MODALE DE CONSULTATION RÉELLE DE PIÈCE JOINTE
          ========================================================= */}
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

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 flex flex-col gap-4 min-h-[300px]">
              <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs flex flex-col gap-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                  <span>CEDoc EST Fès · Université Sidi Mohamed Ben Abdellah</span>
                  <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    Document certifié
                  </span>
                </div>

                <div className="py-4 text-center flex flex-col items-center gap-1">
                  <h4 className="font-bold text-sm text-slate-900">
                    {viewingPiece.fileName.replace(/\.pdf|\.png|\.jpg/i, '').replace(/_/g, ' ')}
                  </h4>
                  <span className="text-xs text-slate-600 font-medium">
                    Candidat : {viewingPiece.candidatNom}
                  </span>
                  <p className="text-xs text-slate-500 max-w-md mt-2 leading-relaxed">
                    Copie conforme certifiée conforme pour la procédure d’admission doctorale 2026/2027.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setViewingPiece((prev) => ({ ...prev, isOpen: false }))}
                className="btn-secondary text-xs h-[36px] px-4"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          MODALE D'AJOUT D'UN NOUVEAU SUJET DE THÈSE
          ========================================================= */}
      {newSujetModal.isOpen && (
        <div
          className="modal-overlay"
          onClick={() => setNewSujetModal((prev) => ({ ...prev, isOpen: false }))}
        >
          <div
            className="modal-content max-w-lg p-6 bg-white border border-slate-200 rounded-xl shadow-lg flex flex-col gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-display font-bold text-base text-slate-900">
                Ajouter un nouveau sujet de thèse
              </h3>
              <button
                type="button"
                onClick={() => setNewSujetModal((prev) => ({ ...prev, isOpen: false }))}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSujet} className="flex flex-col gap-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Intitulé officiel du sujet
                </label>
                <input
                  type="text"
                  value={newSujetModal.intitule}
                  onChange={(e) => setNewSujetModal((prev) => ({ ...prev, intitule: e.target.value }))}
                  placeholder="Ex : Optimisation des architectures IA embarquées..."
                  className="form-input text-xs h-[38px]"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Département disciplinaire
                </label>
                <select
                  value={newSujetModal.discipline}
                  onChange={(e) => setNewSujetModal((prev) => ({ ...prev, discipline: e.target.value }))}
                  className="form-select text-xs h-[38px]"
                >
                  {DEPARTEMENTS_DISCIPLINAIRES.filter((d) => d !== 'Tous les départements').map((dep) => (
                    <option key={dep} value={dep}>
                      {dep}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Directeur de thèse encadrant
                </label>
                <input
                  type="text"
                  value={newSujetModal.directeur}
                  onChange={(e) => setNewSujetModal((prev) => ({ ...prev, directeur: e.target.value }))}
                  className="form-input text-xs h-[38px]"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Description officielle du sujet
                </label>
                <textarea
                  rows={4}
                  value={newSujetModal.description}
                  onChange={(e) => setNewSujetModal((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Problématique, méthodologie et cadre de recherche..."
                  className="form-textarea text-xs"
                  required
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setNewSujetModal((prev) => ({ ...prev, isOpen: false }))}
                  className="btn-secondary text-xs h-[36px] px-3.5"
                >
                  Annuler
                </button>
                <button type="submit" className="btn-primary text-xs h-[36px] px-4">
                  Créer et publier le sujet
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
            onClick={() => setActiveTab('tableau')}
            className={`flex flex-col items-center gap-1 text-xs font-semibold transition-colors ${
              activeTab === 'tableau' ? 'text-blue-600' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <LayoutDashboard className="w-5 h-5" />
            <span>Tableau de bord</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('gestion')}
            className={`flex flex-col items-center gap-1 text-xs font-semibold transition-colors ${
              activeTab === 'gestion' ? 'text-blue-600' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <FolderKanban className="w-5 h-5" />
            <span>Gestion Global</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('profil')}
            className={`flex flex-col items-center gap-1 text-xs font-semibold transition-colors ${
              activeTab === 'profil' ? 'text-blue-600' : 'text-slate-500 hover:text-slate-800'
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

export default DirecteurCedocDashboard;
