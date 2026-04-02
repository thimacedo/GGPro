async function callGeminiProxy(modelName, contents) {
  console.log(`%c🚀 Chamando Proxy: ${modelName}`, "color: #3b82f6; font-weight: bold;");
  
  try {
    const response = await fetch('/api/ai/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents, model: modelName })
    });

    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.error || "Erro no Proxy AI");
    }

    if (data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
      return data.candidates[0].content.parts[0].text;
    }
    throw new Error("Resposta inválida da IA.");
  } catch (e) {
    console.error("Falha no Proxy AI:", e.message);
    throw e;
  }
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
  
  for (const model of ULTRA_GEN_MODELS) {
    try {
      const text = await callGeminiProxy(model, contents);
      return cleanAndParseJSON(text);
    } catch (e) {
      console.warn(`Próximo modelo: ${model} falhou.`);
    }
  }
  throw new Error("Todos os modelos de IA falharam.");
};

export const parseMatchBannerFromImage = async (base64Image) => {
  const contents = [{
    parts: [
      { inline_data: { mime_type: "image/jpeg", data: base64Image } },
      { text: `Extraia JSON dos jogos: { "matches": [ { "homeTeam": "A", "awayTeam": "B", "competition": "X", "stadium": "Y", "date": "Z", "time": "W" } ] }` }
    ]
  }];
  
  for (const model of ULTRA_GEN_MODELS) {
    try {
      const text = await callGeminiProxy(model, contents);
      const data = cleanAndParseJSON(text);
      return data.matches ? data : { matches: [] };
    } catch (e) {
      console.warn(`Próximo modelo: ${model} falhou.`);
    }
  }
  return { matches: [] };
};

export const processVoiceCommand = async (command, homeTeam, awayTeam, eventsSummary) => {
  const contents = [{
    parts: [{ text: `Comando: "${command}". Equipes: ${homeTeam.name} vs ${awayTeam.name}. Retorne ARRAY JSON: [{type, team, playerNumber, description}].` }]
  }];
  
  for (const model of ULTRA_GEN_MODELS) {
    try {
      const text = await callGeminiProxy(model, contents);
      return cleanAndParseJSON(text);
    } catch (e) {
      console.warn(`Próximo modelo: ${model} falhou.`);
    }
  }
  return [];
};
