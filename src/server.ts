import express from 'express';
import { GoogleGenAI } from "@google/genai";
import * as dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// AI Risk Assessment Endpoint
app.post('/api/assess-risk', async (req, res) => {
  try {
    const { patientData, medicalHistory } = req.body;
    
    const prompt = `You are an AI Maternal Health Risk Engine. 
    Analyze the following patient data for risk factors:
    Patient Data: ${JSON.stringify(patientData)}
    Medical History: ${JSON.stringify(medicalHistory)}
    
    Provide a risk assessment in JSON format:
    {
      "riskScore": number (0-100),
      "riskLevel": "low" | "medium" | "high",
      "insight": "brief clinical insight",
      "recommendedActions": ["action 1", "action 2"]
    }`;

    const result = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    const response = JSON.parse(result.text || '{}');
    res.json(response);
  } catch (error) {
    console.error('Gemini error:', error);
    res.status(500).json({ error: 'Failed to assess risk' });
  }
});

// Vite Middleware
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';
  const port = process.env.PORT || 3000;

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'custom'
    });
    app.use(vite.middlewares);
    
    app.use('*', async (req, res, next) => {
      const url = req.originalUrl;
      try {
        let template = await (await import('fs')).readFileSync(
          path.resolve(__dirname, '../index.html'),
          'utf-8'
        );
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  } else {
    app.use(express.static(path.resolve(__dirname, '../dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, '../dist/index.html'));
    });
  }

  app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
  });
}

startServer();
