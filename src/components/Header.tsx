import React, { useState } from 'react';
import { LogOut, Bell, CheckCircle2, AlertCircle, Info } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface HeaderProps {
  onOpenAuth: (mode: 'login' | 'register') => void;
  activeSection?: 'recherche' | 'calendrier' | 'resultats';
  onSelectSection?: (section: 'recherche' | 'calendrier' | 'resultats') => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenAuth,
  activeSection = 'recherche',
  onSelectSection,
}) => {
  const { user, profile, logout, candidateNotifications, markNotificationRead } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);

  const hasUnread = candidateNotifications.some((n) => !n.read);

  return (
    <header className="desktop-header">
      <div className="desktop-container flex items-center justify-between h-[64px]">
        {/* À gauche : Nom de la plateforme selon maquette officielle */}
        <div
          onClick={() => onSelectSection && onSelectSection('recherche')}
          className="flex items-center gap-2.5 cursor-pointer"
        >
          <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
            G
          </div>
          <span className="font-display font-bold text-slate-900 text-base sm:text-lg tracking-tight">
            Portail des Études Doctorales
          </span>
        </div>

        {/* Au centre : menubar épuré, les liens de navigation visiteur sont déplacés dans le header du body */}

        {/* À droite : Dépend de l'état connecté ou visiteur */}
        {!user ? (
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => onOpenAuth('login')}
              className="btn-secondary h-[36px] text-xs font-semibold px-3.5"
            >
              Se connecter
            </button>
            <button
              type="button"
              onClick={() => onOpenAuth('register')}
              className="btn-primary h-[36px] text-xs font-semibold px-3.5"
            >
              S&apos;inscrire
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-4">
            <span className="text-xs font-semibold text-slate-700 hidden sm:inline">
              {profile.prenom} {profile.nom}
            </span>

            {/* Cloche de notifications avec panneau déroulant */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                title="Notifications"
              >
                <Bell className="w-4 h-4" />
                {hasUnread && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-blue-600 ring-2 ring-white" />
                )}
              </button>

              {showNotifications && (
                <div
                  className="absolute right-0 mt-2 w-84 bg-white border border-slate-200 rounded-xl shadow-lg z-50 p-3 flex flex-col gap-2"
                  onMouseLeave={() => setShowNotifications(false)}
                >
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <span className="font-semibold text-xs text-slate-800">
                      Notifications ({candidateNotifications.length})
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowNotifications(false)}
                      className="text-slate-400 hover:text-slate-600 text-xs"
                    >
                      Fermer
                    </button>
                  </div>

                  <div className="flex flex-col gap-2 max-h-72 overflow-y-auto">
                    {candidateNotifications.length === 0 ? (
                      <p className="py-3 text-center text-xs text-slate-400">
                        Aucune notification.
                      </p>
                    ) : (
                      candidateNotifications.map((n) => (
                        <div
                          key={n.id}
                          onClick={() => markNotificationRead(n.id)}
                          className={`p-2.5 rounded-lg border text-xs cursor-pointer transition-colors flex items-start gap-2.5 ${
                            n.type === 'success'
                              ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                              : n.type === 'danger'
                              ? 'bg-red-50/70 border-red-200 text-red-900'
                              : 'bg-slate-50 border-slate-100 text-slate-800'
                          }`}
                        >
                          {n.type === 'success' ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                          ) : n.type === 'danger' ? (
                            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                          ) : (
                            <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                          )}

                          <div className="flex-1 min-w-0">
                            <p className="font-bold leading-snug">
                              {n.title}
                            </p>
                            {n.detail && (
                              <p className="text-[11px] mt-0.5 leading-relaxed opacity-90">
                                {n.detail}
                              </p>
                            )}
                            <span className="text-[10px] text-slate-400 mt-1 block">
                              {n.date}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="h-4 w-[1px] bg-slate-200" />

            <button
              type="button"
              onClick={logout}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-red-600 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Se déconnecter</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
