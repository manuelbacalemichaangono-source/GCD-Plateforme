import { initializeApp, getApps, deleteApp } from 'firebase/app';
import {
  getAuth,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDocFromServer,
  getDoc,
  writeBatch,
  serverTimestamp,
} from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import firebaseConfig from '../firebase-applet-config.json';
import { INITIAL_LABORATOIRES, INITIAL_SUJETS } from './data/initialCatalog';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const storage = getStorage(app);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export async function testConnection(): Promise<void> {
  try {
    await getDocFromServer(doc(db, 'catalog_meta', 'seeded_v1'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}

testConnection();

let seedingInFlight = false;

/**
 * Seeds the 5 laboratories and 27 published subjects ONCE into Firestore
 * if `catalog_meta/seeded_v1` does not exist yet and a user is authenticated.
 */
export async function ensureInitialCatalogSeeded(): Promise<void> {
  if (!auth.currentUser || seedingInFlight) return;
  seedingInFlight = true;
  try {
    const metaRef = doc(db, 'catalog_meta', 'seeded_v1');
    const metaSnap = await getDoc(metaRef);
    if (metaSnap.exists()) return;

    const batch = writeBatch(db);
    const now = serverTimestamp();

    for (const lab of INITIAL_LABORATOIRES) {
      batch.set(doc(db, 'laboratoires', lab.id), {
        code: lab.code,
        nom: lab.nom,
        directeurs: lab.directeurs,
        disciplines: lab.disciplines,
        createdAt: now,
      });
    }

    for (const sujet of INITIAL_SUJETS) {
      batch.set(doc(db, 'sujets', sujet.id), {
        intitule: sujet.intitule,
        description: sujet.description,
        discipline: sujet.discipline,
        directeur: sujet.directeur,
        directeurEmail: sujet.directeurEmail,
        laboratoire: sujet.laboratoire,
        statut: 'Publié',
        createdAt: now,
        updatedAt: now,
      });
    }

    batch.set(metaRef, {
      seeded: true,
      seededBy: auth.currentUser.uid,
      createdAt: now,
    });

    await batch.commit();
  } catch {
    // Ignore race if another session already committed `seeded_v1`
  } finally {
    seedingInFlight = false;
  }
}

/**
 * Creates a Firebase Auth account for a newly added staff email using a secondary
 * Firebase App instance (preserving the current Directeur du CEDoc session) and sends
 * a password-reset email so the staff member sets their own password.
 */
export async function provisionPersonnelAuthAccount(emailLower: string): Promise<void> {
  const secondaryName = `cedoc_prov_${Date.now()}`;
  const existingSecondary = getApps().find((a) => a.name === secondaryName);
  const secondaryApp = existingSecondary ?? initializeApp(firebaseConfig, secondaryName);
  const secondaryAuth = getAuth(secondaryApp);

  try {
    const randomInitialSecret = `Cedoc!${Math.random().toString(36).slice(2, 10)}9A#`;
    try {
      await createUserWithEmailAndPassword(secondaryAuth, emailLower, randomInitialSecret);
      await signOut(secondaryAuth);
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      if (code && code !== 'auth/email-already-in-use') {
        throw err;
      }
    }
    await sendPasswordResetEmail(auth, emailLower);
  } finally {
    await deleteApp(secondaryApp).catch(() => {});
  }
}

export function translateFirebaseAuthError(error: unknown): string {
  const code = (error as { code?: string })?.code ?? '';
  switch (code) {
    case 'auth/invalid-email':
      return 'Adresse email invalide.';
    case 'auth/user-disabled':
      return 'Ce compte a été désactivé.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Email ou mot de passe incorrect.';
    case 'auth/email-already-in-use':
      return 'Cet email possède déjà un compte.';
    case 'auth/weak-password':
      return 'Mot de passe trop court (6 caractères minimum).';
    case 'auth/too-many-requests':
      return 'Trop de tentatives. Réessayez plus tard.';
    case 'auth/operation-not-allowed':
      return 'Activez Email/Mot de passe dans Firebase Console > Authentication.';
    default:
      return 'Une erreur est survenue.';
  }
}
