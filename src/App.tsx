import React, { useEffect } from 'react';
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DoctorantZone } from './components/DoctorantZone';
import { PersonnelZone } from './components/PersonnelZone';
import { PublicZone } from './components/PublicZone';

const HashPersonnelRedirector: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const syncHash = () => {
      if (window.location.hash.startsWith('#/personnel')) {
        window.history.replaceState(null, '', '/personnel');
        navigate('/personnel', { replace: true });
      }
    };
    syncHash();
    window.addEventListener('hashchange', syncHash);
    return () => window.removeEventListener('hashchange', syncHash);
  }, [navigate, location.pathname]);

  return null;
};

const RootRouter: React.FC = () => {
  const { authReady, accountKind } = useAuth();

  if (!authReady) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-sm text-slate-500">Chargement...</p>
      </div>
    );
  }

  return (
    <>
      <HashPersonnelRedirector />
      <Routes>
        <Route
          path="/personnel/*"
          element={
            accountKind === 'doctorant' ? (
              <Navigate to="/" replace />
            ) : (
              <PersonnelZone />
            )
          }
        />
        <Route
          path="/*"
          element={
            accountKind === 'personnel' ? (
              <Navigate to="/personnel" replace />
            ) : accountKind === 'doctorant' ? (
              <DoctorantZone />
            ) : (
              <PublicZone />
            )
          }
        />
      </Routes>
    </>
  );
};

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <RootRouter />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
