export interface Player {
  id: string;
  name: string;
  number: number;
  position: string;
  isStarter: boolean;
  hasLeftGame: boolean;
  coordX?: number;
  coordY?: number;
}

export interface Team {
  id: 'home' | 'away';
  name: string;
  shortName: string;
  color: string;
  secondaryColor: string;
  players: Player[];
  formation: string;
}

export type EventType =
  | 'GOAL'
  | 'YELLOW_CARD'
  | 'RED_CARD'
  | 'SUBSTITUTION'
  | 'SHOT'
  | 'FOUL'
  | 'CORNER'
  | 'PENALTY'
  | 'PENALTY_SHOOTOUT'
  | 'INJURY'
  | 'PERIOD_START'
  | 'PERIOD_END'
  | 'START_TIMER'
  | 'VAR'
  | 'VAR_GOAL_CONFIRMED'
  | 'VAR_GOAL_ANNULLED'
  | 'VAR_PENALTY_AWARDED'
  | 'VAR_PENALTY_CANCELLED'
  | 'VAR_RED_AWARDED'
  | 'VAR_RED_CANCELLED'
  | 'VAR_IDENTITY_CORRECTION'
  | 'OFFSIDE'
  | 'SAVE'
  | 'WOODWORK'
  | 'CONCUSSION_SUBSTITUTION'
  | 'GK_8_SECONDS'
  | 'SET_GOALKEEPER'
  | 'GENERIC';

// VAR decision types
export type VARDecisionType = 
  | 'GOAL_CONFIRMED'
  | 'GOAL_ANNULLED'
  | 'PENALTY_AWARDED'
  | 'PENALTY_CANCELLED'
  | 'RED_AWARDED'
  | 'RED_CANCELLED'
  | 'IDENTITY_CORRECTION';

export interface VARDecision {
  type: VARDecisionType;
  targetEventId?: string;
  targetPlayerId?: string;
  correctPlayerId?: string;
  reason?: string;
}

export type Period =
  | 'PRE_MATCH'
  | '1T'
  | 'INTERVAL'
  | '2T'
  | '1ET'
  | '2ET'
  | 'PENALTIES'
  | 'FINISHED';

export interface MatchEvent {
  id: string;
  type: EventType;
  teamId: 'home' | 'away' | null;
  playerId?: string;
  relatedPlayerId?: string;
  minute: number;
  timestamp: number;
  description: string;
  isAnnulled: boolean;
  period?: Period;
}

export interface MatchDetails {
  competition: string;
  referee: string;
  stadium: string;
  date: string;
  time: string;
  observations: string;
}

export interface PenaltyKick {
  teamId: 'home' | 'away';
  scored: boolean;
  playerId?: string;
}

export interface PossessionEntry {
  teamId: 'home' | 'away';
  timestamp: number;
}

export interface MatchState {
  homeTeam: Team;
  awayTeam: Team;
  events: MatchEvent[];
  timerStartedAt: number | null;
  timeElapsed: number;
  isPaused: boolean;
  period: Period;
  score: { home: number; away: number };
  penaltyScore: { home: number; away: number };
  penaltySequence: PenaltyKick[];
  penaltyStarter: 'home' | 'away';
  isPenaltyShootoutActive: boolean;
  rules: { halfDuration: number; maxSubstitutions: number; penaltyKicks: number };
  matchDetails: MatchDetails;
  homeCoach: string;
  awayCoach: string;
  possession: PossessionEntry[];
  addedTime: { '1T': number; '2T': number };
  quickNotes: QuickNote[];
  highlightedPlayers: HighlightPlayer[];
}

export interface SavedMatch {
  id: string;
  savedAt: number;
  state: MatchState;
  homeGoals: number;
  awayGoals: number;
  label: string;
}

export interface QuickNote {
  id: string;
  text: string;
  minute: number;
  period: Period;
  createdAt: number;
}

export interface HighlightPlayer {
  playerId: string;
  teamId: 'home' | 'away';
  reason?: string;
}

export type TabType = 'main' | 'lineup' | 'stats' | 'report' | 'ai';
export type ViewMode = 'field' | 'list';
