import React, { useState } from 'react';
import { LogOut, Bell, CheckCircle2, Clock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface HeaderProps {
  onOpenAuth: (mode: 'login' | 'register') => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenAuth }) => {
  const { user, profile, logout, candidature } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);

  // Notifications basées sur le statut réel de la candidature
  const notifications = [
    {
      id: 'notif_1',
      title: 'Campagne de candidature 2026/2027',
      time: 'Aujourd’hui',
      read: false,
    },
    ...(candidature && candidature.statut !== 'En dépôt'
      ? [
          {
            id: 'notif_2',
            title: `Statut dossier : ${candidature.statut}`,
            time: 'Récemment',
            read: false,
          },
        ]
      : []),
  ];

  return (
    <header className="desktop-header">
      <div className="desktop-container flex items-center justify-between h-[64px]">
        {/* À gauche : Nom de la plateforme */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
            G
          </div>
          <span className="font-display font-bold text-slate-900 text-base tracking-tight">
            GCD Plateforme
          </span>
        </div>

        {/* À droite : Dépend de l'état connecté ou visiteur */}
        {!user ? (
          <div className="flex items-center gap-3">
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
            {/* Cloche de notifications avec panneau déroulant */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                title="Notifications"
              >
                <Bell className="w-4 h-4" />
                {notifications.some((n) => !n.read) && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-blue-600 ring-2 ring-white" />
                )}
              </button>

              {showNotifications && (
                <div
                  className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-xl shadow-lg z-50 p-3 flex flex-col gap-2"
                  onMouseLeave={() => setShowNotifications(false)}
                >
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <span className="font-semibold text-xs text-slate-800">
                      Notifications
                    </span>
                    <span className="text-[11px] text-blue-600 font-medium">
                      {notifications.length}
                    </span>
                  </div>

                  <div className="flex flex-col gap-2">
                    {notifications.map((n) => (
                      <div
                        key={n.id}
                        className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 flex items-start gap-2.5 text-xs"
                      >
                        <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="font-medium text-slate-800 leading-tight">
                            {n.title}
                          </p>
                          <span className="text-[10px] text-slate-400 mt-1 block">
                            {n.time}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="h-4 w-[1px] bg-slate-200" />

            {/* Identifiant candidat */}
            <span className="text-xs font-semibold text-slate-800">
              {profile.prenom || 'Manuel'} {profile.nom || 'Micha'}
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
        )}
      </div>
    </header>
  );
};

export default Header;
