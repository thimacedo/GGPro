import type { EventType, Period } from '../types';

export interface ParsedCommand {
  action: 'ADD_EVENT' | 'TOGGLE_TIMER' | 'ADVANCE_PERIOD' | 'UNDO' | 'RESET' | 'UNKNOWN';
  eventType?: EventType;
  teamId?: 'home' | 'away';
  playerNumber?: number;
  description?: string;
  confidence: number;
  original: string;
}

const TEAM_KEYWORDS: Record<string, 'home' | 'away'> = {
  'casa': 'home', 'mandante': 'home', 'home': 'home',
  'visitante': 'away', 'fora': 'away', 'away': 'away',
  'primeiro': 'home', 'segundo': 'away',
};

const EVENT_KEYWORDS: Record<string, { type: EventType; confidence: number }> = {
  'gol': { type: 'GOAL', confidence: 0.95 },
  'golzinho': { type: 'GOAL', confidence: 0.9 },
  'golaço': { type: 'GOAL', confidence: 0.95 },
  'tentos': { type: 'GOAL', confidence: 0.8 },
  'marcou': { type: 'GOAL', confidence: 0.7 },
  'amarelo': { type: 'YELLOW_CARD', confidence: 0.95 },
  'amarelado': { type: 'YELLOW_CARD', confidence: 0.9 },
  'cartão amarelo': { type: 'YELLOW_CARD', confidence: 0.98 },
  'cartao amarelo': { type: 'YELLOW_CARD', confidence: 0.98 },
  'vermelho': { type: 'RED_CARD', confidence: 0.95 },
  'expulsão': { type: 'RED_CARD', confidence: 0.95 },
  'expulsao': { type: 'RED_CARD', confidence: 0.95 },
  'expulso': { type: 'RED_CARD', confidence: 0.95 },
  'cartão vermelho': { type: 'RED_CARD', confidence: 0.98 },
  'cartao vermelho': { type: 'RED_CARD', confidence: 0.98 },
  'falta': { type: 'FOUL', confidence: 0.95 },
  'impedimento': { type: 'OFFSIDE', confidence: 0.95 },
  'impedido': { type: 'OFFSIDE', confidence: 0.9 },
  'lance de impedimento': { type: 'OFFSIDE', confidence: 0.95 },
  'escanteio': { type: 'CORNER', confidence: 0.95 },
  'tiro de meta': { type: 'SAVE', confidence: 0.8 },
  'defesa': { type: 'SAVE', confidence: 0.9 },
  'defendeu': { type: 'SAVE', confidence: 0.9 },
  'finalização': { type: 'SHOT', confidence: 0.95 },
  'finalizacao': { type: 'SHOT', confidence: 0.95 },
  'chute': { type: 'SHOT', confidence: 0.9 },
  'finalizou': { type: 'SHOT', confidence: 0.9 },
  'substituição': { type: 'SUBSTITUTION', confidence: 0.95 },
  'substituicao': { type: 'SUBSTITUTION', confidence: 0.95 },
  'troca': { type: 'SUBSTITUTION', confidence: 0.8 },
  'entrou': { type: 'SUBSTITUTION', confidence: 0.7 },
  'contusão': { type: 'INJURY', confidence: 0.95 },
  'contusao': { type: 'INJURY', confidence: 0.95 },
  'machucado': { type: 'INJURY', confidence: 0.9 },
  'lesão': { type: 'INJURY', confidence: 0.95 },
  'lesao': { type: 'INJURY', confidence: 0.95 },
  'var': { type: 'VAR', confidence: 0.95 },
  'revisão': { type: 'VAR', confidence: 0.8 },
  'na trave': { type: 'WOODWORK', confidence: 0.95 },
  'na barra': { type: 'WOODWORK', confidence: 0.95 },
  'trave': { type: 'WOODWORK', confidence: 0.9 },
  'barra': { type: 'WOODWORK', confidence: 0.9 },
  'pênalti': { type: 'PENALTY', confidence: 0.95 },
  'penalti': { type: 'PENALTY', confidence: 0.95 },
  'penalidade': { type: 'PENALTY', confidence: 0.9 },
};

const TIMER_KEYWORDS: Record<string, { action: 'TOGGLE_TIMER' | 'ADVANCE_PERIOD' | 'RESET'; confidence: number; period?: Period }> = {
  'iniciar': { action: 'TOGGLE_TIMER', confidence: 0.9 },
  'início': { action: 'TOGGLE_TIMER', confidence: 0.9 },
  'inicio': { action: 'TOGGLE_TIMER', confidence: 0.9 },
  'começar': { action: 'TOGGLE_TIMER', confidence: 0.9 },
  'comecar': { action: 'TOGGLE_TIMER', confidence: 0.9 },
  'volta': { action: 'TOGGLE_TIMER', confidence: 0.8 },
  'apita': { action: 'TOGGLE_TIMER', confidence: 0.7 },
  'rola a bola': { action: 'TOGGLE_TIMER', confidence: 0.9 },
  'pausar': { action: 'TOGGLE_TIMER', confidence: 0.9 },
  'parar': { action: 'TOGGLE_TIMER', confidence: 0.9 },
  'pausa': { action: 'TOGGLE_TIMER', confidence: 0.9 },
  'intervalo': { action: 'ADVANCE_PERIOD', confidence: 0.9, period: 'INTERVAL' },
  'fim do primeiro tempo': { action: 'ADVANCE_PERIOD', confidence: 0.95 },
  'fim do 1t': { action: 'ADVANCE_PERIOD', confidence: 0.95 },
  'fim do segundo tempo': { action: 'ADVANCE_PERIOD', confidence: 0.95 },
  'fim do 2t': { action: 'ADVANCE_PERIOD', confidence: 0.95 },
  'fim de jogo': { action: 'ADVANCE_PERIOD', confidence: 0.95 },
  'apito final': { action: 'ADVANCE_PERIOD', confidence: 0.9 },
  'segundo tempo': { action: 'ADVANCE_PERIOD', confidence: 0.8 },
  '2t': { action: 'ADVANCE_PERIOD', confidence: 0.7 },
  'próximo': { action: 'ADVANCE_PERIOD', confidence: 0.6 },
  'desfazer': { action: 'ADVANCE_PERIOD', confidence: 0.6 },
  'resetar': { action: 'RESET', confidence: 0.9 },
  'zerar': { action: 'RESET', confidence: 0.9 },
  'novo jogo': { action: 'RESET', confidence: 0.9 },
};

function extractPlayerNumber(text: string): number | undefined {
  const normalized = text
    .replace(/número\s*/gi, '#')
    .replace(/camisa\s*/gi, '#')
    .replace(/camiseta\s*/gi, '#')
    .replace(/numero\s*/gi, '#');

  const hashMatch = normalized.match(/#(\d+)/);
  if (hashMatch) return parseInt(hashMatch[1]);

  const words = text.split(/\s+/);
  for (const word of words) {
    const num = parseInt(word);
    if (!isNaN(num) && num >= 1 && num <= 99) return num;
  }

  const numberWords: Record<string, number> = {
    'um': 1, 'dois': 2, 'três': 3, 'quatro': 4, 'cinco': 5,
    'seis': 6, 'sete': 7, 'oito': 8, 'nove': 9, 'dez': 10,
    'onze': 11, 'doze': 12, 'treze': 13, 'quatorze': 14, 'catorze': 14,
    'quinze': 15, 'dezesseis': 16, 'dezessete': 17, 'dezoito': 18, 'dezenove': 19,
    'vinte': 20, 'trinta': 30, 'quarenta': 40, 'cinquenta': 50,
  };

  for (const word of words) {
    const lower = word.toLowerCase().replace(/[áàã]/g, 'a').replace(/[éè]/g, 'e').replace(/[íì]/g, 'i').replace(/[óòõ]/g, 'o').replace(/[úù]/g, 'u');
    if (numberWords[lower]) return numberWords[lower];
  }

  return undefined;
}

function extractTeam(text: string): 'home' | 'away' | undefined {
  const lower = text.toLowerCase();

  for (const [keyword, teamId] of Object.entries(TEAM_KEYWORDS)) {
    if (lower.includes(keyword)) return teamId;
  }

  return undefined;
}

export function parseCommand(input: string): ParsedCommand {
  const original = input.trim();
  const lower = original.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  if (!lower) {
    return { action: 'UNKNOWN', confidence: 0, original };
  }

  // Check timer/control commands first
  let bestTimerMatch: { action: 'TOGGLE_TIMER' | 'ADVANCE_PERIOD' | 'RESET'; confidence: number; period?: Period } = { action: 'TOGGLE_TIMER', confidence: 0, period: undefined };
  for (const [keyword, cmd] of Object.entries(TIMER_KEYWORDS)) {
    const normalized = keyword.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (lower.includes(normalized) && cmd.confidence > bestTimerMatch.confidence) {
      bestTimerMatch = { ...cmd };
    }
  }

  if (bestTimerMatch.confidence >= 0.6) {
    if (bestTimerMatch.action === 'RESET') {
      return { action: 'RESET', confidence: bestTimerMatch.confidence, original };
    }
    if (bestTimerMatch.action === 'ADVANCE_PERIOD') {
      return { action: 'ADVANCE_PERIOD', confidence: bestTimerMatch.confidence, original, description: bestTimerMatch.period };
    }
    return { action: 'TOGGLE_TIMER', confidence: bestTimerMatch.confidence, original };
  }

  // Check event commands
  let bestEventMatch: { type: EventType; confidence: number } | null = null;
  let matchedKeyword = '';

  // Multi-word matches first (longer match = higher priority)
  const sortedKeywords = Object.entries(EVENT_KEYWORDS).sort((a, b) => b[0].length - a[0].length);

  for (const [keyword, event] of sortedKeywords) {
    const normalized = keyword.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (lower.includes(normalized)) {
      if (!bestEventMatch || event.confidence > bestEventMatch.confidence) {
        bestEventMatch = event;
        matchedKeyword = keyword;
      }
    }
  }

  if (bestEventMatch) {
    const teamId = extractTeam(original.replace(new RegExp(matchedKeyword, 'i'), ''));
    const playerNumber = extractPlayerNumber(original);
    return {
      action: 'ADD_EVENT',
      eventType: bestEventMatch.type,
      teamId,
      playerNumber,
      confidence: bestEventMatch.confidence,
      original,
    };
  }

  return { action: 'UNKNOWN', confidence: 0, original };
}

export function getCommandSuggestions(): string[] {
  return [
    'Gol casa 10',
    'Cartão amarelo visitante 7',
    'Cartão vermelho casa 3',
    'Falta visitante',
    'Escanteio casa',
    'Impedimento visitante 9',
    'Finalização casa 11',
    'Defesa visitante',
    'Substituição casa',
    'VAR',
    'Início',
    'Pausar',
    'Intervalo',
    'Fim de jogo',
  ];
}
