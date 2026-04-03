// Motor de IA Geradora - Versão Ultra-Flash (Engine v6)
// Otimizado para modelos de Próxima e Ultra Geração (Gemini 2.5, 3.0 e 3.1).

import { getApiKey } from './config.js';

/**
 * 🛠️ MOTOR DE ENGENHARIA v6 (Ultra-Resiliente):
 * Focado nos identificadores "Next-Gen" detectados na conta do usuário.
 */
async function callGeminiREST(modelNames, contents) {
  console.log("%c🚀 Motor de IA v6 Ativo", "color: #00ff00; font-weight: bold; font-size: 14px;");
  const apiKey = getApiKey();
  let lastError = null;

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
      } catch (e) {
        console.error(`Falha Técnica: ${model} [${v}]:`, e.message);
        lastError = e;
      }
    }
  }
  throw lastError || new Error("Todos os motores de próxima geração falharam.");
}

const cleanAndParseJSON = (text) => {
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

// 📋 IDENTIFICADORES DE GERAÇÃO ESTÁVEL E EXPERIMENTAL
const ULTRA_GEN_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-flash-latest",
  "gemini-2.5-flash-lite"
];

// 🚀 PROCESSAMENTO OFFLINE: Texto Colado
export const parsePlayersFromText = async (textList) => {
  return new Promise((resolve) => {
    try {
      const lines = textList.split(/\r?\n/);
      const players = [];
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

export const parsePlayersFromImage = async (base64Image, mimeType = "image/jpeg") => {
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
  const text = await callGeminiREST(ULTRA_GEN_MODELS, contents);
  return cleanAndParseJSON(text);
};

export const parseMatchBannerFromImage = async (base64Image) => {
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

export const parseRegulationDocument = async (base64Data, mimeType) => {
  const contents = [{
    parts: [
      { inline_data: { mime_type: mimeType, data: base64Data } },
      { text: `Extraia JSON de regras: { "halfDuration": 30, "maxSubstitutions": 5, "penaltyKicks": 3, "summary": "..." }` }
    ]
  }];
  const text = await callGeminiREST(ULTRA_GEN_MODELS, contents);
  return cleanAndParseJSON(text);
};

export const processVoiceCommand = async (command, homeTeam, awayTeam, eventsSummary) => {
  const contents = [{
    parts: [{ text: `
      Você é o assistente de narração "Narrador Pro".
      Comando de Voz: "${command}"
      Equipes: ${homeTeam.name} (${homeTeam.shortName}) vs ${awayTeam.name} (${awayTeam.shortName})
      Contexto Atual (Eventos recentes): ${eventsSummary}

      Tarefa: Converta o comando de voz em uma lista de ações estruturadas.
      
      Regras:
      1. Identifique o tipo de evento: GOAL, YELLOW_CARD, RED_CARD, SUBSTITUTION, FOUL, CORNER, OFFSIDE, SHOT, VAR, ANSWER, CORRECTION.
      2. Identifique o time (home/away).
      3. Identifique o número do jogador, se mencionado.
      4. Se for uma CORREÇÃO (ex: "Anule o gol", "Não foi falta"), use type: 'CORRECTION'.
      5. Se for uma PERGUNTA sobre o jogo (ex: "Quem fez o gol?", "Quantas faltas?"), use type: 'ANSWER' e forneça a resposta em 'answerText'.
      
      Retorne APENAS um ARRAY JSON no formato:
      [{
        "type": "tipo",
        "team": "home"|"away"|"none",
        "playerNumber": número,
        "description": "breve descrição em pt-BR",
        "answerText": "texto da resposta se for ANSWER",
        "playerOutNumber": número (se SUB),
        "playerInNumber": número (se SUB)
      }]
    ` }]
  }];
  const text = await callGeminiREST(ULTRA_GEN_MODELS, contents);
  const result = cleanAndParseJSON(text);
  return Array.isArray(result) ? result : (result.actions || [result]);
};

export const generateMatchReport = async (context, timeline) => {
  const contents = [{
    parts: [{ text: `
      Escreva uma crônica esportiva profissional, emocionante e detalhada para o site "Narrador Pro".
      
      CONTEXTO: ${context}
      CRONOLOGIA DOS EVENTOS: ${timeline}
      
      REQUISITOS:
      - Título impactante.
      - Lead resumindo o resultado.
      - Descrição dos momentos chave.
      - Tom jornalístico de alta qualidade.
      - Entre 200 e 400 palavras.
      - Use Markdown.
    ` }]
  }];
  return await callGeminiREST(ULTRA_GEN_MODELS, contents);
};