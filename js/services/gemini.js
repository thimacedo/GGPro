// js/services/gemini.js
// Motor de IA Geradora - Groq Proxy v1.0 (llama-3.3-70b + llama-3.2-90b-vision)

/**
 * 🛠️ CHAMA O PROXY SERVERLESS (BACKEND)
 * Unifica a comunicação com a API Groq via Vercel Function /api/gemini
 */
async function callProxyAI({ prompt, fileBase64 = null, isOCR = false }) {
    const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, fileBase64, isOCR })
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Falha na comunicação com a IA (Groq Proxy Error)');
    }

    const data = await response.json();

    // Extração segura do conteúdo
    if (!data.candidates || !data.candidates[0]?.content?.parts?.[0]?.text) {
        throw new Error("Resposta da IA em formato inválido.");
    }

    return data.candidates[0].content.parts[0].text;
}

const cleanAndParseJSON = (text) => {
    try {
        let clean = text.replace(/```json/g, '').replace(/```/g, '').trim();
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
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = async () => {
            try {
                const prompt = `Analise esta súmula e extraia os jogadores em formato JSON: { "players": [{ "name": "...", "number": 10 }] }`;
                const text = await callProxyAI({ prompt, fileBase64: reader.result, isOCR: true });
                const parsed = cleanAndParseJSON(text);
                resolve(parsed.players || []);
            } catch (error) {
                reject(error);
            }
        };
        reader.readAsDataURL(file);
    });
};

export const parseRegulationDocument = async (file, mimeType) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = async () => {
            try {
                const prompt = `Analise este regulamento e extraia parâmetros técnicos JSON: { "halfDuration": 45, "maxSubstitutions": 5 }`;
                const text = await callProxyAI({ prompt, fileBase64: reader.result, isOCR: true });
                resolve(cleanAndParseJSON(text));
            } catch (error) {
                reject(error);
            }
        };
        reader.readAsDataURL(file);
    });
};

export async function parseMatchCommand(command, state) {
    const prompt = `Contexto: ${state.homeTeam.name} vs ${state.awayTeam.name}. Narração: "${command}". Converta em evento JSON: { "type": "GOAL|CARD", "teamId": "home|away", "description": "..." }`;
    const text = await callProxyAI({ prompt });
    return cleanAndParseJSON(text);
}

export const generateMatchReport = async (context, timeline) => {
    const prompt = `Escreva uma crônica esportiva profissional com base em: ${context} e Cronologia: ${timeline}`;
    return await callProxyAI({ prompt });
};
