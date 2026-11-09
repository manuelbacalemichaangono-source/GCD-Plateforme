import React, { useState } from 'react';
import { X, UserCheck, GraduationCap } from 'lucide-react';
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
  const { loginWithEmail, loginWithGoogle, registerCandidate, loginAsDirecteur } = useAuth();

  // Rôle sélectionné dans la modale : 'candidat' ou 'directeur'
  const [selectedRole, setSelectedRole] = useState<'candidat' | 'directeur'>('candidat');
  const [selectedDirectorId, setSelectedDirectorId] = useState(INITIAL_DIRECTEURS[0].id);

  const [nom, setNom] = useState('');
  const [prenom, setPrenom] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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

  const handleGoogleLogin = async () => {
    setErrorMsg(null);
    setBusy(true);
    try {
      await loginWithGoogle();
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

        {/* Sélecteur de profil en mode Connexion (Candidat ou Directeur de Thèse) */}
        {mode === 'login' && (
          <div className="grid grid-cols-2 gap-2 mt-4 p-1 bg-slate-100 rounded-lg text-xs font-semibold">
            <button
              type="button"
              onClick={() => setSelectedRole('candidat')}
              className={`py-2 px-3 rounded-md transition-all flex items-center justify-center gap-1.5 ${
                selectedRole === 'candidat'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <GraduationCap className="w-4 h-4" />
              <span>Candidat</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedRole('directeur')}
              className={`py-2 px-3 rounded-md transition-all flex items-center justify-center gap-1.5 ${
                selectedRole === 'directeur'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <UserCheck className="w-4 h-4" />
              <span>Directeur de Thèse</span>
            </button>
          </div>
        )}

        {errorMsg && (
          <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
            {errorMsg}
          </div>
        )}

        {/* 1. SECTION DIRECTEUR DE THÈSE */}
        {mode === 'login' && selectedRole === 'directeur' ? (
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
        ) : (
          /* 2. SECTION CANDIDAT */
          <form onSubmit={handleSubmitCandidat} className="mt-4 flex flex-col gap-3">
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

            {/* Séparateur sobre */}
            <div className="relative my-1 text-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <span className="relative bg-white px-3 text-[11px] text-slate-400 uppercase tracking-wider">
                ou
              </span>
            </div>

            {/* Continuer avec Google */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={busy}
              className="btn-secondary w-full text-xs h-[38px]"
            >
              <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
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
              Continuer avec Google
            </button>
          </form>
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
