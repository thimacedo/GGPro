// js/services/gemini.js - v6.0
// Motor IA: Groq (texto) + Tesseract.js (OCR no browser, sem API key)

// Tesseract.js OCR runner — roda direto no browser, zero custo
async function extractTextFromImage(file) {
    if (typeof Tesseract === 'undefined') {
        // Fallback: tentar carregar dinamicamente
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@6/dist/tesseract.min.js';
        document.head.appendChild(script);
        await new Promise((res) => { script.onload = res; script.onerror = res; });
    }

    if (typeof Tesseract === 'undefined') {
        throw new Error('Tesseract.js indisponível. Sem capacidade de OCR.');
    }

    const result = await Tesseract.recognize(file, 'por+eng', {
        logger: m => {
            if (m.status === 'recognizing text') {
                if (window.toastManager) {
                    window.toastManager._progress = Math.round(m.progress * 100);
                    window.toastManager.show('OCR', `Lendo imagem: ${Math.round(m.progress * 100)}%`, 'ai');
                }
            }
        }
    });

    return result.data?.text || '';
}

async function callProxyAI({ prompt, fileBase64 = null, isOCR = false }) {
    // Se é OCR (tem imagem), usar Tesseract.js no browser + Groq para parse
    if (fileBase64 && typeof fileBase64 === 'string') {
        // Converter fileBase64 em File para Tesseract
        const base64 = fileBase64.includes(',') ? fileBase64.split(',')[1] : fileBase64;
        const mimeType = fileBase64.includes('?') ? fileBase64.match(/^data:(.+?);/)?.[1] || 'image/jpeg' : 'image/jpeg';
        const byteCharacters = atob(base64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const blob = new Blob([new Uint8Array(byteNumbers)], { type: mimeType });
        const file = new File([blob], 'ocr-image.' + mimeType.split('/')[1], { type: mimeType });

        // Tesseract extrai texto da imagem
        const extractedText = await extractTextFromImage(file);

        if (!extractedText.trim()) {
            throw new Error('Tesseract não conseguiu extrair texto da imagem.');
        }

        // Se o prompt pede JSON, tentar parse direto do texto extraído
        // Se não, enviar para Groq processar
        try {
            const cleaned = extractedText.trim();
            // Tentar se o texto já contém JSON válido
            const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return jsonMatch[0];
            }
        } catch (e) { /* ignore */ }

        // Enviar texto extraído para Groq processar
        const groqPrompt = `Com base no texto extraído de uma imagem, ${prompt}.\n\nTexto extraído:\n${extractedText}`;
        return callGroqProxy(groqPrompt);
    }

    // Sem imagem — Groq normal
    return callGroqProxy(prompt || 'Responda');
}

async function callGroqProxy(prompt) {
    const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Falha na IA');
    }

    const data = await response.json();

    if (!data.candidates || !data.candidates[0]?.content?.parts?.[0]?.text) {
        throw new Error('Resposta da IA inválida.');
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
        console.warn('Falha no parse JSON da IA:', e);
    }
    return { players: [], events: [], actions: [] };
};

export const processImageForPlayers = async (file, type) => {
    try {
        const prompt = `Extraia TODOS os jogadores desta súmula de futebol. Retorne APENAS JSON: { "players": [{ "name": "nome do jogador", "number": 10 }] }. Inclua todos os jogadores visíveis.`;

        // Usar Tesseract para extrair texto da imagem
        const extractedText = await extractTextFromImage(file);

        // Enviar texto para Groq converter em JSON
        const groqPrompt = `Com base no texto extraído de uma imagem de súmula de futebol, ${prompt}. Retorne APENAS JSON válido, sem markdown.\n\nTexto extraído:\n\n${extractedText}`;
        const result = await callGroqProxy(groqPrompt);
        const parsed = cleanAndParseJSON(result);
        return parsed.players || [];
    } catch (error) {
        throw new Error(`OCR falhou: ${error.message}`);
    }
};

export const parseRegulationDocument = async (file, mimeType) => {
    try {
        const extractedText = await extractTextFromImage(file);
        const groqPrompt = `Extraia parâmetros de regulamento esportivo deste texto. JSON: { "halfDuration": 45, "maxSubstitutions": 5, "penaltyKicks": 5 }.\n\nTexto:\n${extractedText}`;
        const result = await callGroqProxy(groqPrompt);
        return cleanAndParseJSON(result);
    } catch (error) {
        throw new Error(`OCR Regulamento falhou: ${error.message}`);
    }
};

export async function parseMatchCommand(command, state) {
    const prompt = `Contexto: ${state.homeTeam.name} vs ${state.awayTeam.name}. Narração: "${command}". Converta em evento JSON: { "type": "GOAL|CARD", "teamId": "home|away", "description": "..." }`;
    const text = await callGroqProxy(prompt);
    return cleanAndParseJSON(text);
}

export const generateMatchReport = async (context, timeline) => {
    return callGroqProxy(`Escreva uma crônica esportiva profissional com base em: ${context} e Cronologia: ${timeline}`);
};

export const processTextForPlayers = async (text) => {
    const result = await callGroqProxy(`Analise esta lista de jogadores e extraia em JSON: { "players": [{ "name": "...", "number": 10, "position": "MF" }] }.\nLista:\n${text}`);
    return cleanAndParseJSON(result).players || [];
};

export const callBannerAI = async (file) => {
    try {
        const extractedText = await extractTextFromImage(file);
        const groqPrompt = `Extraia dados do banner de uma partida de futebol. JSON: {"competition":"...","stadium":"...","date":"...","time":"...","referee":"...","homeTeam":"...","awayTeam":"..."}. Texto extraído:\n${extractedText}`;
        return await callGroqProxy(groqPrompt);
    } catch (error) {
        throw new Error(`Banner OCR falhou: ${error.message}`);
    }
};
