// js/constants.js - Constantes do Narrador Pro

export const STORAGE_KEY = 'narrador_pro_v3_state';

export const FORMATIONS = {
  '4-4-2': [
    { y: 50, x: 8 },
    { y: 20, x: 22 }, { y: 40, x: 22 }, { y: 60, x: 22 }, { y: 80, x: 22 },
    { y: 20, x: 34 }, { y: 40, x: 34 }, { y: 60, x: 34 }, { y: 80, x: 34 },
    { y: 40, x: 46 }, { y: 60, x: 46 },
  ],
  '4-3-3': [
    { y: 50, x: 8 },
    { y: 20, x: 22 }, { y: 40, x: 22 }, { y: 60, x: 22 }, { y: 80, x: 22 },
    { y: 30, x: 34 }, { y: 50, x: 34 }, { y: 70, x: 34 },
    { y: 25, x: 46 }, { y: 50, x: 46 }, { y: 75, x: 46 },
  ],
  '5-3-2': [
    { y: 50, x: 8 },
    { y: 15, x: 22 }, { y: 32, x: 22 }, { y: 50, x: 22 }, { y: 68, x: 22 }, { y: 85, x: 22 },
    { y: 30, x: 34 }, { y: 50, x: 34 }, { y: 70, x: 34 },
    { y: 40, x: 46 }, { y: 60, x: 46 },
  ],
  '3-4-3': [
    { y: 50, x: 8 },
    { y: 30, x: 22 }, { y: 50, x: 22 }, { y: 70, x: 22 },
    { y: 20, x: 34 }, { y: 40, x: 34 }, { y: 60, x: 34 }, { y: 80, x: 34 },
    { y: 25, x: 46 }, { y: 50, x: 46 }, { y: 75, x: 46 },
  ]
};

export const DEFAULT_HOME_TEAM = {
  id: 'home',
  name: 'Time Casa',
  shortName: 'CAS',
  color: '#3b82f6',
  secondaryColor: '#1e40af',
  players: [],
  formation: '4-4-2',
};

export const DEFAULT_AWAY_TEAM = {
  id: 'away',
  name: 'Time Visitante',
  shortName: 'VIS',
  color: '#ef4444',
  secondaryColor: '#991b1b',
  players: [],
  formation: '4-4-2',
};

export const TEAM_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#22c55e', '#10b981', '#14b8a6',
  '#06b6d4', '#3b82f6', '#4f46e5', '#a855f7', '#1e293b', '#ffffff'
];

export const EVENT_TYPE_LABELS = {
  'GOAL': 'GOL',
  'YELLOW_CARD': 'AMARELO',
  'RED_CARD': 'VERMELHO',
  'SUBSTITUTION': 'SUBSTITUIÇÃO',
  'SHOT': 'FINALIZAÇÃO',
  'FOUL': 'FALTA',
  'CORNER': 'ESCANTEIO',
  'PENALTY': 'PÊNALTI',
  'INJURY': 'CONTUSÃO',
  'PERIOD_START': 'INÍCIO',
  'PERIOD_END': 'FIM',
  'START_TIMER': 'CRONÔMETRO',
  'VAR': 'VAR',
  'PENALTY_SHOOTOUT': 'PÊNALTIS',
  'INVALID': 'INVÁLIDO',
  'OFFSIDE': 'IMPEDIMENTO',
  'SAVE': 'DEFESA',
  'WOODWORK': 'NA TRAVE',
  'ANSWER': 'RESPOSTA',
  'CORRECTION': 'CORREÇÃO',
  'CONCUSSION_SUBSTITUTION': 'SUBST. CONCUSSÃO',
  'GK_8_SECONDS': 'INFRAÇÃO 8S',
  'SET_GOALKEEPER': 'NOVO GOLEIRO',
  'GENERIC': 'EVENTO'
};

export const EVENT_ICONS = {
  'GOAL': '⚽',
  'YELLOW_CARD': '🟨',
  'RED_CARD': '🟥',
  'FOUL': '🛑',
  'OFFSIDE': '🚩',
  'default': '•'
};

export const TEAM_ABBREVIATIONS = {
  'flamengo': 'FLA',
  'corinthians': 'COR',
  'palmeiras': 'PAL',
  'são paulo': 'SAO',
  'sao paulo': 'SAO',
  'santos': 'SAN',
  'vasco da gama': 'VAS',
  'vasco': 'VAS',
  'fluminense': 'FLU',
  'botafogo': 'BOT',
  'grêmio': 'GRE',
  'gremio': 'GRE',
  'internacional': 'INT',
  'cruzeiro': 'CRU',
  'atlético mineiro': 'CAM',
  'atletico mineiro': 'CAM',
  'atlético-mg': 'CAM',
  'athletico paranaense': 'CAP',
  'athletico-pr': 'CAP',
  'athletico': 'CAP',
  'coritiba': 'CFC',
  'bahia': 'BAH',
  'vitória': 'VIT',
  'vitoria': 'VIT',
  'sport recife': 'SPT',
  'sport': 'SPT',
  'fortaleza': 'FOR',
  'ceará': 'CEA',
  'ceara': 'CEA',
  'goiás': 'GOI',
  'goias': 'GOI',
  'juventude': 'JUV',
  'bragantino': 'RBB',
  'red bull bragantino': 'RBB',
  'cuiabá': 'CUI',
  'cuiaba': 'CUI',
  'atlético goianiense': 'ACG',
  'criciúma': 'CRI',
  'criciuma': 'CRI'
};

export const BROADCAST_THEMES = {
  'classic': { id: 'theme-classic', name: 'Narrador Pro Classic', primary: '#3b82f6' },
  'champions': { id: 'theme-champions', name: 'Champions League', primary: '#001c58' },
  'brasileirao': { id: 'theme-brasileirao', name: 'Brasileirão Assaí', primary: '#004d2c' },
  'premier': { id: 'theme-premier', name: 'Premier League', primary: '#3d195b' }
};

export const PERIODS = ['PRE_MATCH', '1T', 'INTERVAL', '2T', '1ET', '2ET', 'PENALTIES', 'FINISHED'];
