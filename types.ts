export type Position = 'GK' | 'DF' | 'MF' | 'FW';

export type TacticalFormation = '4-4-2' | '4-3-3' | '5-3-2' | '3-4-3' | 'CUSTOM';

export type EventType = 
  | 'GOAL' | 'YELLOW_CARD' | 'RED_CARD' | 'SUBSTITUTION' | 'SHOT' | 'FOUL' | 'CORNER' | 'PENALTY' | 'INJURY' 
  | 'PERIOD_START' | 'PERIOD_END' | 'START_TIMER' | 'VAR' | 'PENALTY_SHOOTOUT'
  | 'OFFSIDE' | 'SAVE' | 'WOODWORK' | 'ANSWER' | 'INVALID' | 'CORRECTION'
  | 'CONCUSSION_SUBSTITUTION' | 'GK_8_SECONDS' | 'SET_GOALKEEPER' | 'GENERIC';

export interface MatchEvent {
  id: string; 
  type: EventType; 
  minute: number; 
  playerId?: string; 
  relatedPlayerId?: string;
  teamId: 'home' | 'away' | 'none'; 
  description: string; 
  timestamp: number; 
  isAnnulled?: boolean;
}

export interface Player {
  id: string; 
  name: string; 
  fullName: string; 
  number: number; 
  position: Position;
  teamId: 'home' | 'away'; 
  isStarter: boolean; 
  events: MatchEvent[]; 
  x: number; 
  y: number;
  hasLeftGame?: boolean;
}

export interface PenaltyShot {
  id: string; teamId: 'home' | 'away'; playerId: string; outcome: 'scored' | 'missed'; number: number;
}

export interface Team {
  id: 'home' | 'away'; name: string; shortName: string; color: string; secondaryColor: string;
  players: Player[]; formation: TacticalFormation; coach?: string;
}

export type MatchStatus = 'PRE_MATCH' | '1T' | 'INTERVAL' | '2T' | '1ET' | '2ET' | 'PENALTIES' | 'FINISHED';

// Nova Interface de Regras
export interface MatchRules {
  halfDuration: number; // Ex: 45 ou 30
  maxSubstitutions: number; // Ex: 5
  penaltyKicks: number; // Ex: 5 ou 3
  summary: string;
}

export interface MatchState {
  homeTeam: Team; 
  awayTeam: Team; 
  events: MatchEvent[]; 
  startTime: number | null; 
  timerStartedAt: number | null; // Timestamp of the last 'Play'
  timeElapsed: number; // Accumulated time in ms before the last 'Play'
  isPaused: boolean; 
  period: MatchStatus; 
  competition: string; 
  matchDate: string; 
  stadium: string;
  referee?: string; 
  observations?: string; 
  penaltyScore: { home: number; away: number };
  penaltySequence: PenaltyShot[]; 
  penaltyStarter?: 'home' | 'away';
  rules: MatchRules; 
}

export interface AICommandResponse {
  type: EventType; team?: 'home' | 'away'; playerNumber?: number; playerInNumber?: number;
  playerInName?: string; playerOutNumber?: number; description: string;
  newNumber?: number; newName?: string;
}

export interface BannerMatch {
  homeTeam: string; awayTeam: string; competition: string; stadium: string; date: string; time: string;
}
