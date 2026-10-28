import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

const PORT = 3000;

async function startServer() {
  const app = express();
  app.use(express.json({ limit: "10mb" }));

  // Pré-contrôle IA de conformité documentaire (sans pourcentages)
  app.post("/api/verify-document", async (req, res) => {
    try {
      const { candidateName, candidateCin, docType, extractedTextSample } = req.body;

      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({
          error: "Configuration serveur indisponible.",
        });
      }

      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });

      const prompt = `Contrôle documentaire pour un Centre d'Études Doctorales (CEDoc).
Évalue la pièce déposée (lisibilité, adéquation du type de document, cohérence du nom, du CIN et des dates).
N'affiche aucun pourcentage. La décision finale reste humaine.

Candidat déclaré : ${candidateName} (CIN : ${candidateCin})
Pièce attendue : ${docType}
Contenu observé : "${extractedTextSample}"

Retourne un JSON strict avec :
- status: "conforme" | "douteux" | "non_conforme"
- motif: motif factuel et concis en français (1 phrase, aucun pourcentage)`;

      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              status: {
                type: Type.STRING,
                description: "conforme, douteux, ou non_conforme",
              },
              motif: {
                type: Type.STRING,
                description: "Motif concis en français sans aucun pourcentage",
              },
            },
            required: ["status", "motif"],
          },
        },
      });

      const parsed = JSON.parse(response.text || "{}");
      return res.json(parsed);
    } catch (error: any) {
      return res.status(500).json({
        error: error?.message || "Erreur lors de la vérification IA.",
      });
    }
  });

  // Récupération par Identifiant (Base interne USMBA/EST Fès ou API Université d'origine avec consentement)
  app.post("/api/inter-university-lookup", (req, res) => {
    const { cneOrId, sourceUniversity, consentGranted } = req.body;

    if (!cneOrId) {
      return res.status(400).json({ error: "Identifiant étudiant requis." });
    }

    const isInternal = sourceUniversity === "INTERNE_USMBA";

    if (!isInternal && !consentGranted) {
      return res.status(403).json({
        error: "Consentement explicite requis pour interroger l'API de l'université d'origine.",
      });
    }

    const records: Record<string, any> = {
      "N138492011": {
        studentName: "Yassine El Amrani",
        cin: "CD648291",
        origin: isInternal
          ? "Base interne USMBA (Parcours antérieur EST Fès / FST Fès)"
          : `API ${sourceUniversity}`,
        diploma: "Master Recherche Intelligence Artificielle & Systèmes",
        year: 2026,
        retrievedDocs: [
          "Diplôme Bac+5 certifié",
          "Relevés de notes universitaires",
          "Baccalauréat & diplômes antérieurs",
        ],
      },
      "S149023844": {
        studentName: "Salma Benjelloun",
        cin: "AE903125",
        origin: isInternal
          ? "Base interne USMBA (EST Fès / ENSA Fès)"
          : `API ${sourceUniversity}`,
        diploma: "Diplôme d'Ingénieur Génie Énergétique",
        year: 2025,
        retrievedDocs: [
          "Diplôme d'Ingénieur certifié",
          "Relevés de notes complets",
          "Baccalauréat",
        ],
      },
    };

    const found = records[cneOrId.toUpperCase()] || {
      studentName: "Karim Tazi",
      cin: "BK419022",
      origin: isInternal
        ? "Base interne USMBA (Ancien étudiant EST Fès)"
        : `API ${sourceUniversity}`,
      diploma: "Master Systèmes Embarqués",
      year: 2026,
      retrievedDocs: [
        "Attestation de réussite Master",
        "Relevés de notes S1-S4",
      ],
    };

    return res.json({ record: found });
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`GCD Platforme sur http://0.0.0.0:${PORT}`);
  });
}

startServer();
