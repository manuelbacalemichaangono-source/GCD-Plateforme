import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  User,
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

export async function signInWithGooglePopup(): Promise<User> {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  const cred = await signInWithPopup(auth, provider);
  return cred.user;
}

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
 * if `catalog_meta/seeded_v1` does not exist yet, and upgrades existing
 * 27 subject descriptions in Firestore to the 50–70 word format via `seeded_v3`.
 */
export async function ensureInitialCatalogSeeded(): Promise<void> {
  if (!auth.currentUser || seedingInFlight) return;
  seedingInFlight = true;
  try {
    const metaRefV1 = doc(db, 'catalog_meta', 'seeded_v1');
    const metaRefV2 = doc(db, 'catalog_meta', 'seeded_v2');
    const metaRefV3 = doc(db, 'catalog_meta', 'seeded_v3');
    const [metaSnapV1, metaSnapV3] = await Promise.all([
      getDoc(metaRefV1),
      getDoc(metaRefV3),
    ]);

    const now = serverTimestamp();

    if (!metaSnapV1.exists()) {
      const batch = writeBatch(db);

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

      const markerData = {
        seeded: true,
        seededBy: auth.currentUser.uid,
        createdAt: now,
      };
      batch.set(metaRefV1, markerData);
      batch.set(metaRefV2, markerData);
      batch.set(metaRefV3, markerData);

      await batch.commit();
    } else if (!metaSnapV3.exists()) {
      const batch = writeBatch(db);
      for (const sujet of INITIAL_SUJETS) {
        batch.update(doc(db, 'sujets', sujet.id), {
          description: sujet.description,
          updatedAt: now,
        });
      }
      batch.set(metaRefV3, {
        seeded: true,
        seededBy: auth.currentUser.uid,
        createdAt: now,
      });
      await batch.commit();
    }
  } catch {
    // Ignore race if another session already committed
  } finally {
    seedingInFlight = false;
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
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return 'Fenêtre de connexion fermée.';
    case 'auth/popup-blocked':
      return 'Autorisez les fenêtres pop-up pour continuer avec Google.';
    case 'auth/unauthorized-domain':
      return 'Domaine d’exécution en cours d’autorisation. Réessayez ou utilisez un compte candidat.';
    case 'auth/operation-not-allowed':
      return 'Le fournisseur d’authentification n’est pas activé.';
    default:
      return 'Une erreur est survenue lors de l’authentification.';
  }
}
