// js/services/gemini.js
// Motor de IA Geradora - Versão Ultra-Flash (Engine v7.1 Proxy)
// Fixo: STOP AND FIX directive v4.3

/**
 * 🛠️ CHAMA O PROXY SERVERLESS (BACKEND)
 * Nunca bate direto no Google. Nunca usa localStorage.
 */
async function callProxyAI({ prompt, fileBase64 = null }) {
    const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, fileBase64 })
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Falha na comunicação com a IA (Serverless Error)');
    }

    const data = await response.json();
    return data; 
}

const cleanAndParseJSON = (data) => {
    try {
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
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
    const reader = new FileReader();
    const base64 = await new Promise((resolve) => {
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.readAsDataURL(file);
    });

    const prompt = `Extraia JSON de jogadores: { "players": [{ "name": "...", "number": 10 }] }`;
    const data = await callProxyAI({ prompt, fileBase64: base64 });
    const parsed = cleanAndParseJSON(data);
    return parsed.players || [];
};

export const parseRegulationDocument = async (file, mimeType) => {
    const reader = new FileReader();
    const base64 = await new Promise((resolve) => {
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.readAsDataURL(file);
    });

    const prompt = `Extraia JSON de regras: { "halfDuration": 30, "maxSubstitutions": 5 }`;
    const data = await callProxyAI({ prompt, fileBase64: base64 });
    return cleanAndParseJSON(data);
};

export async function parseMatchCommand(command, state) {
    const prompt = `Contexto: ${state.homeTeam.name} vs ${state.awayTeam.name}. Narração: "${command}". Retorno esperado JSON: { "type": "GOAL|CARD", "description": "..." }`;
    const data = await callProxyAI({ prompt });
    return cleanAndParseJSON(data);
}

export const generateMatchReport = async (context, timeline) => {
    const prompt = `Escreva uma crônica baseada em: ${context} e Cronologia: ${timeline}`;
    const data = await callProxyAI({ prompt });
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "Falha na geração do texto.";
};