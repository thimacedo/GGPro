export const Positions = ['GK', 'DF', 'MF', 'FW'];

export const TacticalFormations = ['4-4-2', '4-3-3', '5-3-2', '3-4-3', 'CUSTOM'];

export const EventTypes = {
  GOAL: 'GOAL',
  YELLOW_CARD: 'YELLOW_CARD',
  RED_CARD: 'RED_CARD',
  SUBSTITUTION: 'SUBSTITUTION',
  SHOT: 'SHOT',
  FOUL: 'FOUL',
  CORNER: 'CORNER',
  PENALTY: 'PENALTY',
  INJURY: 'INJURY',
  PERIOD_START: 'PERIOD_START',
  PERIOD_END: 'PERIOD_END',
  START_TIMER: 'START_TIMER',
  VAR: 'VAR',
  PENALTY_SHOOTOUT: 'PENALTY_SHOOTOUT',
  OFFSIDE: 'OFFSIDE',
  SAVE: 'SAVE',
  WOODWORK: 'WOODWORK',
  ANSWER: 'ANSWER',
  INVALID: 'INVALID',
  CORRECTION: 'CORRECTION',
  CONCUSSION_SUBSTITUTION: 'CONCUSSION_SUBSTITUTION',
  GK_8_SECONDS: 'GK_8_SECONDS',
  SET_GOALKEEPER: 'SET_GOALKEEPER',
  GENERIC: 'GENERIC'
};

export const MatchStatus = {
  PRE_MATCH: 'PRE_MATCH',
  T1: '1T',
  INTERVAL: 'INTERVAL',
  T2: '2T',
  ET1: '1ET',
  ET2: '2ET',
  PENALTIES: 'PENALTIES',
  FINISHED: 'FINISHED'
};

export const DEFAULT_RULES = {
  halfDuration: 45,
  maxSubstitutions: 5,
  penaltyKicks: 5,
  summary: ''
};

export const INITIAL_MATCH_STATE = {
  homeTeam: {
    id: 'home',
    name: 'Flamengo',
    shortName: 'FLA',
    color: '#dc2626',
    secondaryColor: '#ffffff',
    players: [
      { id: 'h1', name: 'Rossi', number: 1, position: 'GK', isStarter: true },
      { id: 'h2', name: 'Varella', number: 2, position: 'DF', isStarter: true },
      { id: 'h3', name: 'Fabrício Bruno', number: 15, position: 'DF', isStarter: true },
      { id: 'h4', name: 'Léo Pereira', number: 4, position: 'DF', isStarter: true },
      { id: 'h5', name: 'Ayrton Lucas', number: 6, position: 'DF', isStarter: true },
      { id: 'h10', name: 'Arrascaeta', number: 14, position: 'MF', isStarter: true },
      { id: 'h11', name: 'Pedro', number: 9, position: 'FW', isStarter: true },
    ],
    formation: '4-4-2',
    coach: 'Tite'
  },
  awayTeam: {
    id: 'away',
    name: 'Palmeiras',
    shortName: 'PAL',
    color: '#059669',
    secondaryColor: '#ffffff',
    players: [
      { id: 'a1', name: 'Weverton', number: 21, position: 'GK', isStarter: true },
      { id: 'a2', name: 'Mayke', number: 12, position: 'DF', isStarter: true },
      { id: 'a3', name: 'Gustavo Gómez', number: 15, position: 'DF', isStarter: true },
      { id: 'a4', name: 'Murilo', number: 26, position: 'DF', isStarter: true },
      { id: 'a5', name: 'Piquerez', number: 22, position: 'DF', isStarter: true },
      { id: 'a10', name: 'Raphael Veiga', number: 23, position: 'MF', isStarter: true },
      { id: 'a11', name: 'Flaco López', number: 42, position: 'FW', isStarter: true },
    ],
    formation: '4-3-3',
    coach: 'Abel Ferreira'
  },
  events: [],
  startTime: null,
  timerStartedAt: null,
  timeElapsed: 0,
  isPaused: true,
  period: MatchStatus.PRE_MATCH,
  competition: '',
  matchDate: new Date().toISOString().split('T')[0],
  stadium: '',
  referee: '',
  observations: '',
  penaltyScore: { home: 0, away: 0 },
  penaltySequence: [],
  rules: { ...DEFAULT_RULES }
};
