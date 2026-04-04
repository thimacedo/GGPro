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

        if (data.candidates && 
            Array.isArray(data.candidates) && 
            data.candidates.length > 0 &&
            data.candidates[0].content &&
            data.candidates[0].content.parts &&
            Array.isArray(data.candidates[0].content.parts) &&
            data.candidates[0].content.parts.length > 0 &&
            data.candidates[0].content.parts[0].text) {
          return data.candidates[0].content.parts[0].text;
        } else {
          console.warn("Resposta da IA em formato inesperado:", JSON.stringify(data, null, 2));
          lastError = new Error("Resposta inválida da IA");
          continue;
        }
      } catch (e) {
        console.error("Erro Crítico no Reconhecimento/IA:", e);
        // Se for erro de rede ou API, exibir mensagem mais clara
        const errorMsg = e.message?.includes(' motores') ? "Servidores de IA indisponíveis no momento." : "Falha ao interpretar comando de rádio.";
        if (typeof window !== 'undefined' && window.addToast) {
          window.addToast("Erro de IA", errorMsg, "error");
        }
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

// [EXTRA] Utilitário para conversão de arquivo (Browser)
const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = error => reject(error);
    });
};

/**
 * 📦 ORQUESTRADOR DE DOCUMENTOS (Processamento Unificado)
 * Usado pelo app.js e modals.js para tratar uploads de arquivos.
 */
export const processMatchDocument = async (file, type) => {
    const base64 = await fileToBase64(file);
    const mimeType = file.type || "image/jpeg";

    if (type === 'sumula') {
        return await parsePlayersFromImage(base64, mimeType);
    } else if (type === 'rules') {
        return await parseRegulationDocument(base64, mimeType);
    } else {
        throw new Error(`Tipo de documento desconhecido: ${type}`);
    }
};

/**
 * 🎙️ MOTOR DE INTERPRETAÇÃO DE VOZ / COMANDO
 * Converte linguagem natural em JSON de evento de partida usando a Ultra-IA.
 */
export async function processVoiceCommand(text, state) {
  const contents = [{
    parts: [{ text: `
      Você é um assistente de narração esportiva. Sua tarefa é transformar a descrição de um lance em um objeto JSON estruturado.
      
      LANCE: "${text}"
      
      CONTEXTO:
      - Mandante: ${state.homeTeam?.name} (${state.homeTeam?.shortName})
      - Visitante: ${state.awayTeam?.name} (${state.awayTeam?.shortName})
      - Placar: ${state.homeTeam?.score} x ${state.awayTeam?.score}
      
      REGRAS DE RETORNO:
      1. Campo "type": Escolha entre GOAL, YELLOW_CARD, RED_CARD, SUBSTITUTION, FOUL, CORNER, CHANCE.
      2. Campo "teamSide": "home" ou "away".
      3. Campo "playerNumber": Apenas o número (inteiro), se identificável.
      4. Campo "description": Narração curta e profissional do lance (Ex: "GOL! Finalização precisa do camisa 10").
      5. Campo "isGoal": true apenas se for gol confirmado.

      RETORNE APENAS O JSON NO FORMATO:
      { "type": "GOAL", "teamSide": "home", "playerNumber": 10, "description": "...", "isGoal": true }
    ` }]
  }];

  try {
    const resultText = await callGeminiREST(ULTRA_GEN_MODELS, contents);
    return cleanAndParseJSON(resultText);
  } catch (error) {
    console.warn("Falha no parse do comando IA, usando fallback manual.", error);
    return { type: 'CHANCE', teamSide: 'home', description: text, isGoal: false };
  }
}

export const parseMatchCommand = processVoiceCommand;

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