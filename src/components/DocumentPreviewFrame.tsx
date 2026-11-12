import React, { useEffect, useState } from 'react';
import { FileText } from 'lucide-react';

interface DocumentPreviewFrameProps {
  fileName: string;
  mimeType?: string;
  type?: string;
  url?: string;
}

export const DocumentPreviewFrame: React.FC<DocumentPreviewFrameProps> = ({
  fileName,
  mimeType,
  type,
  url,
}) => {
  const [resolvedUrl, setResolvedUrl] = useState<string>('');

  const lowerName = fileName.toLowerCase();
  const isImage =
    type === 'Image' ||
    mimeType?.startsWith('image/') ||
    lowerName.endsWith('.jpg') ||
    lowerName.endsWith('.jpeg') ||
    lowerName.endsWith('.png') ||
    lowerName.endsWith('.webp') ||
    lowerName.endsWith('.gif');

  const isPdf =
    type === 'PDF' ||
    mimeType?.includes('pdf') ||
    lowerName.endsWith('.pdf');

  const isVideo =
    type === 'Vidéo' ||
    mimeType?.startsWith('video/') ||
    lowerName.endsWith('.mp4') ||
    lowerName.endsWith('.webm') ||
    lowerName.endsWith('.mov');

  useEffect(() => {
    if (!url) {
      setResolvedUrl('');
      return;
    }

    // Convert base64 PDF data URLs into Blob URLs so browsers render PDFs reliably inside <iframe>
    if (isPdf && url.startsWith('data:application/pdf;base64,')) {
      try {
        const base64 = url.split(',')[1] || '';
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: 'application/pdf' });
        const objectUrl = URL.createObjectURL(blob);
        setResolvedUrl(objectUrl);
        return () => {
          URL.revokeObjectURL(objectUrl);
        };
      } catch {
        setResolvedUrl(url);
        return;
      }
    }

    setResolvedUrl(url);
  }, [url, isPdf]);

  if (!resolvedUrl) {
    return (
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 flex flex-col items-center justify-center min-h-[300px] text-center gap-2">
        <FileText className="w-8 h-8 text-slate-300" />
        <span className="text-xs font-medium text-slate-500">
          Aucun fichier disponible pour la prévisualisation.
        </span>
      </div>
    );
  }

  if (isImage) {
    return (
      <div className="bg-slate-100 border border-slate-200 rounded-xl p-3 flex items-center justify-center min-h-[300px] max-h-[70vh] overflow-auto">
        <img
          src={resolvedUrl}
          alt={fileName}
          className="max-h-[66vh] w-auto max-w-full object-contain rounded-lg shadow-xs bg-white"
        />
      </div>
    );
  }

  if (isPdf) {
    return (
      <div className="bg-slate-100 border border-slate-200 rounded-xl overflow-hidden h-[68vh] min-h-[380px]">
        <iframe
          src={`${resolvedUrl}#toolbar=0&navpanes=0&view=FitH`}
          title={fileName}
          className="w-full h-full border-0 bg-white"
        />
      </div>
    );
  }

  if (isVideo) {
    return (
      <div className="bg-slate-900 border border-slate-200 rounded-xl overflow-hidden flex items-center justify-center max-h-[68vh]">
        <video
          src={resolvedUrl}
          controls
          className="max-h-[68vh] w-full"
        />
      </div>
    );
  }

  return (
    <div className="bg-slate-100 border border-slate-200 rounded-xl overflow-hidden h-[68vh] min-h-[360px]">
      <iframe
        src={resolvedUrl}
        title={fileName}
        className="w-full h-full border-0 bg-white"
      />
    </div>
  );
};
