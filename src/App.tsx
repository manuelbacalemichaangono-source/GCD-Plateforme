/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Link,
  useNavigate,
  useLocation,
} from "react-router-dom";
import { LogOut } from "lucide-react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { UserRole, ROLE_ROUTES, ROLE_LABELS } from "./types/cedoc";
import { PublicAndCandidatSpace } from "./components/PublicAndCandidatSpace";
import { LoginScreen } from "./components/LoginScreen";
import { DoctorantScreen } from "./components/DoctorantScreen";
import { ScolariteScreen } from "./components/ScolariteScreen";
import { JuryScreen } from "./components/JuryScreen";
import { DirecteurTheseScreen } from "./components/DirecteurTheseScreen";
import { DirecteurLaboScreen } from "./components/DirecteurLaboScreen";
import { DirecteurCedocScreen } from "./components/DirecteurCedocScreen";

const ProtectedRoute: React.FC<{
  allowedRole: UserRole;
  children: React.ReactNode;
}> = ({ allowedRole, children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="py-12 text-center text-xs text-slate-500">
        Chargement...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/connexion" replace />;
  }

  if (user.role !== allowedRole) {
    return <Navigate to={ROLE_ROUTES[user.role]} replace />;
  }

  return <>{children}</>;
};

const PublicHomeGate: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="py-12 text-center text-xs text-slate-500">
        Chargement...
      </div>
    );
  }

  if (user) {
    return <Navigate to={ROLE_ROUTES[user.role]} replace />;
  }

  return <PublicAndCandidatSpace mode="public" />;
};

const AppShell: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate("/connexion", { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      <header className="bg-white border-b border-slate-200 px-4 sm:px-6 py-2.5 flex items-center justify-between gap-4">
        <Link
          to={user ? ROLE_ROUTES[user.role] : "/"}
          className="font-display text-sm font-bold tracking-tight text-slate-950 whitespace-nowrap"
        >
          GCD Platform
        </Link>

        <div className="flex items-center gap-3 text-xs">
          {user ? (
            <>
              <span className="text-slate-600 hidden sm:inline">
                {user.fullName} · {ROLE_LABELS[user.role]}
              </span>
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-300 bg-white hover:bg-slate-50 text-slate-900 font-semibold rounded transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Déconnexion</span>
              </button>
            </>
          ) : location.pathname === "/connexion" ? (
            <Link
              to="/"
              className="px-3 py-1.5 border border-slate-300 bg-white hover:bg-slate-50 text-slate-900 font-semibold rounded"
            >
              Recherche de sujets
            </Link>
          ) : (
            <Link
              to="/connexion"
              className="px-3.5 py-1.5 bg-slate-900 text-white hover:bg-slate-800 font-semibold rounded"
            >
              Se connecter
            </Link>
          )}
        </div>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-5">
        <Routes>
          <Route path="/" element={<PublicHomeGate />} />
          <Route path="/connexion" element={<LoginScreen />} />

          <Route
            path="/candidat"
            element={
              <ProtectedRoute allowedRole="candidat">
                <PublicAndCandidatSpace mode="candidat" />
              </ProtectedRoute>
            }
          />

          <Route
            path="/doctorant"
            element={
              <ProtectedRoute allowedRole="doctorant">
                <DoctorantScreen />
              </ProtectedRoute>
            }
          />

          <Route
            path="/scolarite"
            element={
              <ProtectedRoute allowedRole="scolarite">
                <ScolariteScreen />
              </ProtectedRoute>
            }
          />

          <Route
            path="/jury"
            element={
              <ProtectedRoute allowedRole="jury">
                <JuryScreen />
              </ProtectedRoute>
            }
          />

          <Route
            path="/directeur-these"
            element={
              <ProtectedRoute allowedRole="directeur_these">
                <DirecteurTheseScreen />
              </ProtectedRoute>
            }
          />

          <Route
            path="/directeur-laboratoire"
            element={
              <ProtectedRoute allowedRole="directeur_labo">
                <DirecteurLaboScreen />
              </ProtectedRoute>
            }
          />

          <Route
            path="/directeur-cedoc"
            element={
              <ProtectedRoute allowedRole="directeur_cedoc">
                <DirecteurCedocScreen />
              </ProtectedRoute>
            }
          />

          <Route
            path="*"
            element={
              <Navigate to={user ? ROLE_ROUTES[user.role] : "/"} replace />
            }
          />
        </Routes>
      </main>
    </div>
  );
};

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppShell />
      </AuthProvider>
    </BrowserRouter>
  );
}
