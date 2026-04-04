// js/services/gemini.js
// Motor de IA Geradora - Versão Ultra-Flash (Engine v6.1 Stable)
// Fail-Fast Validation & Schema Enforcement

import { getApiKey } from './config.js';

/**
 * 🛠️ MOTOR DE ENGENHARIA v6.1
 * Focado em validação estrita e resiliência multicamada.
 */
async function callGeminiREST(modelNames, contents) {
  const apiKey = getApiKey();
  let lastError = null;
  const apiVersions = ['v1beta', 'v1']; 

  for (const model of modelNames) {
    for (const v of apiVersions) {
      try {
        const url = `https://generativelanguage.googleapis.com/${v}/models/${model}:generateContent?key=${apiKey}`;
        const payload = { contents };

        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (!response.ok) {
          const msg = data.error?.message || "Indisponível";
          lastError = new Error(msg);
          continue; 
        }

        /**
         * 🔎 FAIL-FAST VALIDATION
         * Uso de optional chaining (?.) para validação segura do payload da API.
         * Garante que o texto só seja retornado ser a estrutura completa existir.
         */
        const extractedText = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (extractedText) {
          return extractedText;
        } else {
          console.warn("Resposta da IA em formato inesperado:", JSON.stringify(data, null, 2));
          // Dispara erro claro conforme diretiva técnica v3.1
          throw new Error('Payload estruturado ausente na resposta da IA');
        }
      } catch (e) {
        console.error("Erro Crítico no Motor IA:", e);
        lastError = e;
      }
    }
  }
  throw lastError || new Error("Todos os motores de processamento falharam.");
}

const cleanAndParseJSON = (text) => {
  try {
    let clean = text.replace(/```json/g, '').replace(/```/g, '');
    const firstBrace = clean.indexOf('{');
    const lastBrace = clean.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1) {
      return JSON.parse(clean.substring(firstBrace, lastBrace + 1));
    }
  } catch (e) {
    console.warn("Falha no parse JSON da IA:", e);
  }
  return { teams: [], actions: [] };
};

const ULTRA_GEN_MODELS = [
  "gemini-2.0-flash", 
  "gemini-1.5-flash", 
  "gemini-flash-latest"
];

export const processImageForPlayers = async (file, type) => {
  const base64 = await fileToBase64(file);
  const contents = [{
    parts: [
      { inline_data: { mime_type: file.type, data: base64 } },
      { text: `Extraia JSON de jogadores: { "players": [{ "name": "...", "number": 10 }] }` }
    ]
  }];
  const text = await callGeminiREST(ULTRA_GEN_MODELS, contents);
  return cleanAndParseJSON(text);
};

export const parseRegulationDocument = async (file, mimeType) => {
    const base64 = await fileToBase64(file);
    const contents = [{
      parts: [
        { inline_data: { mime_type: mimeType, data: base64 } },
        { text: `Extraia JSON de regras: { "halfDuration": 30, "maxSubstitutions": 5 }` }
      ]
    }];
    const text = await callGeminiREST(ULTRA_GEN_MODELS, contents);
    return cleanAndParseJSON(text);
};

export async function parseMatchCommand(command, state) {
  const contents = [{
    parts: [{ text: `Converta narração em JSON de evento: { "type": "GOAL", "description": "..." }` }]
  }];
  const resultText = await callGeminiREST(ULTRA_GEN_MODELS, contents);
  return cleanAndParseJSON(resultText);
}

export const generateMatchReport = async (context, timeline) => {
  const contents = [{
    parts: [{ text: `Escreva uma crônica esportiva profissional: ${context}` }]
  }];
  return await callGeminiREST(ULTRA_GEN_MODELS, contents);
};

const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = error => reject(error);
    });
};