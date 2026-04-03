import express from "express";
import path from "path";
import cors from "cors";
import { exec } from "child_process";
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// O limite de 50mb previne bloqueios de payload no upload de imagens em Base64
app.use(cors());
app.use(express.json({ limit: "50mb" }));

// Middleware para servir arquivos estáticos
app.use(express.static(process.cwd()));
app.use('/js', express.static(path.join(process.cwd(), 'js')));

// PROXY REVERSO PARA GEMINI (Proteção de Chaves + Payload Estendido)
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

app.get('/', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'index.html'));
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`\n🚀 GGPro Server running on http://localhost:${PORT}`);
  console.log(`🔑 Proxy AI Ativo (Gemini 2.5 Ready)`);
  
  if (process.env.NODE_ENV !== "production") {
    const url = `http://localhost:${PORT}`;
    const command = process.platform === 'win32' ? `start ${url}` : process.platform === 'darwin' ? `open ${url}` : `xdg-open ${url}`;
    exec(command);
  }
});
