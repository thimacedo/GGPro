import express from "express";
import path from "path";
import cors from "cors";
import { exec } from "child_process";
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
// Em Node.js 18+ o fetch é global, não precisa de import.

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json({ limit: "50mb" }));

// Middleware para servir arquivos estáticos
app.use(express.static(process.cwd()));
app.use('/js', express.static(path.join(process.cwd(), 'js')));

// PROXY REVERSO PARA GEMINI (Proteção de Chaves)
app.post('/api/ai/generate', async (req, res) => {
  const { contents, model, version = 'v1beta' } = req.body;
  const apiKey = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: "API Key não configurada no servidor." });
  }

  const url = `https://generativelanguage.googleapis.com/${version}/models/${model}:generateContent?key=${apiKey}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents })
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error("Erro no Proxy AI:", error);
    res.status(500).json({ error: "Falha na comunicação com o provedor de IA." });
  }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'index.html'));
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`\n🚀 GGPro Vanilla Server running on http://localhost:${PORT}`);
  console.log(`🔑 Proteção de Chaves Ativa: Gemini Proxy configurado.`);
  
  if (process.env.NODE_ENV !== "production") {
    const url = `http://localhost:${PORT}`;
    const command = process.platform === 'win32' ? `start ${url}` : process.platform === 'darwin' ? `open ${url}` : `xdg-open ${url}`;
    exec(command);
  }
});
