// js/services/gemini.js
// Motor de IA Geradora - Versão Ultra-Flash (Engine v7.0 Serverless)
// Fail-Fast Validation & Schema Enforcement

/**
 * 🛠️ MOTOR DE ENGENHARIA v7.0 (Proxy Serverless)
 * Delega a chamada para a Vercel Function /api/gemini para proteger a API Key
 * e garantir resiliência entre modelos Pro e Flash.
 */
async function callGeminiAPI({ prompt, fileBase64 = null, isOCR = false }) {
  try {
    const response = await fetch('/api/gemini', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt, fileBase64, isOCR })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Erro ao consultar a IA via servidor.");
    }

    // Extração segura do texto da resposta padrão do Gemini (retornado pela API serverless)
    const extractedText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (extractedText) {
      return extractedText;
    } else {
      console.warn("Resposta da IA em formato inesperado:", JSON.stringify(data, null, 2));
      throw new Error('Texto não encontrado na resposta da IA.');
    }
  } catch (e) {
    console.error("Erro na comunicação Serverless:", e);
    throw e;
  }
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
  return { players: [], events: [], actions: [] };
};

export const processImageForPlayers = async (file, type) => {
  const base64 = await fileToBase64(file);
  const prompt = `Analise esta súmula de futebol ou lista de jogadores. Extraia os dados e retorne APENAS um JSON no formato: { "players": [{ "name": "Nome Completo", "number": 10, "position": "Goleiro/Zagueiro/Etc" }] }`;
  
  const text = await callGeminiAPI({ 
    prompt, 
    fileBase64: base64, 
    isOCR: true 
  });
  
  const parsed = cleanAndParseJSON(text);
  return parsed.players || [];
};

export const parseRegulationDocument = async (file, mimeType) => {
    const base64 = await fileToBase64(file);
    const prompt = `Analise este regulamento de competição de futebol. Extraia os parâmetros técnicos e retorne APENAS um JSON no formato: { "halfDuration": 45, "maxSubstitutions": 5, "extraTime": true }`;
    
    const text = await callGeminiAPI({ 
        prompt, 
        fileBase64: base64, 
        isOCR: true 
    });
    
    return cleanAndParseJSON(text);
};

export async function parseMatchCommand(command, state) {
  const prompt = `Atue como um analista de dados de futebol. Converta a narração abaixo em um evento tático JSON.
  Contexto da Partida: ${state.homeTeam.name} vs ${state.awayTeam.name}
  Narração: "${command}"
  Retorno esperado: { "type": "GOAL|CARD|SUB|FOUL", "teamId": "home|away", "playerNumber": 10, "description": "Resumo curto" }`;

  const resultText = await callGeminiAPI({ prompt });
  return cleanAndParseJSON(resultText);
}

export const generateMatchReport = async (context, timeline) => {
  const prompt = `Escreva uma crônica esportiva profissional e emocionante baseada nos eventos abaixo.
  Contexto: ${context}
  Cronologia:
  ${timeline}
  Retorne o texto formatado para leitura.`;

  return await callGeminiAPI({ prompt });
};

const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = error => reject(error);
    });
};