// Motor de IA Geradora - Versão Ultra-Flash (Engine v6)
// Otimizado para modelos de Próxima e Ultra Geração (Gemini 2.5, 3.0 e 3.1).

const getApiKey = () => {
  // @ts-ignore
  const envKey = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_GEMINI_API_KEY : undefined;
  const key = envKey || localStorage.getItem('GEMINI_API_KEY');
  if (!key) throw new Error("INVALID_API_KEY");
  return key;
};

/**
 * 🛠️ MOTOR DE ENGENHARIA v6 (Ultra-Resiliente):
 * Focado nos identificadores "Next-Gen" detectados na conta do usuário.
 */
async function callGeminiREST(modelNames: string[], contents: any) {
  console.log("%c🚀 Motor de IA v6 Ativo", "color: #00ff00; font-weight: bold; font-size: 14px;");
  const apiKey = getApiKey();
  let lastError: any = null;

  // Priorizamos v1beta pois as Ultra-IAs (2.5+) residem lá no canal de preview.
  const apiVersions = ['v1beta', 'v1']; 

  for (const model of modelNames) {
    for (const v of apiVersions) {
      try {
        const url = `https://generativelanguage.googleapis.com/${v}/models/${model}:generateContent?key=${apiKey}`;
        
        // Payload Minimalista (Custo Zero de Configuração para máxima compatibilidade)
        const payload = { contents };

        console.log(`Tentando Ultra-IA: ${model} [${v}]...`);
        
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (!response.ok) {
          const msg = data.error?.message || "Indisponível";
          console.warn(`Pulo: ${model} [${v}]:`, msg);
          lastError = new Error(msg);
          continue; 
        }

        if (data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
          return data.candidates[0].content.parts[0].text;
        }
      } catch (e: any) {
        console.error(`Falha Técnica: ${model} [${v}]:`, e.message);
        lastError = e;
      }
    }
  }
  throw lastError || new Error("Todos os motores de próxima geração falharam.");
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
    console.warn("Falha no parse JSON, tentando recuperação...", e);
  }
  return { teams: [] };
};

// 📋 IDENTIFICADORES DE ULTRA-GERAÇÃO (Detectados na sua Chave de API)
const ULTRA_GEN_MODELS = [
  "gemini-3.1-flash-lite-preview",
  "gemini-2.5-flash-lite",
  "gemini-flash-lite-latest",
  "gemini-3-flash-preview",
  "gemini-1.5-flash", 
  "gemini-1.5-pro"
];

// 🚀 PROCESSAMENTO OFFLINE: Texto Colado
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

export const parsePlayersFromImage = async (base64Image: string, mimeType: string = "image/jpeg"): Promise<any> => {
  const contents = [{
    parts: [
      { inline_data: { mime_type: mimeType, data: base64Image } },
      { text: `Extraia JSON de jogadores da súmula: { "teams": [{ "teamName": "Nome", "players": [{ "name": "Nome", "number": 10, "isStarter": true, "position": "MF" }] }], "referee": "Nome" }` }
    ]
  }];
  const text = await callGeminiREST(ULTRA_GEN_MODELS, contents);
  return cleanAndParseJSON(text);
};

export const parseMatchBannerFromImage = async (base64Image: string): Promise<{ matches: any[] } | undefined> => {
  const contents = [{
    parts: [
      { inline_data: { mime_type: "image/jpeg", data: base64Image } },
      { text: `Extraia JSON dos jogos: { "matches": [ { "homeTeam": "A", "awayTeam": "B", "competition": "X", "stadium": "Y", "date": "Z", "time": "W" } ] }` }
    ]
  }];
  const text = await callGeminiREST(ULTRA_GEN_MODELS, contents);
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
  const text = await callGeminiREST(ULTRA_GEN_MODELS, contents);
  return cleanAndParseJSON(text);
};

export const processVoiceCommand = async (command: string, homeTeam: any, awayTeam: any, eventsSummary: string): Promise<any> => {
  const contents = [{
    parts: [{ text: `Comando: "${command}". Equipes: ${homeTeam.name} vs ${awayTeam.name}. Retorne ARRAY JSON de ações [{type, team, playerNumber, isAwarded, playerOutNumber, playerInNumber}].` }]
  }];
  const text = await callGeminiREST(ULTRA_GEN_MODELS, contents);
  return cleanAndParseJSON(text);
};

export const generateMatchReport = async (context: string, timeline: string): Promise<string> => {
  const contents = [{
    parts: [{ text: `Escreva cronica: Contexto: ${context}, Eventos: ${timeline}` }]
  }];
  return await callGeminiREST(ULTRA_GEN_MODELS, contents);
};
