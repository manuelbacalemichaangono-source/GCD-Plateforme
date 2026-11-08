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

export function detectFileType(fileName: string, mimeType?: string): 'PDF' | 'Image' | 'Vidéo' | 'Fichier' {
  const ext = fileName.toLowerCase().split('.').pop() || '';
  if (ext === 'pdf' || mimeType?.includes('pdf')) return 'PDF';
  if (['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext) || mimeType?.startsWith('image/')) return 'Image';
  if (['mp4', 'mov', 'avi', 'webm', 'mkv'].includes(ext) || mimeType?.startsWith('video/')) return 'Vidéo';
  return 'Fichier';
}

export function validateCandidateFile(file: File): string | null {
  const extLower = file.name.toLowerCase();
  const validExt =
    extLower.endsWith('.pdf') ||
    extLower.endsWith('.jpg') ||
    extLower.endsWith('.jpeg') ||
    extLower.endsWith('.png') ||
    extLower.endsWith('.webp') ||
    extLower.endsWith('.mp4') ||
    extLower.endsWith('.webm') ||
    extLower.endsWith('.mov');

  const allowed = ALLOWED_MIME_TYPES as readonly string[];
  if (!allowed.includes(file.type) && !validExt) {
    return 'Format PDF, Image (JPG, PNG) ou Vidéo (MP4) uniquement.';
  }
  if (file.size <= 0 || file.size > MAX_FILE_SIZE_BYTES) {
    return 'Taille maximale autorisée : 10 Mo.';
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
      : safeFileName.toLowerCase().endsWith('.mp4')
      ? 'video/mp4'
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
