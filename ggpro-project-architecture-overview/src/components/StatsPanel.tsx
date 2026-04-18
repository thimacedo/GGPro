import type { MatchState, EventType } from '../types';

interface StatsPanelProps {
  state: MatchState;
  getTeamStats: (teamId: 'home' | 'away') => Record<string, number>;
  getPeriodEvents?: (period: string) => unknown[];
  possession: { home: number; away: number };
}

const EVENT_LABELS: Record<string, string> = {
  GOAL: 'Gols', YELLOW_CARD: 'Amarelos', RED_CARD: 'Vermelhos',
  SHOT: 'Finalizações', FOUL: 'Faltas', CORNER: 'Escanteios',
  OFFSIDE: 'Impedimentos', SAVE: 'Defesas', VAR: 'VAR',
};

const EVENT_ORDER: EventType[] = ['GOAL', 'SHOT', 'CORNER', 'FOUL', 'OFFSIDE', 'YELLOW_CARD', 'RED_CARD', 'VAR'];

export function StatsPanel({ state, getTeamStats, possession }: StatsPanelProps) {
  const { homeTeam, awayTeam } = state;
  const homeStats = getTeamStats('home');
  const awayStats = getTeamStats('away');

  return (
    <div className="space-y-4">
      {/* Possession */}
      <div className="bg-neutral-900/50 rounded-2xl p-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-3">Posse de Bola</h3>
        
        <div className="flex items-center gap-4">
          <div className="text-center flex-1">
            <div className="text-3xl font-black" style={{ color: homeTeam.color }}>
              {possession.home}%
            </div>
            <div className="text-xs font-bold text-neutral-400 mt-1">{homeTeam.shortName}</div>
          </div>
          
          <div className="flex-1 h-4 bg-neutral-800 rounded-full overflow-hidden flex">
            <div 
              className="h-full transition-all duration-500"
              style={{ width: `${possession.home}%`, backgroundColor: homeTeam.color }}
            />
            <div 
              className="h-full transition-all duration-500"
              style={{ width: `${possession.away}%`, backgroundColor: awayTeam.color }}
            />
          </div>
          
          <div className="text-center flex-1">
            <div className="text-3xl font-black" style={{ color: awayTeam.color }}>
              {possession.away}%
            </div>
            <div className="text-xs font-bold text-neutral-400 mt-1">{awayTeam.shortName}</div>
          </div>
        </div>
      </div>

      {/* Stats Comparison */}
      <div className="bg-neutral-900/50 rounded-2xl p-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-3">Estatísticas</h3>
        
        <div className="space-y-3">
          {EVENT_ORDER.map(eventType => {
            const homeValue = homeStats[eventType] || 0;
            const awayValue = awayStats[eventType] || 0;
            const total = homeValue + awayValue;
            const homePercent = total > 0 ? (homeValue / total) * 100 : 50;
            
            return (
              <div key={eventType} className="flex items-center gap-3">
                <div className="w-8 text-right font-mono font-bold text-sm" style={{ color: homeTeam.color }}>
                  {homeValue}
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center gap-1 mb-0.5">
                    <div className="flex-1 h-2 bg-neutral-800 rounded-full overflow-hidden flex flex-row-reverse">
                      <div 
                        className="h-full transition-all duration-300"
                        style={{ width: `${100 - homePercent}%`, backgroundColor: homeTeam.color }}
                      />
                    </div>
                    <div className="flex-1 h-2 bg-neutral-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full transition-all duration-300"
                        style={{ width: `${homePercent}%`, backgroundColor: awayTeam.color }}
                      />
                    </div>
                  </div>
                  <div className="text-[10px] text-center font-bold text-neutral-500 uppercase tracking-wider">
                    {EVENT_LABELS[eventType]}
                  </div>
                </div>
                
                <div className="w-8 font-mono font-bold text-sm" style={{ color: awayTeam.color }}>
                  {awayValue}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Formations */}
      <div className="bg-neutral-900/50 rounded-2xl p-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-3">Formações</h3>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="text-sm font-bold mb-1" style={{ color: homeTeam.color }}>
              {homeTeam.shortName}
            </div>
            <div className="text-2xl font-black text-white">{homeTeam.formation}</div>
            <div className="text-[10px] text-neutral-500 mt-1">
              {homeTeam.players.filter(p => p.isStarter).length} titulares
            </div>
          </div>
          
          <div className="text-center">
            <div className="text-sm font-bold mb-1" style={{ color: awayTeam.color }}>
              {awayTeam.shortName}
            </div>
            <div className="text-2xl font-black text-white">{awayTeam.formation}</div>
            <div className="text-[10px] text-neutral-500 mt-1">
              {awayTeam.players.filter(p => p.isStarter).length} titulares
            </div>
          </div>
        </div>
      </div>

      {/* Coaches */}
      {(state.homeCoach || state.awayCoach) && (
        <div className="bg-neutral-900/50 rounded-2xl p-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-3">Técnicos</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="text-xs text-neutral-400 mb-1">{homeTeam.shortName}</div>
              <div className="text-sm font-bold text-white">{state.homeCoach || '—'}</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-neutral-400 mb-1">{awayTeam.shortName}</div>
              <div className="text-sm font-bold text-white">{state.awayCoach || '—'}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
