import type { MatchState } from '../types';

interface Props {
  state: MatchState;
  getDisplayTime: () => string;
  getFootballMinute: () => string;
  EVENT_ICONS: Record<string, string>;
  onClose: () => void;
}

export function PresentationMode({ state, getDisplayTime, getFootballMinute, EVENT_ICONS, onClose }: Props) {
  const { homeTeam, awayTeam, score, events, period } = state;
  
  const recentEvents = events.filter(e => !e.isAnnulled).slice(-5).reverse();
  
  const getTeamEvents = (teamId: 'home' | 'away') => 
    events.filter(e => e.teamId === teamId && !e.isAnnulled);
  
  const homeScorers = getTeamEvents('home')
    .filter(e => e.type === 'GOAL')
    .map(e => {
      const player = homeTeam.players.find(p => p.id === e.playerId);
      return player?.name || e.description;
    });
    
  const awayScorers = getTeamEvents('away')
    .filter(e => e.type === 'GOAL')
    .map(e => {
      const player = awayTeam.players.find(p => p.id === e.playerId);
      return player?.name || e.description;
    });

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white">
      {/* Header */}
      <div className="flex justify-between items-center p-4 bg-black/30">
        <div className="text-sm text-slate-400">{state.matchDetails.competition}</div>
        <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl px-4 py-2">
          ✕ Sair
        </button>
      </div>

      {/* Main Score */}
      <div className="flex items-center justify-center py-8 px-4">
        {/* Home Team */}
        <div className="flex-1 text-right pr-6">
          <div className="text-3xl md:text-5xl font-bold truncate" style={{ color: homeTeam.color }}>
            {homeTeam.name.toUpperCase()}
          </div>
          <div className="text-sm text-slate-400 mt-1">{homeTeam.formation}</div>
          {homeScorers.length > 0 && (
            <div className="text-xs text-slate-500 mt-2 space-y-1">
              {homeScorers.map((s, i) => <div key={i}>⚽ {s}</div>)}
            </div>
          )}
        </div>

        {/* Score */}
        <div className="flex items-center gap-4">
          <div className="text-7xl md:text-9xl font-black tabular-nums" style={{ color: homeTeam.color }}>
            {score.home}
          </div>
          <div className="text-4xl text-slate-600">×</div>
          <div className="text-7xl md:text-9xl font-black tabular-nums" style={{ color: awayTeam.color }}>
            {score.away}
          </div>
        </div>

        {/* Away Team */}
        <div className="flex-1 text-left pl-6">
          <div className="text-3xl md:text-5xl font-bold truncate" style={{ color: awayTeam.color }}>
            {awayTeam.name.toUpperCase()}
          </div>
          <div className="text-sm text-slate-400 mt-1">{awayTeam.formation}</div>
          {awayScorers.length > 0 && (
            <div className="text-xs text-slate-500 mt-2 space-y-1">
              {awayScorers.map((s, i) => <div key={i}>⚽ {s}</div>)}
            </div>
          )}
        </div>
      </div>

      {/* Time */}
      <div className="text-center py-4">
        <div className="inline-flex items-center gap-3 bg-slate-800/80 rounded-full px-8 py-3">
          <span className={`w-3 h-3 rounded-full ${period === '1T' || period === '2T' ? 'bg-red-500 animate-pulse' : 'bg-slate-500'}`} />
          <span className="text-4xl md:text-6xl font-mono font-bold">{getDisplayTime()}</span>
          <span className="text-lg text-slate-400">{getFootballMinute()}</span>
        </div>
      </div>

      {/* Recent Events */}
      {recentEvents.length > 0 && (
        <div className="max-w-2xl mx-auto px-4 mt-6">
          <div className="text-xs text-slate-500 uppercase tracking-wider mb-2 text-center">Últimos Eventos</div>
          <div className="space-y-2">
            {recentEvents.map(event => {
              const team = event.teamId === 'home' ? homeTeam : awayTeam;
              const player = team.players.find(p => p.id === event.playerId);
              return (
                <div key={event.id} className="flex items-center gap-3 bg-slate-800/50 rounded-lg px-4 py-2">
                  <span className="text-xl">{EVENT_ICONS[event.type] || '📋'}</span>
                  <span className="text-sm flex-1">
                    {player?.name || event.description}
                  </span>
                  <span className="text-xs text-slate-400">{event.minute}'</span>
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: team.color }} />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Bottom Info */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-black/30 flex justify-between text-xs text-slate-500">
        <span>{state.matchDetails.stadium}</span>
        <span>{state.matchDetails.referee && `Árbitro: ${state.matchDetails.referee}`}</span>
      </div>
    </div>
  );
}
