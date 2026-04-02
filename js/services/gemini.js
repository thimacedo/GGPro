import { getApiKey } from './config.js';

async function callGeminiREST(modelNames, contents) {
  console.log("%c🚀 Motor de IA Vanilla Ativo", "color: #00ff00; font-weight: bold; font-size: 14px;");
  const apiKey = getApiKey();
  let lastError = null;
  const apiVersions = ['v1beta', 'v1']; 

  for (const model of modelNames) {
    for (const v of apiVersions) {
      try {
        const url = `https://generativelanguage.googleapis.com/${v}/models/${model}:generateContent?key=${apiKey}`;
        const payload = { contents };
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const data = await response.json();
        if (!response.ok) {
          const msg = data.error?.message || "Indisponível";
          lastError = new Error(msg);
          continue; 
        }

        if (data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
          return data.candidates[0].content.parts[0].text;
        }
      } catch (e) {
        lastError = e;
      }
    }
  }
  throw lastError || new Error("Todos os motores falharam.");
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
    console.warn("Falha no parse JSON", e);
  }
  return {};
};

const ULTRA_GEN_MODELS = [
  "gemini-2.0-flash",
  "gemini-2.0-flash-lite-preview-02-05",
  "gemini-1.5-flash",
  "gemini-flash-latest"
];

export const parsePlayersFromText = async (textList) => {
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
      players.push({ id: Math.random().toString(36).substr(2, 9), name: name.substring(0, 20), number: num, position: isGK ? 'GK' : 'MF', isStarter: starterCount < 11 });
      starterCount++;
    }
  }
  return { players };
};

export const parsePlayersFromImage = async (base64Image, mimeType = "image/jpeg") => {
  const contents = [{
    parts: [
      { inline_data: { mime_type: mimeType, data: base64Image } },
      { text: `Extraia JSON de jogadores: { "teams": [{ "teamName": "X", "players": [{ "name": "Y", "number": 1, "isStarter": true, "position": "GK" }], "commission": "..." }], "matchDetails": {...} }` }
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

export const processVoiceCommand = async (command, homeTeam, awayTeam, eventsSummary) => {
  const contents = [{
    parts: [{ text: `Comando: "${command}". Equipes: ${homeTeam.name} vs ${awayTeam.name}. Retorne ARRAY JSON: [{type, team, playerNumber, description}].` }]
  }];
  const text = await callGeminiREST(ULTRA_GEN_MODELS, contents);
  return cleanAndParseJSON(text);
};
