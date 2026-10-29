import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import {
  auth,
  googleProvider,
  syncFirebaseUserProfile,
} from "../firebase";
import { AuthenticatedUser } from "../types/cedoc";

const TOKEN_STORAGE_KEY = "gcd_session_token";

export interface PendingVerificationState {
  email: string;
  mode: "firebase" | "server";
  verificationToken?: string;
}

interface RegisterCandidatPayload {
  fullName: string;
  email: string;
  password: string;
  subjectId: string;
  cne?: string;
  originInstitution?: string;
}

interface AuthContextValue {
  user: AuthenticatedUser | null;
  token: string | null;
  loading: boolean;
  pendingVerification: PendingVerificationState | null;
  clearPendingVerification: () => void;
  login: (identifier: string, password: string) => Promise<AuthenticatedUser>;
  loginWithGoogle: (opts?: {
    subjectId?: string;
    cne?: string;
    originInstitution?: string;
  }) => Promise<AuthenticatedUser>;
  registerCandidat: (
    payload: RegisterCandidatPayload
  ) => Promise<{ verified: boolean; user?: AuthenticatedUser }>;
  confirmEmailVerification: () => Promise<AuthenticatedUser>;
  resendVerificationEmail: () => Promise<void>;
  logout: () => Promise<void>;
  apiFetch: <T = any>(url: string, init?: RequestInit) => Promise<T>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem(TOKEN_STORAGE_KEY)
  );
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [pendingVerification, setPendingVerification] =
    useState<PendingVerificationState | null>(null);

  const persistSession = (newToken: string, newUser: AuthenticatedUser) => {
    localStorage.setItem(TOKEN_STORAGE_KEY, newToken);
    setToken(newToken);
    setUser(newUser);
    setPendingVerification(null);
  };

  const clearSession = () => {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    setToken(null);
    setUser(null);
  };

  useEffect(() => {
    let active = true;
    const restore = async () => {
      const saved = localStorage.getItem(TOKEN_STORAGE_KEY);
      if (!saved) {
        if (active) setLoading(false);
        return;
      }
      try {
        const resp = await fetch("/api/auth/me", {
          headers: { Authorization: `Bearer ${saved}` },
        });
        if (!resp.ok) {
          clearSession();
        } else {
          const data = await resp.json();
          if (active) setUser(data.user);
        }
      } catch {
        clearSession();
      } finally {
        if (active) setLoading(false);
      }
    };
    restore();
    return () => {
      active = false;
    };
  }, []);

  const apiFetch = useCallback(
    async <T = any,>(url: string, init?: RequestInit): Promise<T> => {
      const headers = new Headers(init?.headers || {});
      if (!headers.has("Content-Type") && init?.body) {
        headers.set("Content-Type", "application/json");
      }
      const activeToken = token || localStorage.getItem(TOKEN_STORAGE_KEY);
      if (activeToken) {
        headers.set("Authorization", `Bearer ${activeToken}`);
      }
      const resp = await fetch(url, { ...init, headers });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        if (resp.status === 401) {
          clearSession();
        }
        throw new Error(data?.error || "Une erreur est survenue.");
      }
      return data as T;
    },
    [token]
  );

  const login = async (
    identifier: string,
    password: string
  ): Promise<AuthenticatedUser> => {
    const trimmed = identifier.trim();

    // Tentative Firebase Auth si l'identifiant est un e-mail et le fournisseur est actif
    if (trimmed.includes("@")) {
      try {
        const cred = await signInWithEmailAndPassword(auth, trimmed, password);
        if (!cred.user.emailVerified) {
          setPendingVerification({
            email: trimmed.toLowerCase(),
            mode: "firebase",
          });
          throw new Error(
            "Veuillez vérifier votre adresse e-mail avant de vous connecter."
          );
        }
        const idToken = await cred.user.getIdToken();
        const fbResp = await fetch("/api/auth/firebase-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken }),
        });
        if (fbResp.ok) {
          const fbData = await fbResp.json();
          persistSession(fbData.token, fbData.user);
          await syncFirebaseUserProfile({
            uid: cred.user.uid,
            displayName: fbData.user.fullName,
            email: fbData.user.email,
            role: fbData.user.role,
            laboratory: fbData.user.laboratory,
          }).catch(() => {});
          return fbData.user;
        }
      } catch (err: any) {
        if (
          err?.message ===
          "Veuillez vérifier votre adresse e-mail avant de vous connecter."
        ) {
          throw err;
        }
        // Si le compte institutionnel pré-créé est géré côté serveur ou si Email/Password n'est pas encore activé dans la console Firebase, on vérifie via l'annuaire serveur sécurisé
      }
    }

    const resp = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier: trimmed, password }),
    });
    const data = await resp.json();

    if (!resp.ok) {
      if (data?.code === "EMAIL_NOT_VERIFIED") {
        setPendingVerification({
          email: data.email,
          mode: "server",
          verificationToken: data.verificationToken,
        });
      }
      throw new Error(data?.error || "Identifiants incorrects.");
    }

    persistSession(data.token, data.user);
    return data.user;
  };

  const loginWithGoogle = async (opts?: {
    subjectId?: string;
    cne?: string;
    originInstitution?: string;
  }): Promise<AuthenticatedUser> => {
    const cred = await signInWithPopup(auth, googleProvider);
    const idToken = await cred.user.getIdToken(true);

    const resp = await fetch("/api/auth/firebase-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        idToken,
        subjectId: opts?.subjectId || "",
        cne: opts?.cne || "",
        originInstitution: opts?.originInstitution || "",
      }),
    });
    const data = await resp.json();
    if (!resp.ok) {
      await signOut(auth).catch(() => {});
      throw new Error(data?.error || "Impossible d'ouvrir la session.");
    }

    persistSession(data.token, data.user);
    await syncFirebaseUserProfile({
      uid: cred.user.uid,
      displayName: data.user.fullName,
      email: data.user.email,
      role: data.user.role,
      laboratory: data.user.laboratory,
      cne: opts?.cne,
    }).catch(() => {});

    return data.user;
  };

  const registerCandidat = async (
    payload: RegisterCandidatPayload
  ): Promise<{ verified: boolean; user?: AuthenticatedUser }> => {
    let usedFirebaseEmailAuth = false;

    try {
      const cred = await createUserWithEmailAndPassword(
        auth,
        payload.email.trim(),
        payload.password
      );
      await sendEmailVerification(cred.user);
      usedFirebaseEmailAuth = true;
    } catch (err: any) {
      const code = String(err?.code || "");
      if (code === "auth/email-already-in-use") {
        throw new Error("Un compte existe déjà avec cette adresse e-mail.");
      }
      if (code === "auth/weak-password") {
        throw new Error("Le mot de passe doit contenir au moins 6 caractères.");
      }
      // Si auth/operation-not-allowed (fournisseur non activé dans la console Firebase), l'inscription passe par le serveur avec confirmation d'e-mail
    }

    const resp = await fetch("/api/auth/register-candidat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...payload,
        firebaseVerified: false,
      }),
    });
    const data = await resp.json();
    if (!resp.ok) {
      throw new Error(data?.error || "Erreur lors de la création du compte.");
    }

    setPendingVerification({
      email: payload.email.trim().toLowerCase(),
      mode: usedFirebaseEmailAuth ? "firebase" : "server",
      verificationToken: data.verificationToken,
    });

    return { verified: false };
  };

  const confirmEmailVerification = async (): Promise<AuthenticatedUser> => {
    if (!pendingVerification) {
      throw new Error("Aucune vérification en attente.");
    }

    if (pendingVerification.mode === "firebase" && auth.currentUser) {
      await auth.currentUser.reload();
      if (!auth.currentUser.emailVerified) {
        throw new Error(
          "Adresse e-mail non encore confirmée. Cliquez sur le lien reçu par e-mail puis réessayez."
        );
      }
      const resp = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: pendingVerification.email,
          firebaseConfirmed: true,
        }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data?.error || "Vérification impossible.");
      }
      persistSession(data.token, data.user);
      await syncFirebaseUserProfile({
        uid: auth.currentUser.uid,
        displayName: data.user.fullName,
        email: data.user.email,
        role: data.user.role,
        laboratory: data.user.laboratory,
      }).catch(() => {});
      return data.user;
    }

    const resp = await fetch("/api/auth/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: pendingVerification.email,
        verificationToken: pendingVerification.verificationToken,
      }),
    });
    const data = await resp.json();
    if (!resp.ok) {
      throw new Error(data?.error || "Vérification impossible.");
    }
    persistSession(data.token, data.user);
    return data.user;
  };

  const resendVerificationEmail = async () => {
    if (pendingVerification?.mode === "firebase" && auth.currentUser) {
      await sendEmailVerification(auth.currentUser);
    }
  };

  const logout = async () => {
    const activeToken = token || localStorage.getItem(TOKEN_STORAGE_KEY);
    if (activeToken) {
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: { Authorization: `Bearer ${activeToken}` },
      }).catch(() => {});
    }
    await signOut(auth).catch(() => {});
    clearSession();
    setPendingVerification(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        pendingVerification,
        clearPendingVerification: () => setPendingVerification(null),
        login,
        loginWithGoogle,
        registerCandidat,
        confirmEmailVerification,
        resendVerificationEmail,
        logout,
        apiFetch,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return ctx;
}
