import React, { useState } from 'react';
import { X, UserCheck, GraduationCap, User as UserIcon, ArrowLeft, Shield } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { translateFirebaseAuthError } from '../firebase';
import { INITIAL_DIRECTEURS } from '../data/initialCatalog';

interface AuthModalProps {
  isOpen: boolean;
  mode: 'login' | 'register';
  onClose: () => void;
  onSwitchMode: (mode: 'login' | 'register') => void;
  onSuccessRedirect?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  mode,
  onClose,
  onSwitchMode,
  onSuccessRedirect,
}) => {
  const {
    loginWithEmail,
    loginWithGoogle,
    registerCandidate,
    loginAsDirecteur,
    loginAsDirecteurCedoc,
  } = useAuth();

  // Rôle sélectionné dans la modale : 'candidat', 'directeur' ou 'directeur_cedoc'
  const [selectedRole, setSelectedRole] = useState<'candidat' | 'directeur' | 'directeur_cedoc'>('candidat');
  const [selectedDirectorId, setSelectedDirectorId] = useState(INITIAL_DIRECTEURS[0].id);

  const [nom, setNom] = useState('');
  const [prenom, setPrenom] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Sélecteur de compte Google interactif
  const [showGoogleChooser, setShowGoogleChooser] = useState(false);
  const [isEnteringOtherGoogle, setIsEnteringOtherGoogle] = useState(false);
  const [otherGoogleEmail, setOtherGoogleEmail] = useState('');

  // Réinitialisation de l'authentification à chaque ouverture, changement de vue ou de rôle
  React.useEffect(() => {
    setErrorMsg(null);
    setNom('');
    setPrenom('');
    setEmail('');
    setPassword('');
    setShowGoogleChooser(false);
    setIsEnteringOtherGoogle(false);
    setOtherGoogleEmail('');
  }, [isOpen, mode, selectedRole]);

  if (!isOpen) return null;

  const handleSubmitCandidat = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setBusy(true);

    try {
      if (mode === 'register') {
        if (!nom.trim() || !prenom.trim()) {
          setErrorMsg('Veuillez renseigner votre nom et votre prénom.');
          setBusy(false);
          return;
        }
        await registerCandidate(nom, prenom, email, password);
      } else {
        await loginWithEmail(email, password);
      }
      onClose();
      if (onSuccessRedirect) {
        onSuccessRedirect();
      }
    } catch (err) {
      setErrorMsg(translateFirebaseAuthError(err));
    } finally {
      setBusy(false);
    }
  };

  const handleLoginDirecteur = () => {
    loginAsDirecteur(selectedDirectorId);
    onClose();
    if (onSuccessRedirect) {
      onSuccessRedirect();
    }
  };

  const handleSelectGoogleAccount = async (accountEmail: string, accountName?: string) => {
    setErrorMsg(null);
    setBusy(true);
    try {
      const res = await loginWithGoogle(accountEmail, accountName);
      if (res) {
        onClose();
        if (onSuccessRedirect) {
          onSuccessRedirect();
        }
      }
    } catch (err) {
      setErrorMsg(translateFirebaseAuthError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content max-w-md p-6 bg-white border border-slate-200 rounded-xl shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header simple avec titre et fermeture */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h2 className="font-display font-bold text-base text-slate-900">
            {mode === 'login' ? 'Connexion' : 'Inscription'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sélecteur de rôle en mode Connexion */}
        {mode === 'login' && (
          <div className="grid grid-cols-3 gap-1.5 mt-4 p-1 bg-slate-100 rounded-lg text-[11px] font-semibold">
            <button
              type="button"
              onClick={() => setSelectedRole('candidat')}
              className={`py-2 px-1.5 rounded-md transition-all flex flex-col sm:flex-row items-center justify-center gap-1 text-center ${
                selectedRole === 'candidat'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5 shrink-0" />
              <span>Candidat</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedRole('directeur')}
              className={`py-2 px-1.5 rounded-md transition-all flex flex-col sm:flex-row items-center justify-center gap-1 text-center ${
                selectedRole === 'directeur'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5 shrink-0" />
              <span>Dir. Thèse</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedRole('directeur_cedoc')}
              className={`py-2 px-1.5 rounded-md transition-all flex flex-col sm:flex-row items-center justify-center gap-1 text-center ${
                selectedRole === 'directeur_cedoc'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Shield className="w-3.5 h-3.5 shrink-0 text-blue-600" />
              <span>Dir. CEDoc</span>
            </button>
          </div>
        )}

        {errorMsg && (
          <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
            {errorMsg}
          </div>
        )}

        {/* 1. SECTION DIRECTEUR DU CEDOC (Accès direct sans mot de passe) */}
        {mode === 'login' && selectedRole === 'directeur_cedoc' ? (
          <div className="mt-4 flex flex-col gap-4">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-2xs">
                <Shield className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="font-display font-bold text-sm text-slate-900">
                  Pr. Mohammed Amine Bennani
                </h3>
                <span className="text-[11px] text-slate-500 font-medium block">
                  Directeur du Centre d’Études Doctorales (CEDoc EST Fès)
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                loginAsDirecteurCedoc();
                onClose();
                if (onSuccessRedirect) onSuccessRedirect();
              }}
              className="btn-primary w-full text-xs h-[40px] flex items-center justify-center gap-2"
            >
              <Shield className="w-4 h-4" />
              <span>Accéder à l’espace Directeur du CEDoc</span>
            </button>
          </div>
        ) : mode === 'login' && selectedRole === 'directeur' ? (
          /* 2. SECTION DIRECTEUR DE THÈSE */
          <div className="mt-4 flex flex-col gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Sélectionner un professeur préenregistré
              </label>
              <select
                value={selectedDirectorId}
                onChange={(e) => setSelectedDirectorId(e.target.value)}
                className="form-select text-xs h-[40px]"
              >
                {INITIAL_DIRECTEURS.map((dir) => (
                  <option key={dir.id} value={dir.id}>
                    {dir.nomComplet} ({dir.email})
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={handleLoginDirecteur}
              className="btn-primary w-full text-xs h-[40px] mt-1"
            >
              Accéder à mon espace enseignant
            </button>
          </div>
        ) : showGoogleChooser ? (
          /* SÉLECTEUR DE COMPTE GOOGLE INTERACTIF SANS ÉCHEC */
          <div className="mt-4 flex flex-col gap-4">
            <div className="flex flex-col items-center text-center gap-1">
              <svg className="w-6 h-6 mb-0.5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <h3 className="font-display font-bold text-sm text-slate-900">
                Choisir un compte Google
              </h3>
              <p className="text-xs text-slate-500">
                pour continuer vers <span className="font-semibold text-slate-700">GCD Plateforme</span>
              </p>
            </div>

            <div className="flex flex-col divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden shadow-2xs bg-white">
              {/* Choix libre parmi plusieurs comptes Google disponibles */}
              {[
                { name: 'Aladin Monroe', email: 'aladinmonroe0@gmail.com', initial: 'A', color: 'bg-blue-600' },
                { name: 'Manuel Bacale', email: 'bacalemicha@gmail.com', initial: 'M', color: 'bg-emerald-600' },
                { name: 'Doctorant Chercheur', email: 'candidat.cedoc@gmail.com', initial: 'D', color: 'bg-indigo-600' },
              ].map((acc) => (
                <button
                  key={acc.email}
                  type="button"
                  onClick={() => handleSelectGoogleAccount(acc.email, acc.name)}
                  className="p-3.5 flex items-center gap-3 hover:bg-slate-50 transition-colors text-left group"
                >
                  <div className={`w-9 h-9 rounded-full ${acc.color} text-white font-bold flex items-center justify-center text-xs shadow-xs shrink-0 group-hover:scale-105 transition-transform`}>
                    {acc.initial}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="font-semibold text-xs text-slate-900 block truncate group-hover:text-blue-600">
                      {acc.name}
                    </span>
                    <span className="text-[11px] text-slate-500 block truncate">
                      {acc.email}
                    </span>
                  </div>
                </button>
              ))}

              {/* Option libre : Saisir n'importe quel autre compte Google */}
              {!isEnteringOtherGoogle ? (
                <button
                  type="button"
                  onClick={() => setIsEnteringOtherGoogle(true)}
                  className="p-3.5 flex items-center gap-3 hover:bg-slate-50 transition-colors text-left text-xs font-semibold text-slate-700 hover:text-blue-600"
                >
                  <div className="w-9 h-9 rounded-full border border-dashed border-slate-300 flex items-center justify-center text-slate-400 shrink-0">
                    <UserIcon className="w-4 h-4" />
                  </div>
                  <span>Saisir un autre compte Google...</span>
                </button>
              ) : (
                <div className="p-3.5 flex flex-col gap-2.5 bg-slate-50">
                  <label className="text-[11px] font-semibold text-slate-700">
                    Adresse email Google
                  </label>
                  <input
                    type="email"
                    value={otherGoogleEmail}
                    onChange={(e) => setOtherGoogleEmail(e.target.value)}
                    placeholder="autre.compte@gmail.com"
                    className="form-input text-xs h-[36px]"
                    required
                    autoFocus
                  />
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsEnteringOtherGoogle(false)}
                      className="btn-secondary text-xs h-[32px] px-3"
                    >
                      Annuler
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (otherGoogleEmail.trim()) {
                          handleSelectGoogleAccount(otherGoogleEmail.trim());
                        }
                      }}
                      className="btn-primary text-xs h-[32px] px-3.5"
                    >
                      Continuer
                    </button>
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                setShowGoogleChooser(false);
                setIsEnteringOtherGoogle(false);
              }}
              className="inline-flex items-center justify-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 font-semibold"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Retour au formulaire</span>
            </button>
          </div>
        ) : (
          /* 2. SECTION CANDIDAT */
          <div className="mt-4 flex flex-col gap-3">
            {/* Bouton Continuer avec Google standard */}
            <button
              type="button"
              onClick={() => {
                setErrorMsg(null);
                setShowGoogleChooser(true);
              }}
              disabled={busy}
              className="btn-secondary w-full text-xs h-[40px] flex items-center justify-center gap-2 border-slate-300 hover:bg-slate-50 font-semibold"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Continuer avec Google</span>
            </button>

            {/* Séparateur */}
            <div className="relative my-1 text-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <span className="relative bg-white px-3 text-[11px] text-slate-400 uppercase tracking-wider">
                ou par email
              </span>
            </div>

            <form onSubmit={handleSubmitCandidat} className="flex flex-col gap-3">
              {mode === 'register' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <input
                      type="text"
                      placeholder="Nom"
                      value={nom}
                      onChange={(e) => setNom(e.target.value)}
                      required
                      className="form-input text-xs h-[38px]"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      placeholder="Prénom"
                      value={prenom}
                      onChange={(e) => setPrenom(e.target.value)}
                      required
                      className="form-input text-xs h-[38px]"
                    />
                  </div>
                </div>
              )}

              <div>
                <input
                  type="email"
                  placeholder="Adresse email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="form-input text-xs h-[38px]"
                />
              </div>

              <div>
                <input
                  type="password"
                  placeholder="Mot de passe"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="form-input text-xs h-[38px]"
                />
              </div>

              <button
                type="submit"
                disabled={busy}
                className="btn-primary w-full text-xs h-[38px] mt-1"
              >
                {busy ? 'Traitement...' : mode === 'login' ? 'Se connecter' : "S'inscrire"}
              </button>
            </form>
          </div>
        )}

        {/* Bascule de mode */}
        <div className="mt-4 pt-3 border-t border-slate-100 text-center">
          {mode === 'login' ? (
            <button
              type="button"
              onClick={() => onSwitchMode('register')}
              className="text-xs font-semibold text-blue-600 hover:underline"
            >
              Pas encore de compte ? Créer un compte candidat
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onSwitchMode('login')}
              className="text-xs font-semibold text-blue-600 hover:underline"
            >
              Déjà inscrit ? Se connecter
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
