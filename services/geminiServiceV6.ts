// 🚀 Motor de IA Ultra-Geracional (Engine v6.3 - "Nuclear Edition")
// Focado exclusivamente nos modelos Gemini 3.1, 3.0 e 2.5 detectados na sua conta.

const getApiKey = () => {
  // @ts-ignore - Tenta o padrão Vite
  const viteKey = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_GEMINI_API_KEY : undefined;
  
  // @ts-ignore - Tenta injeção via define do Vite ou environment global
  const processKey = typeof process !== 'undefined' && process.env ? (process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || process.env.API_KEY) : undefined;
  
  const key = viteKey || processKey || localStorage.getItem('VITE_GEMINI_API_KEY') || localStorage.getItem('GEMINI_API_KEY');
  
  if (!key) {
    console.error("❌ Erro: Chave de API não encontrada.");
    throw new Error("INVALID_API_KEY");
  }
  return key;
};

/**
 * 🛠️ MOTOR NUCLEAR: Suporte prioritário às Ultra-IAs com fallback de alta segurança.
 */
async function callGeminiREST(modelNames: string[], contents: any) {
  console.log("%c🚀 Motor Ultra-IA 3.1 Ativo (Nuclear Edition)", "color: #00ff00; font-weight: bold; font-size: 14px;");
  const apiKey = getApiKey();
  let lastError: any = null;

  for (const model of modelNames) {
    // Tentamos v1beta primeiro, pois modelos "Lite" e "Preview" (3.1+) costumam residir lá.
    const apiVersions = ['v1beta', 'v1'];
    for (const v of apiVersions) {
      try {
        const url = `https://generativelanguage.googleapis.com/${v}/models/${model}:generateContent?key=${apiKey}`;
        const payload = { contents };

        console.log(`IA: ${model} [${v}]...`);
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const data = await response.json();
        if (!response.ok) {
          console.warn(`Pulo: ${model} [${v}]:`, data.error?.message || "Erro");
          lastError = new Error(data.error?.message || "Serviço Indisponível");
          continue; 
        }

        if (data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
          return data.candidates[0].content.parts[0].text;
        }
      } catch (e: any) {
        lastError = e;
      }
    }
  }
  throw lastError || new Error("Todos os motores de ultra-geração (3.1/2.5) falharam.");
}

const cleanAndParseJSON = (text: string): any => {
  try {
    let clean = text.replace(/```json/g, '').replace(/```/g, '');
    const firstBrace = clean.indexOf('{');
    const lastBrace = clean.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1) {
      return JSON.parse(clean.substring(firstBrace, lastBrace + 1));
    }
  } catch (e) {
    console.warn("Recuperação JSON necessária...");
  }
  return { teams: [] };
};

// 📋 IDENTIFICADORES DE GERAÇÃO ESTÁVEL E EXPERIMENTAL
const NEXT_GEN_MODELS = [
  "gemini-2.0-flash-exp",
  "gemini-1.5-flash",
  "gemini-1.5-pro",
  "gemini-2.0-pro-exp"
];

export const parsePlayersFromImage = async (base64Image: string, mimeType: string = "image/jpeg"): Promise<any> => {
  const contents = [{
    parts: [
      { inline_data: { mime_type: mimeType, data: base64Image } },
      { text: `Sua tarefa é extrair os dados de jogadores desta súmula em formato JSON, seguindo REGRAS ESTRITAS de formatação de nomes:

1. IDENTIFICAÇÃO DE TITULARES E RESERVAS:
   - A marcação é variada: observe cabeçalhos "TITU"/"TITULARES" e "RES"/"RESERVAS", abreviações como "T" e "R", ou apenas um "T" marcado, ou até um asterisco (*) ao lado do nome dos titulares.
   - Jogadores identificados como titulares devem ter "isStarter": true.
   - Jogadores identificados como reservas devem ter "isStarter": false.

2. FORMATAÇÃO DO NOME DO JOGADOR (MUITO IMPORTANTE):
   - SE houver uma coluna "APELIDO" ou uma indicação clara de um nome curto/chamamento ao lado do nome completo, USE O APELIDO.
   - CASO CONTRÁRIO (se tiver o nome completo), use apenas o PRIMEIRO NOME do jogador.
   - EXCEÇÃO DE REPETIÇÃO: Se o primeiro nome se repetir no mesmo time, use o PRIMEIRO E O SEGUNDO NOME para diferenciar (Ex: "João Pedro" e "João Lucas").
   
3. IDENTIFICAÇÃO DE GOLEIROS:
   - Identifique goleiros (GK) pelos números 1 ou 12, ou pelas marcações (G), (GK), "Gol" ou "Goleiro".

4. DADOS COMPLEMENTARES:
   - Extraia a COMISSÃO TÉCNICA (Treinadores, Auxiliares, etc.) de cada equipe.
   - Extraia DETALHES DA PARTIDA: Campeonato, Árbitro, Estádio, Data e Hora.

EXTRAIA O JSON NESTE FORMATO:
{ 
  "teams": [
    { 
      "teamName": "Nome do Time", 
      "players": [{ "name": "Nome formatado", "number": 10, "isStarter": true, "position": "MF" ou "GK" }],
      "commission": "Lista de técnicos e auxiliares"
    }
  ], 
  "matchDetails": {
    "competition": "Nome da Competição",
    "referee": "Nome do Árbitro",
    "stadium": "Local/Campo",
    "date": "DD/MM/AAAA",
    "time": "HH:MM"
  }
}` }
    ]
  }];
  const text = await callGeminiREST(NEXT_GEN_MODELS, contents);
  return cleanAndParseJSON(text);
};

export const parseMatchBannerFromImage = async (base64Image: string): Promise<{ matches: any[] } | undefined> => {
  const contents = [{
    parts: [
      { inline_data: { mime_type: "image/jpeg", data: base64Image } },
      { text: `Extraia JSON: { "matches": [ { "homeTeam": "A", "awayTeam": "B", "competition": "X", "stadium": "Y", "date": "Z", "time": "W" } ] }` }
    ]
  }];
  const text = await callGeminiREST(NEXT_GEN_MODELS, contents);
  const data = cleanAndParseJSON(text);
  return data.matches ? data : { matches: [] };
};

export const parseRegulationDocument = async (base64Data: string, mimeType: string): Promise<any> => {
  const contents = [{
    parts: [
      { inline_data: { mime_type: mimeType, data: base64Data } },
      { text: `Extraia JSON de regras: { "halfDuration": 30, "maxSubstitutions": 5, "penaltyKicks": 3, "summary": "..." }` }
    ]
  }];
  const text = await callGeminiREST(NEXT_GEN_MODELS, contents);
  return cleanAndParseJSON(text);
};

export const processVoiceCommand = async (command: string, homeTeam: any, awayTeam: any, eventsSummary: string): Promise<any> => {
  const contents = [{
    parts: [{ text: `DADOS: home: ${homeTeam.name}, away: ${awayTeam.name}. COMANDO: "${command}". Retorne ARRAY JSON de ações [{type, team, playerNumber, isAwarded, playerOutNumber, playerInNumber}].` }]
  }];
  const text = await callGeminiREST(NEXT_GEN_MODELS, contents);
  return cleanAndParseJSON(text);
};

export const generateMatchReport = async (context: string, timeline: string): Promise<string> => {
  const contents = [{
    parts: [{ text: `Escreva cronica: Contexto: ${context}, Eventos: ${timeline}` }]
  }];
  return await callGeminiREST(NEXT_GEN_MODELS, contents);
};

export const parsePlayersFromText = async (textList: string): Promise<any> => {
  return new Promise((resolve) => {
    try {
      const lines = textList.split(/\r?\n/);
      const players: any[] = [];
      let starterCount = 0;
      for (let line of lines) {
        line = line.trim();
        if (!line || line.length < 3) continue;
        const match = line.match(/^[\D]*(\d{1,2})[\s\-\.\,:]+(.+)$/);
        let num = 0, name = '';
        if (match) {
          num = parseInt(match[1], 10);
          name = match[2].trim().replace(/[\*\-\_]/g, '').trim(); 
        } else {
          name = line.replace(/^[\d\s\-\.\,:]+/, '').replace(/[\*\-\_]/g, '').trim();
          num = players.length + 1; 
        }
        if (name.length > 2 && !name.toLowerCase().includes('treinador')) {
          let isGK = false;
          if (/(\(gol\)|\(gk\)|goleiro)/i.test(name) || (num === 1 && starterCount === 0)) {
            isGK = true;
            name = name.replace(/\(gol\)|\(gk\)|goleiro|\(\)/ig, '').trim();
          }
          players.push({ name: name.substring(0, 20), number: num, position: isGK ? 'GK' : 'MF', isStarter: starterCount < 11 });
          starterCount++;
        }
      }
      resolve({ players });
    } catch (e) {
      resolve({ players: [] });
    }
  });
};
