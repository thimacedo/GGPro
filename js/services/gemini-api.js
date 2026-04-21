// js/services/gemini.js - v6.1 ULTRA
// Motor IA: Híbrido (Proxy + Direto) com Fallback Automático

const PROVIDERS = {
    PROXY: 'proxy',
    GEMINI_DIRECT: 'gemini_direct',
    GROQ_DIRECT: 'groq_direct'
};

// Configurações de Fallback e Chaves (prioriza LocalStorage se o usuário configurar)
const getAiConfig = () => {
    return {
        geminiKey: localStorage.getItem('GGPRO_GEMINI_KEY') || '',
        groqKey: localStorage.getItem('GGPRO_GROQ_KEY') || '',
        activeProvider: localStorage.getItem('GGPRO_AI_PROVIDER') || PROVIDERS.PROXY
    };
};

/**
 * PRÉ-PROCESSADOR DE IMAGEM (v2.0 - Low Light Optimization)
 * Melhora contraste e brilho via Canvas antes do OCR.
 */
async function preprocessImage(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.width = img.width;
                canvas.height = img.height;
                
                // Filtros de realce de texto
                ctx.filter = 'grayscale(100%) contrast(1.5) brightness(1.2)';
                ctx.drawImage(img, 0, 0);
                
                canvas.toBlob((blob) => resolve(blob || file), 'image/jpeg', 0.9);
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
}

// Tesseract.js OCR runner — roda direto no browser, zero custo
async function extractTextFromImage(file) {
    if (typeof Tesseract === 'undefined') {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@6/dist/tesseract.min.js';
        document.head.appendChild(script);
        await new Promise((res) => { script.onload = res; script.onerror = res; });
    }

    if (typeof Tesseract === 'undefined') {
        throw new Error('Tesseract.js indisponível. Sem capacidade de OCR.');
    }

    // Otimizar imagem para baixa iluminação
    const processedFile = await preprocessImage(file);

    const result = await Tesseract.recognize(processedFile, 'por+eng', {
        logger: m => {
            if (m.status === 'recognizing text' && window.toastManager) {
                window.toastManager.show('Vision: OCR', `Lendo caligrafia: ${Math.round(m.progress * 100)}%`, 'ai');
            }
        }
    });

    const rawText = result.data?.text || '';
    
    // VALIDAÇÃO DE QUALIDADE (ENTROPIA)
    const garbageRatio = (rawText.match(/[^a-zA-Z0-9\s,.;:#]/g) || []).length / (rawText.length || 1);
    if (garbageRatio > 0.3 && rawText.length > 50) {
        if (window.toastManager) window.toastManager.show('Vision: Ruído', 'Imagem com baixa nitidez. A IA tentará corrigir.', 'warning');
    }

    return rawText;
}

async function callProxyAI({ prompt }) {
    const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
    });

    if (!response.ok) {
        const errorData = await response.json();
        // Se o erro for 429 (Rate Limit), sinalizar para fallback
        if (response.status === 429 || response.status === 503) {
            throw new Error('LIMIT_REACHED');
        }
        throw new Error(errorData.error || 'Falha na IA');
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

async function callGeminiDirect(prompt, key) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`;
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }]
        })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || 'Gemini Direct Fail');
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

async function callGroqDirect(prompt, key) {
    const url = "https://api.groq.com/openai/v1/chat/completions";
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${key}`
        },
        body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.1
        })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || 'Groq Direct Fail');
    return data.choices?.[0]?.message?.content || '';
}

/**
 * ORQUESTRADOR DE CHAMADAS COM RESILIÊNCIA
 */
export async function callAI(prompt) {
    const config = getAiConfig();
    
    // Lista de tentativas (Fallback Cascade)
    const attempts = [];
    
    // 1. Tentar Proxy (Servidor)
    attempts.push(() => callProxyAI({ prompt }));
    
    // 2. Tentar Gemini Direto (se houver chave local)
    if (config.geminiKey) {
        attempts.push(() => callGeminiDirect(prompt, config.geminiKey));
    }
    
    // 3. Tentar Groq Direto (se houver chave local)
    if (config.groqKey) {
        attempts.push(() => callGroqDirect(prompt, config.groqKey));
    }

    let lastError = null;
    for (const attempt of attempts) {
        try {
            return await attempt();
        } catch (e) {
            lastError = e;
            if (e.message === 'LIMIT_REACHED') {
                console.warn("Limite de Tokens atingido no provider atual. Tentando fallback...");
                if (window.toastManager) window.toastManager.show('IA: Limite', 'Trocando canal de IA...', 'warning');
                continue;
            }
            // Outros erros (ex: timeout) também podem disparar fallback
            console.error("Falha no provider de IA:", e.message);
            continue;
        }
    }

    throw lastError || new Error('Todos os canais de IA falharam.');
}

export const cleanAndParseJSON = (text) => {
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
        const cacheKey = `OCR_SMART_v2_${file.name}_${file.size}`;
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
            console.log("Usando Cache OCR local.");
            return JSON.parse(cached);
        }

        const rawText = await extractTextFromImage(file);
        if (!rawText.trim() || rawText.length < 10) throw new Error('Imagem ilegível ou sem texto detectado.');

        // PROMPT DE INTERPRETAÇÃO SEMÂNTICA (O "Cérebro" que entende a súmula bagunçada)
        const semanticPrompt = `
            IA Broadcaster. Analise este texto de OCR de uma súmula de futebol (pode conter erros de leitura).
            
            OBJETIVO:
            1. Extrair a lista de atletas.
            2. Identificar TITULARES (geralmente os 11 primeiros ou marcados com 'T', 'X' ou '*').
            3. Priorizar o "APELIDO" ou "NOME DE GUERRA" para o campo "name", pois é o nome usado na narração.
            
            REGRAS:
            - Ignore CPFs, RGs ou lixo de leitura (caracteres sem nexo).
            - Retorne APENAS JSON: { "players": [{ "name": "Apelido", "fullName": "Nome Completo", "number": 10, "isStarter": true }] }.
            
            TEXTO:
            ${rawText}
        `;

        if (window.toastManager) window.toastManager.show('Vision: IA', 'Interpretando caligrafia e colunas...', 'ai');
        const aiResponse = await callAI(semanticPrompt);
        const parsed = cleanAndParseJSON(aiResponse);
        
        const players = parsed.players || [];
        // Validação básica de nomes (caracteres aleatórios)
        const validPlayers = players.filter(p => p.name && p.name.length > 2 && !/[#$@%]/.test(p.name));

        if (validPlayers.length > 0) {
            localStorage.setItem(cacheKey, JSON.stringify(validPlayers));
        }
        
        return validPlayers;
    } catch (error) {
        console.error("Smart OCR falhou:", error);
        throw new Error(`Falha na interpretação: ${error.message}`);
    }
};

export const parseRegulationDocument = async (file, mimeType) => {
    try {
        const extractedText = await extractTextFromImage(file);
        const groqPrompt = `Extraia parâmetros de regulamento esportivo deste texto. JSON: { "halfDuration": 45, "maxSubstitutions": 5, "penaltyKicks": 5 }.\n\nTexto:\n${extractedText}`;
        const result = await callAI(groqPrompt);
        return cleanAndParseJSON(result);
    } catch (error) {
        throw new Error(`OCR Regulamento falhou: ${error.message}`);
    }
};

export async function parseMatchCommand(command, state) {
    // Prompt Otimizado (Menos Tokens)
    const prompt = `IA Broadcaster. Jogo: ${state.homeTeam.name} vs ${state.awayTeam.name}. Comando: "${command}". JSON: { "type": "GOAL|YELLOW_CARD|RED_CARD|FOUL|SUBSTITUTION|SAVE|OFFSIDE|CORNER|PENALTY", "teamId": "home|away", "playerId": "ID_SE_HOUVER", "description": "curto" }`;
    const text = await callAI(prompt);
    return cleanAndParseJSON(text);
}

export const generateMatchReport = async (context, timeline) => {
    return callAI(`Escreva uma crônica esportiva profissional. Contexto: ${context}. Cronologia: ${timeline}`);
};

export const processTextForPlayers = async (text) => {
    const result = await callAI(`Analise esta lista e extraia JSON: { "players": [{ "name": "...", "number": 10, "position": "MF" }] }.\nLista:\n${text}`);
    return cleanAndParseJSON(result).players || [];
};

export const callBannerAI = async (file) => {
    try {
        const extractedText = await extractTextFromImage(file);
        const groqPrompt = `Extraia dados do banner de uma partida de futebol. JSON: {"competition":"...","stadium":"...","date":"...","time":"...","referee":"...","homeTeam":"...","awayTeam":"..."}. Texto extraído:\n${extractedText}`;
        return await callAI(groqPrompt);
    } catch (error) {
        throw new Error(`Banner OCR falhou: ${error.message}`);
    }
};
