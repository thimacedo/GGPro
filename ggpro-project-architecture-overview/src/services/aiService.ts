// ==========================================
// AI Service — Puter.js (free, unlimited)
// GPT-4o-mini, Gemini 2.5 Flash, Qwen, etc.
// No API key needed. No registration.
// ==========================================

export interface AIMessage {
  role: 'user' | 'model';
  text: string;
}

export interface AIResponse {
  text: string;
  error?: string;
  provider?: string;
}

// ==========================================
// Puter.js availability
// ==========================================

function isPuterAvailable(): boolean {
  return !!(window as any).puter?.ai?.chat;
}

// ==========================================
// Core AI call via Puter.js
// ==========================================

async function callPuter(
  prompt: string,
  systemInstruction?: string,
  history?: AIMessage[],
  model: string = 'gpt-4o-mini'
): Promise<AIResponse> {
  try {
    const puter = (window as any).puter;

    let fullPrompt = '';
    if (systemInstruction) {
      fullPrompt += `[SISTEMA]: ${systemInstruction}\n\n`;
    }
    if (history && history.length > 0) {
      fullPrompt += history.map(m => `${m.role === 'model' ? 'IA' : 'Usuário'}: ${m.text}`).join('\n') + '\n';
    }
    fullPrompt += `Usuário: ${prompt}`;

    const response = await puter.ai.chat(fullPrompt, { model });

    const text = typeof response === 'string'
      ? response
      : response?.message?.content?.toString() || response?.text || '';

    if (!text.trim()) {
      return { text: '', error: 'Resposta vazia da IA', provider: 'Puter.js' };
    }

    return { text: text.trim(), provider: `Puter.js (${model})` };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido';
    console.error('[Puter AI] Error:', msg);
    return { text: '', error: `Erro: ${msg}`, provider: 'Puter.js' };
  }
}

// ==========================================
// Public functions
// ==========================================

export function isAIAvailable(): boolean {
  return isPuterAvailable();
}

export function getAIProvider(): string {
  if (isPuterAvailable()) return 'Puter.js — Grátis & Ilimitado';
  return 'Conecte-se à internet';
}

export async function generateChronicle(matchContext: string): Promise<AIResponse> {
  if (!isPuterAvailable()) {
    return { text: '', error: 'IA não disponível. Conecte-se à internet para usar Puter.js (grátis, sem registro).' };
  }

  const systemPrompt = `Você é um cronista esportivo brasileiro veterano.
Escreva uma crônica esportiva envolvente baseada nos dados da partida.
Use linguagem rica, metáforas esportivas e referências culturais brasileiras.
3 a 5 parágrafos. Inclua referências aos momentos-chave e jogadores.
Seja conciso e direto. Não repita informações.
Estilo: narrativa jornalística esportiva brasileira (como juca kfouri, maurício stycer).`;

  return callPuter(
    `Escreva uma crônica para esta partida:\n\n${matchContext}`,
    systemPrompt,
    undefined,
    'gpt-4o-mini'
  );
}

export async function generateMatchAnalysis(matchContext: string): Promise<AIResponse> {
  if (!isPuterAvailable()) {
    return { text: '', error: 'IA não disponível. Conecte-se à internet.' };
  }

  const systemPrompt = `Você é um analista tático de futebol.
Analise a partida de forma concisa e profissional.
Formato:
🎯 Momentos Chave: (liste os lances decisivos)
📊 Análise Tática: (formações, posse, estratégias)
⭐ Destaque Individual: (melhor em campo)
🔮 Perspectiva: (o que esperar dos próximos jogos)
Responda em português. Máximo 4 parágrafos.`;

  return callPuter(
    `Analise:\n\n${matchContext}`,
    systemPrompt,
    undefined,
    'gpt-4o-mini'
  );
}

export async function chatWithAI(
  message: string,
  matchContext: string,
  history: AIMessage[]
): Promise<AIResponse> {
  if (!isPuterAvailable()) {
    return { text: '', error: 'IA não disponível. Conecte-se à internet.' };
  }

  const systemPrompt = `Você é o assistente IA do GGPro — um auxiliar de narração esportiva.
Você ajuda narradores e repórteres com informações sobre a partida em andamento.
Responda em português, seja conciso e útil. Máximo 3 frases por resposta.
Contexto da partida:
${matchContext}`;

  return callPuter(message, systemPrompt, history.slice(-6), 'gpt-4o-mini');
}

export function buildMatchContext(state: {
  homeTeam: { name: string; shortName: string; color: string; players: Array<{ name: string; number: number; position: string; isStarter: boolean }>; formation: string };
  awayTeam: { name: string; shortName: string; color: string; players: Array<{ name: string; number: number; position: string; isStarter: boolean }>; formation: string };
  score: { home: number; away: number };
  period: string;
  events: Array<{ type: string; teamId: string | null; minute: number; description: string; isAnnulled: boolean }>;
  matchDetails: { competition: string; stadium: string; referee: string; date: string };
  penaltyScore: { home: number; away: number };
}): string {
  const { homeTeam, awayTeam, score, period, events, matchDetails, penaltyScore } = state;
  const active = events.filter(e => !e.isAnnulled && e.type !== 'PERIOD_START' && e.type !== 'PERIOD_END');
  const goals = active.filter(e => e.type === 'GOAL');
  const cards = active.filter(e => e.type === 'YELLOW_CARD' || e.type === 'RED_CARD');

  return `
PARTIDA: ${homeTeam.name} ${score.home} × ${score.away} ${awayTeam.name}
Competição: ${matchDetails.competition || 'Não definida'}
Estádio: ${matchDetails.stadium || 'Não definido'}
Árbitro: ${matchDetails.referee || 'Não definido'}
Data: ${matchDetails.date || 'Não definida'}
Período: ${period}
${period === 'PENALTIES' ? `Pênaltis: ${penaltyScore.home} × ${penaltyScore.away}` : ''}

FORMAÇÕES:
${homeTeam.shortName} (${homeTeam.formation}): ${homeTeam.players.filter(p => p.isStarter).map(p => `#${p.number} ${p.name}`).join(', ') || 'Não definidos'}
${awayTeam.shortName} (${awayTeam.formation}): ${awayTeam.players.filter(p => p.isStarter).map(p => `#${p.number} ${p.name}`).join(', ') || 'Não definidos'}

GOLS (${goals.length}):
${goals.map(g => `  ${g.minute}' - ${g.description}`).join('\n') || '  Nenhum'}

CARTÕES (${cards.length}):
${cards.map(c => `  ${c.minute}' - ${c.description}`).join('\n') || '  Nenhum'}

TOTAL DE EVENTOS: ${active.length}`;
}
