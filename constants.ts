
import { Team, TacticalFormation } from './types';

export const STORAGE_KEY = 'narrador_pro_v3_state';

export const FORMATIONS: Record<Exclude<TacticalFormation, 'CUSTOM'>, { y: number, x: number }[]> = {
  '4-4-2': [
    { y: 50, x: 8 }, // GK
    { y: 20, x: 22 }, { y: 40, x: 22 }, { y: 60, x: 22 }, { y: 80, x: 22 }, // DF
    { y: 20, x: 34 }, { y: 40, x: 34 }, { y: 60, x: 34 }, { y: 80, x: 34 }, // MF
    { y: 40, x: 46 }, { y: 60, x: 46 }, // FW
  ],
  '4-3-3': [
    { y: 50, x: 8 }, // GK
    { y: 20, x: 22 }, { y: 40, x: 22 }, { y: 60, x: 22 }, { y: 80, x: 22 }, // DF
    { y: 30, x: 34 }, { y: 50, x: 34 }, { y: 70, x: 34 }, // MF
    { y: 25, x: 46 }, { y: 50, x: 46 }, { y: 75, x: 46 }, // FW
  ],
  '5-3-2': [
    { y: 50, x: 8 }, // GK
    { y: 15, x: 22 }, { y: 32, x: 22 }, { y: 50, x: 22 }, { y: 68, x: 22 }, { y: 85, x: 22 }, // DF
    { y: 30, x: 34 }, { y: 50, x: 34 }, { y: 70, x: 34 }, // MF
    { y: 40, x: 46 }, { y: 60, x: 46 }, // FW
  ],
  '3-4-3': [
    { y: 50, x: 8 }, // GK
    { y: 30, x: 22 }, { y: 50, x: 22 }, { y: 70, x: 22 }, // DF
    { y: 20, x: 34 }, { y: 40, x: 34 }, { y: 60, x: 34 }, { y: 80, x: 34 }, // MF
    { y: 25, x: 46 }, { y: 50, x: 46 }, { y: 75, x: 46 }, // FW
  ]
};

export const DEFAULT_HOME_TEAM: Team = {
  id: 'home',
  name: 'Time Casa',
  shortName: 'CAS',
  color: '#3b82f6',
  secondaryColor: '#1e40af',
  players: [],
  formation: '4-4-2',
};

export const DEFAULT_AWAY_TEAM: Team = {
  id: 'away',
  name: 'Time Visitante',
  shortName: 'VIS',
  color: '#ef4444',
  secondaryColor: '#991b1b',
  players: [],
  formation: '4-4-2',
};
