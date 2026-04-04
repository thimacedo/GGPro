/**
 * @fileoverview Serviço de integração com Google Gemini via Proxy Seguro
 * Implementa validação estrita de payload e tratamento de exceções (Fail-Fast).
 */

const PROXY_ENDPOINT = '/api/ai/generate';

function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        if (!file) return reject(new Error("Arquivo inválido ou inexistente."));
        
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve({
            inlineData: {
                data: reader.result.split(',')[1],
                mimeType: file.type
            }
        });
        reader.onerror = error => reject(new Error(`Falha na leitura do arquivo: ${error.message}`));
    });
}

function validateResponseSchema(data, expectedType) {
    if (!data || !data.candidates || !data.candidates.length) {
        throw new Error("Resposta vazia ou formato inválido retornado pela API.");
    }

    const rawText = data.candidates[0].content?.parts?.[0]?.text;
    if (!rawText) {
        throw new Error("Ausência de conteúdo estruturado na resposta da IA.");
    }

    try {
        const parsed = JSON.parse(rawText);
        
        if (expectedType === 'event' && !parsed.type) {
            throw new Error("Payload de evento inválido: propriedade 'type' ausente.");
        }
        if (expectedType === 'roster' && (!parsed.players || !Array.isArray(parsed.players))) {
            throw new Error("Payload de elenco inválido: array 'players' ausente.");
        }
        
        return parsed;
    } catch (error) {
        throw new Error(`Falha no parsing do JSON retornado pela IA: ${error.message}`);
    }
}

export async function processMatchDocument(file, type) {
    if (!file) throw new Error("Arquivo não fornecido.");

    const model = type === 'rules' ? 'gemini-2.5-pro' : 'gemini-2.5-flash';
    const filePart = await fileToBase64(file);
    
    const prompt = type === 'rules' 
        ? `Analise este regulamento e extraia regras de tempo de jogo, limites de substituição e critérios de desempate em formato JSON. Estrutura esperada: {"halfDuration": number, "maxSubstitutions": number, "penaltyKicks": number, "summary": string}`
        : `Analise esta súmula/escalação. Extraia os jogadores e retorne estritamente JSON: { "teamName": "Nome", "players": [{ "number": 0, "name": "Nome", "position": "GK|DF|MF|FW", "isStarter": true }] }`;

    const payload = {
        model: model,
        contents: [{ parts: [{ text: prompt }, filePart] }],
        generationConfig: { temperature: 0.1, responseMimeType: "application/json" }
    };

    try {
        const response = await fetch(PROXY_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.error || `HTTP Error: ${response.status}`);
        }

        const data = await response.json();
        return validateResponseSchema(data, type === 'rules' ? 'rules' : 'roster');
    } catch (error) {
        console.error(`[Gemini OCR Error]:`, error);
        throw error;
    }
}

export async function parseMatchCommand(command, matchState) {
    if (!command || !command.trim()) throw new Error("Comando de narração vazio.");

    const context = `
        Mandante: ${matchState.homeTeam?.name || 'UND'}
        Visitante: ${matchState.awayTeam?.name || 'UND'}
        Período Atual: ${matchState.period || 'PRE_MATCH'}
    `;
    
    const instruction = `Converta a ação em JSON válido: { "type": "GOAL" | "YELLOW_CARD" | "RED_CARD" | "SUBSTITUTION" | "SHOT" | "FOUL" | "VAR" | "OFFSIDE", "teamId": "home" | "away" | "none", "playerNumber": number, "description": "Resumo" }`;

    const payload = {
        model: 'gemini-2.5-flash',
        contents: [{
            parts: [{ text: `${context}\n${instruction}\nComando: "${command}"` }]
        }],
        generationConfig: { temperature: 0.1, responseMimeType: "application/json" }
    };

    try {
        const response = await fetch(PROXY_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.error || `HTTP Error: ${response.status}`);
        }

        const data = await response.json();
        return validateResponseSchema(data, 'event');
    } catch (error) {
        console.error("[Gemini NLU Error]:", error);
        throw error; // Propaga para o UI Layer (app.js/voice.js) exibir o feedback visual
    }
}
