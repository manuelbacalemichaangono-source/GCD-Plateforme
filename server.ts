import dotenv from 'dotenv';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '8mb' }));

  app.post('/api/verify-document', async (req, res) => {
    try {
      const { label, fileName, mimeType, downloadUrl, candidatNom, sourceAuto } = req.body ?? {};

      if (sourceAuto === true) {
        res.json({
          status: 'Conforme',
          motif: 'Pièce récupérée automatiquement auprès du système académique.',
        });
        return;
      }

      const ai = getGeminiClient();
      if (!ai) {
        res.json({
          status: 'Douteux',
          motif: 'Vérification manuelle requise.',
        });
        return;
      }

      const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];

      if (typeof downloadUrl === 'string' && downloadUrl.startsWith('https://')) {
        try {
          const fileResp = await fetch(downloadUrl);
          if (fileResp.ok) {
            const arrayBuf = await fileResp.arrayBuffer();
            if (arrayBuf.byteLength > 0 && arrayBuf.byteLength <= 5 * 1024 * 1024) {
              const detectedMime =
                typeof mimeType === 'string' &&
                ['application/pdf', 'image/jpeg', 'image/png'].includes(mimeType)
                  ? mimeType
                  : 'application/pdf';
              parts.push({
                inlineData: {
                  mimeType: detectedMime,
                  data: Buffer.from(arrayBuf).toString('base64'),
                },
              });
            }
          }
        } catch {
          // Proceed with metadata inspection if binary fetch fails
        }
      }

      parts.push({
        text: [
          `Tu assistes le Secrétariat du CEDoc (EST Fès) pour le pré-contrôle documentaire d'une candidature au cycle doctoral.`,
          `Pièce attendue : "${String(label ?? '')}".`,
          `Candidat : "${String(candidatNom ?? '')}".`,
          `Nom du fichier : "${String(fileName ?? '')}" (${String(mimeType ?? '')}).`,
          parts.length > 0
            ? `Analyse le document joint : vérifie s'il est lisible, s'il correspond bien au type de pièce attendue ("${String(label ?? '')}") et signale toute anomalie manifeste.`
            : `Le binaire du document n'étant pas accessible directement, évalue la cohérence du fichier déposé et retourne "Douteux" si un contrôle visuel humain est requis.`,
          `Réponds strictement en JSON avec status ("Conforme", "Douteux" ou "Non conforme") et un motif court en français (max 140 caractères).`,
        ].join('\n'),
      });

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: { parts },
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              status: {
                type: Type.STRING,
                enum: ['Conforme', 'Douteux', 'Non conforme'],
              },
              motif: {
                type: Type.STRING,
              },
            },
            required: ['status', 'motif'],
          },
        },
      });

      const rawText = response.text?.trim() ?? '';
      const parsed = JSON.parse(rawText) as { status?: string; motif?: string };
      const validStatuses = ['Conforme', 'Douteux', 'Non conforme'] as const;
      const finalStatus = validStatuses.includes(parsed.status as (typeof validStatuses)[number])
        ? (parsed.status as 'Conforme' | 'Douteux' | 'Non conforme')
        : 'Douteux';
      const finalMotif =
        typeof parsed.motif === 'string' && parsed.motif.trim().length > 0
          ? parsed.motif.trim().slice(0, 240)
          : 'Vérification manuelle requise.';

      res.json({ status: finalStatus, motif: finalMotif });
    } catch {
      res.json({
        status: 'Douteux',
        motif: 'Vérification manuelle requise.',
      });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`GCD Platforme server listening on http://localhost:${PORT}`);
  });
}

startServer();
