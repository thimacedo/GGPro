import { GoogleGenerativeAI } from '@google/generative-ai';

const getApiKey = () => {
  // @ts-ignore
  const envKey = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_GEMINI_API_KEY : undefined;
  const key = envKey || localStorage.getItem('GEMINI_API_KEY');
  if (!key) throw new Error("INVALID_API_KEY");
  return key;
};

const getAI = () => new GoogleGenerativeAI(getApiKey());

const handleAIError = (error: any) => {
  console.error("Erro na API de IA:", error);
  throw error;
};

const sanitizeString = (str: string) => str ? str.trim() : '';

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
  
  // Extrator de fallback usando regex
  try {
    const playerRegex = /([a-zA-ZÀ-ÿ\.\s]+)(?:\s*[\(#]\s*|\s+)(\d+)(?:\s*\))?/g;
    const players = [];
    let match;
    const playersSection = text.split(/(?:PLAYERS|JOGADORES|ESCALAÇÃO|TITULARES)[:\s]/i)[1] || text;
    while ((match = playerRegex.exec(playersSection)) !== null) {
      const name = match[1].trim();
      const number = parseInt(match[2]);
      if (name.length > 2 && !isNaN(number) && name.toLowerCase() !== 'page') {
        players.push({ name, number, isStarter: players.length < 11 }); // defaults to starter for first 11
      }
    }
    if (players.length > 0) return { teams: [{ teamName: "Time Recuperado", players }] };
  } catch (err) {}
  
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

export const parsePlayersFromImage = async (base64Image: string): Promise<any> => {
  try {
    const ai = getAI();
    const model = ai.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent({
      contents: [
        { role: 'user', parts: [
          { inlineData: { data: base64Image, mimeType: "image/jpeg" } },
          { text: `Você é um analista de súmulas de futebol. Extraia TODOS os dados da súmula enviada na imagem para um formato JSON.
          REGRAS INEGOCIÁVEIS:
          1. NOMES: Use APENAS o primeiro nome ou apelido (ex: "João", "Silva"). PROIBIDO nomes completos.
          2. EXTRAÇÃO DE TODOS OS ATLETAS (CRÍTICO): A súmula é dividida em Titulares e Suplentes (Reservas). VOCÊ DEVE EXTRAIR TODOS, SEM EXCEÇÃO. Mantenha os titulares com a tag "isStarter": true, e TODOS os reservas com a tag "isStarter": false. Se a foto não separar, os 11 primeiros são titulares e o resto é reserva. Nunca retorne apenas os titulares se existirem reservas visíveis na listagem.
          3. POSIÇÃO: Apenas um goleiro recebe "position": "GK". Os demais atletas recebem "position": "MF".
          4. INFORMAÇÕES ADICIONAIS: Identifique a cor principal do clube ("primaryColor" em HEX), a cor secundária ("secondaryColor" em HEX), o nome do treinador ("coach") e o nome do Árbitro ("referee"). Crie uma sigla clássica de 3 letras ("shortName", ex: FLA para Flamengo, nunca repita entre times).
          A saída DEVE ser estritamente esse JSON: { teams: [{ teamName, shortName, primaryColor, secondaryColor, coach, players: [{ name, number, isStarter, position }] }], referee: "Nome do Árbitro" }` }
        ]}
      ],
      generationConfig: { responseMimeType: "application/json" }
    });
    return cleanAndParseJSON(result.response.text() || '{}');
  } catch (error) {
    handleAIError(error);
  }
};

export const parseMatchBannerFromImage = async (base64Image: string): Promise<{ matches: any[] } | undefined> => {
  try {
    const ai = getAI();
    const model = ai.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent({
      contents: [
        { role: 'user', parts: [
          { inlineData: { data: base64Image, mimeType: "image/jpeg" } },
          { text: `Retorne um JSON: { "matches": [ { "homeTeam": "Mandante", "awayTeam": "Visitante", "competition": "Campeonato", "stadium": "Local", "date": "Data", "time": "Horário" } ] }` }
        ]}
      ],
      generationConfig: { responseMimeType: "application/json" }
    });
    return cleanAndParseJSON(result.response.text() || '{ "matches": [] }');
  } catch (error) {
    handleAIError(error);
  }
};

export const parseRegulationDocument = async (base64Data: string, mimeType: string): Promise<any> => {
  try {
    const ai = getAI();
    const model = ai.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent({
      contents: [
        { role: 'user', parts: [
          { inlineData: { data: base64Data, mimeType: mimeType } },
          { text: `Extraia as regras em JSON: { "halfDuration": 30, "maxSubstitutions": 5, "penaltyKicks": 3, "summary": "Resumo..." }` }
        ]}
      ],
      generationConfig: { responseMimeType: "application/json" }
    });
    return cleanAndParseJSON(result.response.text() || '{}');
  } catch (error) {
    handleAIError(error);
  }
};

export const processVoiceCommand = async (command: string, homeTeam: any, awayTeam: any, eventsSummary: string): Promise<any> => {
  try {
    const ai = getAI();
    const model = ai.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent({
      contents: [{
        role: 'user', parts: [{ text: `Você é um assistente sênior de narração esportiva.
      COMANDO DE VOZ: "${command}"
      
      DADOS OFICIAIS DA PARTIDA:
      - MANDANTE (home): ${homeTeam.name} (Jogadores: ${homeTeam.players.map((p:any)=>p.number+':'+p.name).join(', ')})
      - VISITANTE (away): ${awayTeam.name} (Jogadores: ${awayTeam.players.map((p:any)=>p.number+':'+p.name).join(', ')})
      
      Sua tarefa é interpretar o comando de voz e extrair DADOS ESTRUTURADOS.
      REGRAS INEGOCIÁVEIS:
      1. TEAM (Equipe): Retorne APENAS "home" ou "away".
      2. PLAYER NUMBER: Extraia o número da camisa do jogador (se disponível).
      3. TYPE: Valores PERMITIDOS rigorosamente: "GOAL", "YELLOW_CARD", "RED_CARD", "SUBSTITUTION", "FOUL", "OFFSIDE", "SHOT", "PENALTY", "START_TIMER", "ANSWER".
      
      Se o comando for para rolar a bola, inciar a partida ou voltar do intervalo use "START_TIMER".
      Se o comando for marcação de penalidade máxima / pênalti, use "PENALTY".

      Retorne APENAS o JSON no formato:
      {
        "type": "GOAL", 
        "team": "home", 
        "playerNumber": 10,
        "playerOutNumber": null,
        "playerInNumber": null,
        "customMessage": null
      }` }]
      }],
      generationConfig: { responseMimeType: "application/json" }
    });
    return cleanAndParseJSON(result.response.text() || '{}');
  } catch (error) {
    handleAIError(error);
  }
};

export const generateMatchReport = async (context: string, timeline: string): Promise<string> => {
  try {
    const ai = getAI();
    const model = ai.getGenerativeModel({ model: "gemini-2.5-flash" });
    const prompt = `Contexto do Jogo:\n${context}\n\nEventos:\n${timeline}\n\nEscreva uma breve crônica esportiva sobre esta partida baseada nos eventos.`;
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error) {
    handleAIError(error);
    return "Erro ao gerar crônica.";
  }
};
