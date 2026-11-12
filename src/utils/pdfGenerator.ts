import { InscriptionRecord } from '../types/cedoc';

/**
 * Encode a UTF-8 string into PDF octal escapes using WinAnsiEncoding
 * so French accents (é, è, ê, à, ç, ô, î, ù, °, etc.) render cleanly.
 */
function toPdfWinAnsiLiteral(text: string): string {
  const normalized = text
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/·/g, '-');

  let out = '(';
  for (let i = 0; i < normalized.length; i++) {
    const code = normalized.charCodeAt(i);
    if (code === 40 || code === 41 || code === 92) {
      out += '\\' + normalized[i];
    } else if (code >= 32 && code <= 126) {
      out += normalized[i];
    } else if (code >= 160 && code <= 255) {
      out += '\\' + code.toString(8).padStart(3, '0');
    } else {
      out += ' ';
    }
  }
  out += ')';
  return out;
}

function wrapText(text: string, maxChars: number): string[] {
  const words = text.trim().split(/\s+/);
  const lines: string[] = [];
  let current = '';
  for (const w of words) {
    if (!current) {
      current = w;
    } else if (current.length + 1 + w.length <= maxChars) {
      current += ' ' + w;
    } else {
      lines.push(current);
      current = w;
    }
  }
  if (current) lines.push(current);
  return lines.length > 0 ? lines : [''];
}

/**
 * Generates a real binary PDF (1.4) Blob for the official doctoral enrollment receipt.
 */
export function buildInscriptionReceiptPdfBlob(inscription: InscriptionRecord): Blob {
  const cmds: string[] = [];

  const drawText = (
    x: number,
    y: number,
    text: string,
    size = 10,
    font: 'F1' | 'F2' = 'F1',
    rgb: [number, number, number] = [0.06, 0.09, 0.16]
  ) => {
    cmds.push('BT');
    cmds.push(`/${font} ${size} Tf`);
    cmds.push(`${rgb[0].toFixed(3)} ${rgb[1].toFixed(3)} ${rgb[2].toFixed(3)} rg`);
    cmds.push(`1 0 0 1 ${x} ${y} Tm`);
    cmds.push(`${toPdfWinAnsiLiteral(text)} Tj`);
    cmds.push('ET');
  };

  const drawRect = (
    x: number,
    y: number,
    w: number,
    h: number,
    fill?: [number, number, number],
    stroke?: [number, number, number],
    lineWidth = 0.8
  ) => {
    cmds.push(`${lineWidth} w`);
    if (fill) {
      cmds.push(`${fill[0].toFixed(3)} ${fill[1].toFixed(3)} ${fill[2].toFixed(3)} rg`);
    }
    if (stroke) {
      cmds.push(`${stroke[0].toFixed(3)} ${stroke[1].toFixed(3)} ${stroke[2].toFixed(3)} RG`);
    }
    cmds.push(`${x} ${y} ${w} ${h} re`);
    if (fill && stroke) cmds.push('B');
    else if (fill) cmds.push('f');
    else if (stroke) cmds.push('S');
  };

  const drawLine = (x1: number, y1: number, x2: number, y2: number, rgb: [number, number, number], w = 1) => {
    cmds.push(`${w} w`);
    cmds.push(`${rgb[0].toFixed(3)} ${rgb[1].toFixed(3)} ${rgb[2].toFixed(3)} RG`);
    cmds.push(`${x1} ${y1} m ${x2} ${y2} l S`);
  };

  // A4: 595 x 842 pt
  // Outer border
  drawRect(28, 28, 539, 786, undefined, [0.85, 0.89, 0.94], 1);

  // Header band
  drawRect(42, 725, 511, 74, [0.96, 0.98, 1], [0.15, 0.39, 0.92], 1);
  drawText(56, 780, 'ROYAUME DU MAROC - UNIVERSITE SIDI MOHAMED BEN ABDELLAH DE FES', 9, 'F2', [0.28, 0.33, 0.41]);
  drawText(56, 764, "ECOLE SUPERIEURE DE TECHNOLOGIE DE FES (EST FES)", 11, 'F2', [0.12, 0.25, 0.69]);
  drawText(56, 748, "Centre d'Etudes Doctorales (CEDoc) - Sciences et Techniques", 9.5, 'F1', [0.20, 0.25, 0.33]);
  drawText(56, 733, "Annee universitaire 2026 / 2027", 9, 'F2', [0.15, 0.39, 0.92]);

  // Title
  drawText(56, 696, "RECU OFFICIEL D'INSCRIPTION AU CYCLE DOCTORAL", 14, 'F2', [0.06, 0.09, 0.16]);
  drawLine(56, 687, 539, 687, [0.15, 0.39, 0.92], 1.5);

  const receiptNum = inscription.receiptNumber || `REC-INSC-2026-${inscription.cne}`;
  const dossierNum = inscription.numeroDossier || `DOC-CEDOC-2026-${inscription.cne}`;
  const dateValidation = inscription.dateEnvoiRecu || inscription.dateValidationDirecteur || new Date().toLocaleDateString('fr-FR');
  const visaToken = inscription.signatureElectroniqueToken || 'VISA-CEDOC-ESTFES-2026';

  drawText(56, 668, `Numero de recu : ${receiptNum}`, 10, 'F2', [0.15, 0.39, 0.92]);
  drawText(330, 668, `Dossier doctoral : ${dossierNum}`, 10, 'F2', [0.20, 0.25, 0.33]);

  // Box 1: Informations du doctorant
  drawRect(42, 520, 511, 132, [0.98, 0.99, 1], [0.80, 0.84, 0.88], 0.8);
  drawRect(42, 628, 511, 24, [0.93, 0.95, 0.98], [0.80, 0.84, 0.88], 0.8);
  drawText(54, 636, "1. IDENTITE DU CANDIDAT INSCRIT", 10, 'F2', [0.12, 0.25, 0.69]);

  drawText(54, 608, "Nom et Prenom :", 9.5, 'F2');
  drawText(210, 608, `${inscription.candidatPrenom} ${inscription.candidatNom}`, 10, 'F2');

  drawText(54, 588, "Code CNE / Massar :", 9.5, 'F2');
  drawText(210, 588, inscription.cne, 10, 'F2', [0.12, 0.25, 0.69]);

  drawText(54, 568, "Courriel :", 9.5, 'F2');
  drawText(210, 568, inscription.candidatEmail, 9.5, 'F1');

  drawText(54, 548, "Universite d'origine :", 9.5, 'F2');
  drawText(210, 548, inscription.universiteOrigine, 9.5, 'F1');

  drawText(54, 529, "Diplome d'acces :", 9.5, 'F2');
  drawText(
    210,
    529,
    `${inscription.diplomeMaster || 'Master / Diplome d\'Ingenieur'} (${inscription.anneeObtention || '2026'})`,
    9.5,
    'F1'
  );

  // Box 2: Inscription a l'EST Fes
  drawRect(42, 342, 511, 162, [0.98, 0.99, 1], [0.80, 0.84, 0.88], 0.8);
  drawRect(42, 480, 511, 24, [0.93, 0.95, 0.98], [0.80, 0.84, 0.88], 0.8);
  drawText(54, 488, "2. INSCRIPTION ADMINISTRATIVE A L'EST FES", 10, 'F2', [0.12, 0.25, 0.69]);

  drawText(54, 460, "Etablissement d'accueil :", 9.5, 'F2');
  drawText(210, 460, "Ecole Superieure de Technologie de Fes (EST Fes - USMBA)", 9.5, 'F1');

  drawText(54, 440, "Filiere / Discipline :", 9.5, 'F2');
  drawText(210, 440, inscription.discipline || 'Doctorat Sciences et Techniques', 9.5, 'F2');

  drawText(54, 420, "Directeur de these :", 9.5, 'F2');
  drawText(210, 420, inscription.directeurNom, 9.5, 'F2');

  drawText(54, 400, "Sujet de these :", 9.5, 'F2');
  const sujetLines = wrapText(inscription.sujetIntitule, 58).slice(0, 3);
  sujetLines.forEach((line, idx) => {
    drawText(210, 400 - idx * 14, line, 9.5, 'F1');
  });

  drawText(54, 353, "Statut administratif :", 9.5, 'F2');
  drawText(210, 353, "INSCRIT AU CYCLE DOCTORAL (SESSION 2026/2027)", 9.5, 'F2', [0.02, 0.47, 0.34]);

  // Box 3: Validation & Visa
  drawRect(42, 200, 511, 126, [1, 1, 1], [0.80, 0.84, 0.88], 0.8);
  drawRect(42, 302, 511, 24, [0.93, 0.98, 0.96], [0.65, 0.95, 0.82], 0.8);
  drawText(54, 310, "3. CERTIFICATION ET VISA OFFICIEL DU CEDOC", 10, 'F2', [0.02, 0.37, 0.27]);

  drawText(54, 280, "Date de delivrance :", 9.5, 'F2');
  drawText(210, 280, dateValidation, 9.5, 'F1');

  drawText(54, 260, "Validation Directeur de these :", 9.5, 'F2');
  drawText(210, 260, `${inscription.directeurNom} (Approuvee)`, 9.5, 'F1');

  drawText(54, 240, "Validation Direction CEDoc :", 9.5, 'F2');
  drawText(210, 240, "Pr. Mohammed Amine Bennani - Directeur du CEDoc EST Fes", 9.5, 'F1');

  drawText(54, 215, `Signature electronique : ${visaToken}`, 8.5, 'F1', [0.39, 0.45, 0.55]);

  // Stamp box bottom right
  drawRect(340, 82, 200, 92, [0.98, 0.99, 1], [0.15, 0.39, 0.92], 1);
  drawText(355, 152, "CACHET ET VISA", 9.5, 'F2', [0.12, 0.25, 0.69]);
  drawText(355, 134, "Direction du CEDoc - EST Fes", 9, 'F2');
  drawText(355, 118, "Universite Sidi Mohamed", 8.5, 'F1', [0.28, 0.33, 0.41]);
  drawText(355, 106, "Ben Abdellah - Fes", 8.5, 'F1', [0.28, 0.33, 0.41]);
  drawText(355, 91, `Ref : ${receiptNum}`, 8, 'F2', [0.02, 0.47, 0.34]);

  drawText(42, 95, "Document officiel genere par la plateforme GCD - CEDoc EST Fes.", 8.5, 'F1', [0.39, 0.45, 0.55]);
  drawText(42, 82, "Ce recu atteste l'inscription administrative definitive du doctorant.", 8.5, 'F1', [0.39, 0.45, 0.55]);

  const streamContent = cmds.join('\n');

  const objects: string[] = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> >>\nendobj\n',
    `4 0 obj\n<< /Length ${streamContent.length} >>\nstream\n${streamContent}\nendstream\nendobj\n`,
    '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>\nendobj\n',
    '6 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>\nendobj\n',
  ];

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [0];
  for (const obj of objects) {
    offsets.push(pdf.length);
    pdf += obj;
  }
  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  for (let i = 1; i <= objects.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return new Blob([pdf], { type: 'application/pdf' });
}

export function downloadInscriptionReceiptPdf(inscription: InscriptionRecord): void {
  const blob = buildInscriptionReceiptPdfBlob(inscription);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const safeName = `${inscription.candidatPrenom}_${inscription.candidatNom}`
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/_+/g, '_');
  link.href = url;
  link.download = `Recu_Inscription_CEDoc_EST_Fes_${safeName}_${inscription.cne}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
