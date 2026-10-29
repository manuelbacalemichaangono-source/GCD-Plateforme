import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ROLE_ROUTES, ThesisSubject } from "../types/cedoc";

export const LoginScreen: React.FC = () => {
  const {
    user,
    login,
    loginWithGoogle,
    registerCandidat,
    pendingVerification,
    confirmEmailVerification,
    resendVerificationEmail,
    clearPendingVerification,
  } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState<"login" | "register">("login");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");

  const [subjects, setSubjects] = useState<ThesisSubject[]>([]);
  const [subjectId, setSubjectId] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [cne, setCne] = useState("");
  const [originInstitution, setOriginInstitution] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      navigate(ROLE_ROUTES[user.role], { replace: true });
    }
  }, [user, navigate]);

  useEffect(() => {
    fetch("/api/public/sujets")
      .then((r) => r.json())
      .then((d) => {
        const list: ThesisSubject[] = d.subjects || [];
        setSubjects(list);
        if (list.length > 0) setSubjectId(list[0].id);
      })
      .catch(() => {});
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const logged = await login(identifier, password);
      navigate(ROLE_ROUTES[logged.role], { replace: true });
    } catch (err: any) {
      setError(err?.message || "Connexion impossible.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await registerCandidat({
        fullName,
        email,
        password: regPassword,
        subjectId,
        cne,
        originInstitution,
      });
      if (res.verified && res.user) {
        navigate(ROLE_ROUTES[res.user.role], { replace: true });
      }
    } catch (err: any) {
      setError(err?.message || "Inscription impossible.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyEmail = async () => {
    setError(null);
    setInfoMessage(null);
    setSubmitting(true);
    try {
      const verifiedUser = await confirmEmailVerification();
      navigate(ROLE_ROUTES[verifiedUser.role], { replace: true });
    } catch (err: any) {
      setError(err?.message || "Vérification impossible.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setSubmitting(true);
    try {
      const logged = await loginWithGoogle({
        subjectId: mode === "register" ? subjectId : undefined,
        cne: mode === "register" ? cne : undefined,
        originInstitution: mode === "register" ? originInstitution : undefined,
      });
      navigate(ROLE_ROUTES[logged.role], { replace: true });
    } catch (err: any) {
      setError(err?.message || "Authentification Google impossible.");
    } finally {
      setSubmitting(false);
    }
  };

  if (pendingVerification) {
    return (
      <div className="max-w-md mx-auto mt-10 bg-white border border-slate-200 rounded-lg p-6 space-y-4 text-xs">
        <h1 className="text-base font-bold text-slate-900">
          Vérification de l'adresse e-mail
        </h1>
        <p className="text-slate-700 leading-relaxed">
          Confirmez votre adresse <strong>{pendingVerification.email}</strong>{" "}
          pour activer votre compte candidat et accéder au dépôt de vos pièces.
        </p>

        {error && (
          <div className="p-2.5 bg-red-50 border border-red-200 text-red-800 rounded">
            {error}
          </div>
        )}
        {infoMessage && (
          <div className="p-2.5 bg-slate-100 border border-slate-200 text-slate-800 rounded">
            {infoMessage}
          </div>
        )}

        <div className="flex flex-col gap-2 pt-1">
          <button
            type="button"
            disabled={submitting}
            onClick={handleVerifyEmail}
            className="w-full py-2 px-3 bg-slate-900 text-white font-semibold rounded hover:bg-slate-800 disabled:opacity-50"
          >
            {submitting
              ? "Vérification..."
              : "Confirmer mon adresse e-mail et continuer"}
          </button>

          {pendingVerification.mode === "firebase" && (
            <button
              type="button"
              onClick={async () => {
                await resendVerificationEmail();
                setInfoMessage("Lien de vérification renvoyé.");
              }}
              className="w-full py-1.5 px-3 border border-slate-300 text-slate-700 rounded hover:bg-slate-50"
            >
              Renvoyer l'e-mail de vérification
            </button>
          )}

          <button
            type="button"
            onClick={clearPendingVerification}
            className="text-slate-500 hover:text-slate-900 underline pt-1"
          >
            Retour à la connexion
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto mt-8 bg-white border border-slate-200 rounded-lg p-6 space-y-5 text-xs">
      <div className="flex border-b border-slate-200">
        <button
          type="button"
          onClick={() => {
            setMode("login");
            setError(null);
          }}
          className={`flex-1 pb-2.5 font-semibold border-b-2 transition-colors ${
            mode === "login"
              ? "border-slate-900 text-slate-900"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Connexion
        </button>
        <button
          type="button"
          onClick={() => {
            setMode("register");
            setError(null);
          }}
          className={`flex-1 pb-2.5 font-semibold border-b-2 transition-colors ${
            mode === "register"
              ? "border-slate-900 text-slate-900"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Créer un compte candidat
        </button>
      </div>

      {error && (
        <div className="p-2.5 bg-red-50 border border-red-200 text-red-800 rounded">
          {error}
        </div>
      )}

      {mode === "login" ? (
        <form onSubmit={handleLogin} className="space-y-3.5">
          <div>
            <label className="block font-medium text-slate-700 mb-1">
              Identifiant institutionnel ou adresse e-mail
            </label>
            <input
              type="text"
              required
              autoComplete="username"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded bg-white text-slate-900 focus:outline-none focus:border-slate-900"
            />
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">
              Mot de passe
            </label>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded bg-white text-slate-900 focus:outline-none focus:border-slate-900"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2 px-3 bg-slate-900 text-white font-semibold rounded hover:bg-slate-800 disabled:opacity-50"
          >
            {submitting ? "Connexion..." : "Se connecter"}
          </button>

          <button
            type="button"
            disabled={submitting}
            onClick={handleGoogleSignIn}
            className="w-full py-2 px-3 border border-slate-300 text-slate-800 font-medium rounded hover:bg-slate-50 disabled:opacity-50"
          >
            Continuer avec Google
          </button>
        </form>
      ) : (
        <form onSubmit={handleRegister} className="space-y-3">
          <div>
            <label className="block font-medium text-slate-700 mb-1">
              Sujet de thèse choisi
            </label>
            <select
              required
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
              className="w-full px-2.5 py-2 border border-slate-300 rounded bg-white text-slate-900 focus:outline-none focus:border-slate-900"
            >
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.code} — {s.title} ({s.laboratory})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">
              Nom complet
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded bg-white text-slate-900 focus:outline-none focus:border-slate-900"
            />
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">
              Adresse e-mail
            </label>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded bg-white text-slate-900 focus:outline-none focus:border-slate-900"
            />
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">
              Mot de passe
            </label>
            <input
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              value={regPassword}
              onChange={(e) => setRegPassword(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded bg-white text-slate-900 focus:outline-none focus:border-slate-900"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className="block font-medium text-slate-700 mb-1">
                CNE / Identifiant étudiant
              </label>
              <input
                type="text"
                placeholder="Optionnel"
                value={cne}
                onChange={(e) => setCne(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white text-slate-900 focus:outline-none focus:border-slate-900"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">
                Université d'origine
              </label>
              <select
                value={originInstitution}
                onChange={(e) => setOriginInstitution(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white text-slate-900 focus:outline-none focus:border-slate-900"
              >
                <option value="">Autre / Dépôt direct</option>
                <option value="EST Fès / USMBA">
                  EST Fès / USMBA (Base interne)
                </option>
                <option value="Université Mohammed V de Rabat">
                  Université Mohammed V (API)
                </option>
                <option value="Université Cadi Ayyad">
                  Université Cadi Ayyad (API)
                </option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2 px-3 bg-slate-900 text-white font-semibold rounded hover:bg-slate-800 disabled:opacity-50"
          >
            {submitting ? "Création..." : "Créer mon compte candidat"}
          </button>

          <button
            type="button"
            disabled={submitting}
            onClick={handleGoogleSignIn}
            className="w-full py-2 px-3 border border-slate-300 text-slate-800 font-medium rounded hover:bg-slate-50 disabled:opacity-50"
          >
            Créer avec Google
          </button>
        </form>
      )}
    </div>
  );
};
