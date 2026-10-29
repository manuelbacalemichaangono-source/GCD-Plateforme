import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import {
  getFirestore,
  doc,
  getDocFromServer,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import firebaseConfig from "../firebase-applet-config.json";
import { ThesisSubject, UserRole } from "./types/cedoc";

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  GET = "get",
  WRITE = "write",
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
    tenantId?: boolean | string | null;
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
  console.error("Firestore Error: ", JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

async function testConnection() {
  try {
    await getDocFromServer(doc(db, "test", "connection"));
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("the client is offline")
    ) {
      console.error("Please check your Firebase configuration.");
    }
  }
}

testConnection();

const sanitizeId = (raw: string) =>
  raw.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 128);

export async function syncFirebaseUserProfile(params: {
  uid: string;
  displayName: string;
  email: string;
  role: UserRole;
  laboratory: string;
  cne?: string;
}) {
  if (!auth.currentUser || !auth.currentUser.emailVerified) return;
  const uid = sanitizeId(params.uid);
  if (params.role !== "candidat") return;

  const userPath = `users/${uid}`;
  try {
    await setDoc(doc(db, "users", uid), {
      uid,
      displayName: params.displayName.slice(0, 120),
      role: "candidat",
      laboratory: "",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, userPath);
  }

  const privatePath = `user_private/${uid}`;
  try {
    await setDoc(doc(db, "user_private", uid), {
      uid,
      email: params.email.slice(0, 160),
      cne: (params.cne || "").slice(0, 40),
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, privatePath);
  }
}

export async function syncPublishedSubjectsIfAdmin(subjects: ThesisSubject[]) {
  if (
    !auth.currentUser ||
    !auth.currentUser.emailVerified ||
    auth.currentUser.email !== "manuelbacale.michaangono@usmba.ac.ma"
  ) {
    return;
  }

  for (const s of subjects) {
    const id = sanitizeId(s.id);
    const path = `sujets/${id}`;
    try {
      await setDoc(doc(db, "sujets", id), {
        code: s.code.slice(0, 32),
        title: s.title.slice(0, 240),
        laboratory: s.laboratory.slice(0, 120),
        discipline: s.discipline.slice(0, 120),
        thesisDirector: s.thesisDirector.slice(0, 120),
        directorUid: sanitizeId(s.directorId),
        language: s.language.slice(0, 60),
        prerequisites: s.prerequisites.slice(0, 500),
        keywords: s.keywords.slice(0, 10).map((k) => k.slice(0, 160)),
        staffViewerEmails: ["scolarite@usmba.ac.ma"],
        status: s.status,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  }
}
