import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase';
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE_BYTES } from '../config/constants';

export interface ValidatedUploadResult {
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  storagePath: string;
  downloadUrl: string;
}

export function validateCandidateFile(file: File): string | null {
  const allowed = ALLOWED_MIME_TYPES as readonly string[];
  const extLower = file.name.toLowerCase();
  const validExt =
    extLower.endsWith('.pdf') ||
    extLower.endsWith('.jpg') ||
    extLower.endsWith('.jpeg') ||
    extLower.endsWith('.png');

  if (!allowed.includes(file.type) && !validExt) {
    return 'Format PDF, JPG ou PNG uniquement.';
  }
  if (file.size <= 0 || file.size > MAX_FILE_SIZE_BYTES) {
    return 'Taille maximale autorisée : 5 Mo.';
  }
  return null;
}

export async function uploadDossierFile(
  rootFolder: 'candidatures' | 'reinscriptions',
  ownerUid: string,
  slotId: string,
  file: File
): Promise<ValidatedUploadResult> {
  const safeFileName = file.name.replace(/[^a-zA-Z0-9._\-]/g, '_').slice(0, 140) || 'document.pdf';
  const resolvedMime =
    file.type && (ALLOWED_MIME_TYPES as readonly string[]).includes(file.type)
      ? file.type
      : safeFileName.toLowerCase().endsWith('.png')
      ? 'image/png'
      : safeFileName.toLowerCase().endsWith('.jpg') || safeFileName.toLowerCase().endsWith('.jpeg')
      ? 'image/jpeg'
      : 'application/pdf';

  const storagePath = `${rootFolder}/${ownerUid}/${slotId}/${safeFileName}`;
  let downloadUrl = '';

  try {
    const storageRef = ref(storage, storagePath);
    const uploadTask = uploadBytes(storageRef, file, { contentType: resolvedMime });
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('storage_timeout')), 8000)
    );
    await Promise.race([uploadTask, timeoutPromise]);
    downloadUrl = await getDownloadURL(storageRef);
  } catch {
    // Graceful fallback if Firebase Storage bucket is not yet initialized in console
    downloadUrl = '';
  }

  return {
    fileName: file.name.slice(0, 180),
    mimeType: resolvedMime,
    sizeBytes: file.size,
    storagePath,
    downloadUrl: downloadUrl.slice(0, 1000),
  };
}
