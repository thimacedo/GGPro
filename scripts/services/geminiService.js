/**
 * @fileoverview Serviço de integração com Google Gemini via Proxy Seguro
 */

const PROXY_ENDPOINT = '/api/ai/generate';

/**
 * Converte um arquivo (Imagem/PDF) para Base64
 * @param {File} file
 * @returns {Promise<Object>} Formato inlineData
 */
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      return reject(new Error("Arquivo inválido."));
    }
    
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve({
      inlineData: {
        data: reader.result.split(',')[1],
        mimeType: file.type
      }
    });
    reader.onerror = error => reject(error);
  });
}

/**
 * Processa documentos (Súmulas/Regulamentos) via Proxy Seguro
 * Atualizado para as versões estáveis Gemini 2.5 Pro e Gemini 2.5 Flash.
 * @param {File} file Documento a ser analisado
 * @param {'sumula' | 'banner' | 'rules'} type Tipo do documento
 * @returns {Promise<Object>} Dados estruturados extraídos
 */
export async function processMatchDocument(file, type) {
  if (!file) throw new Error("Arquivo não fornecido.");

  // Direcionamento de modelo baseado na complexidade cognitiva da tarefa
  const model = type === 'rules' ? 'gemini-2.5-pro' : 'gemini-2.5-flash';
  const filePart = await fileToBase64(file);
  
  const prompt = type === 'rules' 
    ? `Analise este regulamento e extraia regras de tempo de jogo, limites de substituição e critérios de desempate em formato JSON. Estrutura esperada: {"halfDuration": number, "maxSubstitutions": number, "penaltyKicks": number, "summary": string}`
    : `Analise esta súmula/escalação. Extraia os jogadores e retorne estritamente JSON: { "teamName": "Nome", "players": [{ "number": 0, "name": "Nome", "position": "GK|DF|MF|FW", "isStarter": true }] }`;

  const payload = {
    model: model,
    contents: [{ parts: [{ text: prompt }, filePart] }],
    generationConfig: { temperature: 0.1, responseMimeType: "application/json" }
  };

  try {
    const response = await fetch(PROXY_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || "Falha na resposta do Proxy.");
    }

    const data = await response.json();
    
    if (!data.candidates || data.candidates.length === 0) {
      throw new Error("Nenhum candidato retornado pela API.");
    }

    const rawText = data.candidates[0].content.parts[0].text;
    return JSON.parse(rawText);
  } catch (error) {
    console.error(`Erro no processamento de documento (${type}):`, error);
    throw error;
  }
}

/**
 * Analisa comandos de texto/voz do narrador e converte em eventos de jogo
 * @param {string} command Texto de entrada
 * @param {Object} matchState Estado atual da partida para injeção de contexto
 * @returns {Promise<Object>} EventType estruturado
 */
export async function parseMatchCommand(command, matchState) {
  if (!command || !command.trim()) throw new Error("Comando de narração vazio.");

  const context = `
    Contexto da Partida:
    Mandante: ${matchState.homeTeam?.name || 'Não Definido'} (${matchState.homeTeam?.shortName || 'UND'})
    Visitante: ${matchState.awayTeam?.name || 'Não Definido'} (${matchState.awayTeam?.shortName || 'UND'})
    Período Atual: ${matchState.period || 'PRE_MATCH'}
  `;
  
  const instruction = `Converta a ação narrada em um JSON válido respeitando os tipos de evento: { "type": "GOAL" | "YELLOW_CARD" | "RED_CARD" | "SUBSTITUTION" | "SHOT" | "FOUL" | "VAR" | "OFFSIDE", "teamId": "home" | "away" | "none", "playerNumber": number, "description": "Resumo objetivo da ação" }`;

  const payload = {
    model: 'gemini-2.5-flash',
    contents: [{
      parts: [{ text: `${context}\n${instruction}\nComando do Narrador: "${command}"` }]
    }],
    generationConfig: { temperature: 0.1, responseMimeType: "application/json" }
  };

  try {
    const response = await fetch(PROXY_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || "Falha na resposta do Proxy.");
    }

    const data = await response.json();
    
    if (!data.candidates || data.candidates.length === 0) {
      throw new Error("Nenhum candidato retornado pela API.");
    }

    const rawText = data.candidates[0].content.parts[0].text;
    return JSON.parse(rawText);
  } catch (error) {
    console.error("Erro na inferência do comando estruturado:", error);
    throw error;
  }
}
