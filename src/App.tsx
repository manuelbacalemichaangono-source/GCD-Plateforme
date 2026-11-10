import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { HomePage } from './components/HomePage';
import { CandidateDashboard } from './components/CandidateDashboard';
import { DirecteurDashboard } from './components/DirecteurDashboard';
import { CartView } from './components/CartView';
import { SubjectDetailModal } from './components/SubjectDetailModal';
import { AuthModal } from './components/AuthModal';
import { CalendrierView } from './components/CalendrierView';
import { SujetRecord } from './types/cedoc';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class AppErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full text-center p-8 flex flex-col items-center gap-4 shadow-sm">
            <h2 className="font-display font-bold text-slate-900 text-base">
              Une erreur inattendue est survenue
            </h2>
            <button
              type="button"
              onClick={() => {
                this.setState({ hasError: false });
                window.location.reload();
              }}
              className="btn-primary text-xs"
            >
              Recharger
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const MainAppContent: React.FC = () => {
  const { user, directeurUser, activeRole, authReady } = useAuth();

  // Navigation pour visiteur : 'home' ou 'cart'
  const [visitorView, setVisitorView] = useState<'home' | 'cart'>('home');

  // Navigation par onglets supérieurs : 'recherche' (recherche de sujets) ou 'calendrier' (calendrier officiel)
  const [activeSection, setActiveSection] = useState<'recherche' | 'calendrier'>('recherche');

  // Modale d'authentification
  const [authModal, setAuthModal] = useState<{ isOpen: boolean; mode: 'login' | 'register' }>({
    isOpen: false,
    mode: 'login',
  });

  // Modale détails du sujet
  const [subjectDetail, setSubjectDetail] = useState<{
    isOpen: boolean;
    sujet: SujetRecord | null;
  }>({
    isOpen: false,
    sujet: null,
  });

  const handleOpenAuth = (mode: 'login' | 'register') => {
    setAuthModal({ isOpen: true, mode });
  };

  const handleCloseAuth = () => {
    setAuthModal((prev) => ({ ...prev, isOpen: false }));
  };

  const handleViewSubjectDetails = (sujet: SujetRecord) => {
    setSubjectDetail({ isOpen: true, sujet });
  };

  const handleCloseSubjectDetails = () => {
    setSubjectDetail({ isOpen: false, sujet: null });
  };

  if (!authReady) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 gap-3">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-semibold text-slate-500">
          Chargement de GCD Plateforme...
        </p>
      </div>
    );
  }

  // 1. ESPACE DU DIRECTEUR DE THÈSE (Exclusif, 3 onglets, zéro footer)
  if (activeRole === 'directeur' || directeurUser) {
    return <DirecteurDashboard />;
  }

  // 2. ESPACE DU CANDIDAT OU PORTAIL VISITEUR
  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-slate-900 font-sans">
      {/* Header fixe avec les 2 liens officiels : Recherche de sujets & Calendrier */}
      <Header
        onOpenAuth={handleOpenAuth}
        activeSection={activeSection}
        onSelectSection={(sec) => {
          setActiveSection(sec);
          if (visitorView === 'cart') setVisitorView('home');
        }}
      />

      {/* Corps principal : STRICTEMENT séparé entre Visiteur et Candidat */}
      <main className="flex-1">
        {!user ? (
          /* VUE VISITEUR */
          visitorView === 'cart' ? (
            <CartView
              onBackToHome={() => setVisitorView('home')}
              onOpenAuth={handleOpenAuth}
              onViewSubjectDetails={handleViewSubjectDetails}
            />
          ) : activeSection === 'calendrier' ? (
            <CalendrierView onBackToRecherche={() => setActiveSection('recherche')} />
          ) : (
            <HomePage
              onViewSubjectDetails={handleViewSubjectDetails}
              onOpenCart={() => setVisitorView('cart')}
            />
          )
        ) : (
          /* VUE CANDIDAT : Navigation inférieure, zéro footer */
          <CandidateDashboard
            onViewSubjectDetails={handleViewSubjectDetails}
            onOpenAuth={handleOpenAuth}
            activeSection={activeSection}
            onSelectSection={setActiveSection}
          />
        )}
      </main>

      {/* PIED DE PAGE : UNIQUEMENT pour la vue visiteur (JAMAIS pour les espaces privés) */}
      {!user && <Footer />}

      {/* Modale Détails du sujet scientifique (Directeur uniquement sous la description, sans labo) */}
      <SubjectDetailModal
        isOpen={subjectDetail.isOpen}
        sujet={subjectDetail.sujet}
        onClose={handleCloseSubjectDetails}
        onOpenCart={() => {
          if (!user) {
            setVisitorView('cart');
          }
        }}
      />

      {/* Modale Authentification épurée (Double Rôle : Candidat & Directeur de Thèse) */}
      <AuthModal
        isOpen={authModal.isOpen}
        mode={authModal.mode}
        onClose={handleCloseAuth}
        onSwitchMode={(mode) => setAuthModal({ isOpen: true, mode })}
      />
    </div>
  );
};

export function App() {
  return (
    <AppErrorBoundary>
      <AuthProvider>
        <CartProvider>
          <MainAppContent />
        </CartProvider>
      </AuthProvider>
    </AppErrorBoundary>
  );
}

export default App;
