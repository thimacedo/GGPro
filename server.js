import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Libera o acesso estático recursivo à raiz do projeto (onde estão /js, /css, index.html)
app.use(express.static(__dirname));

app.post('/api/ai/generate', async (req, res) => {
  const { contents, model, version = 'v1beta', generationConfig } = req.body;
  const apiKey = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: "Chave da API não configurada no servidor." });
  }

  if (!contents || !model) {
    return res.status(400).json({ error: "Payload inválido. 'contents' e 'model' são obrigatórios." });
  }

  const url = `https://generativelanguage.googleapis.com/${version}/models/${model}:generateContent?key=${apiKey}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents, generationConfig })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: data.error?.message || "Erro na API do Gemini" });
    }

    res.status(200).json(data);
  } catch (error) {
    console.error("Erro no Proxy AI:", error);
    res.status(500).json({ error: "Erro interno na comunicação com o Proxy AI." });
  }
});

/**
 * Fallback SPA (Single Page Application)
 * [FIX] Express 5.x compatibility.
 * Usando Regex puro para evitar conflitos de parsing do path-to-regexp.
 */
app.get(/^(?!\/api).*/, (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\n🚀 Narrador Pro Server running on http://localhost:${PORT}`);
  console.log(`🔑 Proxy AI Ativo (Gemini 2.5 Ready)`);
});
