// Motor de IA Geradora - Versão REST Estável (v1)
// Bypassing the SDK to resolve persistent 404/v1beta issues.

const getApiKey = () => {
  // @ts-ignore
  const envKey = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_GEMINI_API_KEY : undefined;
  const key = envKey || localStorage.getItem('GEMINI_API_KEY');
  if (!key) throw new Error("INVALID_API_KEY");
  return key;
};

// 🛠️ MOTOR DE ENGENHARIA: Conexão direta via REST para evitar bugs de SDK
async function callGeminiREST(modelNames: string[], payload: any) {
  const apiKey = getApiKey();
  let lastError: any = null;

  for (const model of modelNames) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        console.warn(`Modelo ${model} falhou (v1):`, data.error || 'Erro desconhecido');
        lastError = new Error(data.error?.message || `Erro ${response.status}`);
        continue;
      }

      if (data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
        return {
          response: {
            text: () => data.candidates[0].content.parts[0].text
          }
        };
      }
      
      throw new Error("Resposta da IA vazia ou malformada.");
    } catch (e: any) {
      lastError = e;
      if (e.message?.includes('404')) {
        console.warn(`Modelo ${model} não encontrado no v1, tentando próximo...`);
        continue;
      }
      throw e;
    }
  }
  throw lastError || new Error("Todos os modelos (REST) falharam.");
}

const handleAIError = (error: any) => {
  console.error("Erro na API de IA (REST):", error);
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
    console.warn("Falha no JSON parse primário", e);
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
      console.error("Erro no parser local:", e);
      resolve({ players: [] });
    }
  });
};

export const parsePlayersFromImage = async (base64Image: string, mimeType: string = "image/jpeg"): Promise<any> => {
  try {
    const payload = {
      contents: [{
        parts: [
          { inline_data: { mime_type: mimeType, data: base64Image } },
          { text: `Você é um analista de súmulas de futebol. Extraia TODOS os dados da súmula enviada na imagem para um formato JSON.
          REGRAS INEGOCIÁVEIS:
          1. NOMES: Use APENAS o primeiro nome ou apelido.
          2. EXTRAÇÃO: Mantenha os titulares com "isStarter": true, e reservas com "isStarter": false.
          3. POSIÇÃO: Apenas um goleiro recebe "GK", o restante "MF".
          Saída JSON: { teams: [{ teamName, shortName, primaryColor, secondaryColor, coach, players: [{ name, number, isStarter, position }] }], referee: "Nome do Árbitro" }` }
        ]
      }],
      generationConfig: { response_mime_type: "application/json" }
    };
    
    // Lista de modelos na ordem de prioridade para REST v1
    const result = await callGeminiREST(["gemini-1.5-flash", "gemini-1.5-pro", "gemini-1.0-pro-vision-latest"], payload);
    return cleanAndParseJSON(result.response.text());
  } catch (error) {
    handleAIError(error);
  }
};

export const parseMatchBannerFromImage = async (base64Image: string): Promise<{ matches: any[] } | undefined> => {
  try {
    const payload = {
      contents: [
        { role: 'user', parts: [
          { inline_data: { data: base64Image, mime_type: "image/jpeg" } },
          { text: `Retorne um JSON: { "matches": [ { "homeTeam": "Mandante", "awayTeam": "Visitante", "competition": "Campeonato", "stadium": "Local", "date": "Data", "time": "Horário" } ] }` }
        ]}
      ],
      generationConfig: { response_mime_type: "application/json" }
    };
    const result = await callGeminiREST(["gemini-1.5-flash", "gemini-1.5-pro"], payload);
    return cleanAndParseJSON(result.response.text() || '{ "matches": [] }');
  } catch (error) {
    handleAIError(error);
  }
};

export const parseRegulationDocument = async (base64Data: string, mimeType: string): Promise<any> => {
  try {
    const payload = {
      contents: [
        { role: 'user', parts: [
          { inline_data: { data: base64Data, mime_type: mimeType } },
          { text: `Extraia as regras em JSON: { "halfDuration": 30, "maxSubstitutions": 5, "penaltyKicks": 3, "summary": "Resumo..." }` }
        ]}
      ],
      generationConfig: { response_mime_type: "application/json" }
    };
    const result = await callGeminiREST(["gemini-1.5-flash", "gemini-1.5-pro"], payload);
    return cleanAndParseJSON(result.response.text() || '{}');
  } catch (error) {
    handleAIError(error);
  }
};

export const processVoiceCommand = async (command: string, homeTeam: any, awayTeam: any, eventsSummary: string): Promise<any> => {
  try {
    const payload = {
      contents: [{
        parts: [{ text: `DADOS: home: ${homeTeam.name}, away: ${awayTeam.name}. COMANDO: "${command}". 
        Retorne ARRAY JSON de ações {type, team, playerNumber, isAwarded, playerOutNumber, playerInNumber}.` }]
      }],
      generationConfig: { response_mime_type: "application/json" }
    };

    const result = await callGeminiREST(["gemini-1.5-flash", "gemini-1.5-pro"], payload);
    return cleanAndParseJSON(result.response.text());
  } catch (error) {
    handleAIError(error);
  }
};

export const generateMatchReport = async (context: string, timeline: string): Promise<string> => {
  try {
    const payload = {
      contents: [{
        parts: [{ text: `Cronica do jogo:\nContexto: ${context}\nEventos: ${timeline}` }]
      }]
    };
    const result = await callGeminiREST(["gemini-1.5-flash"], payload);
    return result.response.text();
  } catch (error) {
    handleAIError(error);
    return "Erro ao gerar crônica.";
  }
};
