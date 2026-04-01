// Motor de IA Geradora - Versão REST Direta (Engenharia de Missão Crítica)
// Bypassing SDK errors and endpoint mismatches.

const getApiKey = () => {
  // @ts-ignore
  const envKey = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_GEMINI_API_KEY : undefined;
  const key = envKey || localStorage.getItem('GEMINI_API_KEY');
  if (!key) throw new Error("INVALID_API_KEY");
  return key;
};

/**
 * 🛠️ MOTOR DE ENGENHARIA v3: Conexão direta via REST com fallback de versão e modelo.
 * Resolve erros 400 (Bad Request), 404 (Not Found) e 500 (Internal).
 */
async function callGeminiREST(modelNames: string[], contents: any) {
  const apiKey = getApiKey();
  let lastError: any = null;

  const apiVersions = ['v1', 'v1beta']; // Tenta v1 (estável) e depois v1beta (novos modelos)

  for (const model of modelNames) {
    for (const v of apiVersions) {
      try {
        const url = `https://generativelanguage.googleapis.com/${v}/models/${model}:generateContent?key=${apiKey}`;
        
        // Payload Ultraliviano: Removida generationConfig para evitar erros 400 em certas regiões
        const payload = { contents };

        console.log(`Tentando IA: ${model} [${v}]...`);
        
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (!response.ok) {
          const msg = data.error?.message || "Erro desconhecido";
          console.warn(`Falha no modelo ${model} [${v}]:`, msg);
          lastError = new Error(msg);
          continue; // Tenta a próxima versão ou próximo modelo
        }

        if (data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
          return {
            response: {
              text: () => data.candidates[0].content.parts[0].text
            }
          };
        }
      } catch (e: any) {
        console.error(`Erro de rede no modelo ${model} [${v}]:`, e.message);
        lastError = e;
      }
    }
  }
  throw lastError || new Error("Todos os modelos e versões de API falharam.");
}

const handleAIError = (error: any) => {
  console.error("ERRO CRÍTICO IA:", error);
  throw error;
};

const cleanAndParseJSON = (text: string): any => {
  try {
    let clean = text.replace(/```json/g, '').replace(/```/g, '');
    const firstBrace = clean.indexOf('{');
    const lastBrace = clean.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1) {
      return JSON.parse(clean.substring(firstBrace, lastBrace + 1));
    }
  } catch (e) {
    console.warn("Falha no parse JSON, tentando recuperação de texto...", e);
  }
  return { teams: [] };
};

// 🚀 PROCESSAMENTO OFFLINE: Custo Zero de Tokens para Texto Colado
export const parsePlayersFromText = async (textList: string): Promise<any> => {
  return new Promise((resolve) => {
    try {
      const lines = textList.split(/\r?\n/);
      const players: any[] = [];
      let starterCount = 0;
      for (let line of lines) {
        line = line.trim();
        if (!line || line.length < 3) continue;
        if (/titulares|reservas|banco|comissão|técnico|coach|elenco/i.test(line)) continue;
        const match = line.match(/^[\D]*(\d{1,2})[\s\-\.\,:]+(.+)$/);
        let num = 0;
        let name = '';
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
          players.push({
            name: name.substring(0, 20),
            number: num,
            position: isGK ? 'GK' : 'MF',
            isStarter: starterCount < 11 
          });
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
  try {
    const contents = [{
      parts: [
        { inline_data: { mime_type: mimeType, data: base64Image } },
        { text: `Extraia os dados da súmula enviada na imagem para um formato JSON estritamente conforme o exemplo:
        { "teams": [{ "teamName": "Nome", "players": [{ "name": "Nome", "number": 10, "isStarter": true, "position": "MF" }] }], "referee": "Nome" }
        Use apenas o primeiro nome/apelido dos jogadores.` }
      ]
    }];
    const result = await callGeminiREST(["gemini-1.5-flash", "gemini-1.5-pro", "gemini-pro-vision"], contents);
    return cleanAndParseJSON(result.response.text());
  } catch (error) {
    handleAIError(error);
  }
};

export const parseMatchBannerFromImage = async (base64Image: string): Promise<{ matches: any[] } | undefined> => {
  try {
    const contents = [{
      parts: [
        { inline_data: { mime_type: "image/jpeg", data: base64Image } },
        { text: `Retorne JSON: { "matches": [ { "homeTeam": "A", "awayTeam": "B", "competition": "X", "stadium": "Y", "date": "Z", "time": "W" } ] }` }
      ]
    }];
    const result = await callGeminiREST(["gemini-1.5-flash", "gemini-1.5-pro"], contents);
    return cleanAndParseJSON(result.response.text() || '{ "matches": [] }');
  } catch (error) {
    handleAIError(error);
  }
};

export const parseRegulationDocument = async (base64Data: string, mimeType: string): Promise<any> => {
  try {
    const contents = [{
      parts: [
        { inline_data: { mime_type: mimeType, data: base64Data } },
        { text: `Extraia JSON de regras: { "halfDuration": 30, "maxSubstitutions": 5, "penaltyKicks": 3, "summary": "..." }` }
      ]
    }];
    const result = await callGeminiREST(["gemini-1.5-flash", "gemini-1.5-pro"], contents);
    return cleanAndParseJSON(result.response.text() || '{}');
  } catch (error) {
    handleAIError(error);
  }
};

export const processVoiceCommand = async (command: string, homeTeam: any, awayTeam: any, eventsSummary: string): Promise<any> => {
  try {
    const contents = [{
      parts: [{ text: `DADOS: home: ${homeTeam.name}, away: ${awayTeam.name}. COMANDO: "${command}". 
      Retorne ARRAY JSON de ações [{type, team, playerNumber, isAwarded, playerOutNumber, playerInNumber}].` }]
    }];
    const result = await callGeminiREST(["gemini-1.5-flash", "gemini-1.5-pro"], contents);
    return cleanAndParseJSON(result.response.text());
  } catch (error) {
    handleAIError(error);
  }
};

export const generateMatchReport = async (context: string, timeline: string): Promise<string> => {
  try {
    const contents = [{
      parts: [{ text: `Escreva uma cronica esportiva:\nContexto: ${context}\nEventos: ${timeline}` }]
    }];
    const result = await callGeminiREST(["gemini-1.5-flash"], contents);
    return result.response.text();
  } catch (error) {
    handleAIError(error);
    return "Erro ao gerar crônica.";
  }
};
