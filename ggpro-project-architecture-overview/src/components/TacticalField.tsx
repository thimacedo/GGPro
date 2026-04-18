import type { MatchState, Team } from '../types';

interface TacticalFieldProps {
  state: MatchState;
}

const FORMATIONS: Record<string, { y: number; x: number }[]> = {
  '4-4-2': [
    { y: 50, x: 8 }, { y: 20, x: 22 }, { y: 40, x: 22 }, { y: 60, x: 22 }, { y: 80, x: 22 },
    { y: 20, x: 34 }, { y: 40, x: 34 }, { y: 60, x: 34 }, { y: 80, x: 34 },
    { y: 40, x: 46 }, { y: 60, x: 46 },
  ],
  '4-3-3': [
    { y: 50, x: 8 }, { y: 20, x: 22 }, { y: 40, x: 22 }, { y: 60, x: 22 }, { y: 80, x: 22 },
    { y: 30, x: 34 }, { y: 50, x: 34 }, { y: 70, x: 34 },
    { y: 25, x: 46 }, { y: 50, x: 46 }, { y: 75, x: 46 },
  ],
  '4-2-3-1': [
    { y: 50, x: 8 }, { y: 20, x: 22 }, { y: 40, x: 22 }, { y: 60, x: 22 }, { y: 80, x: 22 },
    { y: 35, x: 32 }, { y: 65, x: 32 },
    { y: 20, x: 40 }, { y: 50, x: 40 }, { y: 80, x: 40 },
    { y: 50, x: 48 },
  ],
  '3-5-2': [
    { y: 50, x: 8 }, { y: 25, x: 22 }, { y: 50, x: 22 }, { y: 75, x: 22 },
    { y: 15, x: 34 }, { y: 35, x: 34 }, { y: 50, x: 34 }, { y: 65, x: 34 }, { y: 85, x: 34 },
    { y: 40, x: 46 }, { y: 60, x: 46 },
  ],
  '3-4-3': [
    { y: 50, x: 8 }, { y: 30, x: 22 }, { y: 50, x: 22 }, { y: 70, x: 22 },
    { y: 20, x: 34 }, { y: 40, x: 34 }, { y: 60, x: 34 }, { y: 80, x: 34 },
    { y: 25, x: 46 }, { y: 50, x: 46 }, { y: 75, x: 46 },
  ],
  '5-3-2': [
    { y: 50, x: 8 }, { y: 10, x: 20 }, { y: 30, x: 20 }, { y: 50, x: 18 }, { y: 70, x: 20 }, { y: 90, x: 20 },
    { y: 30, x: 34 }, { y: 50, x: 34 }, { y: 70, x: 34 },
    { y: 40, x: 46 }, { y: 60, x: 46 },
  ],
  '5-4-1': [
    { y: 50, x: 8 }, { y: 10, x: 20 }, { y: 30, x: 20 }, { y: 50, x: 18 }, { y: 70, x: 20 }, { y: 90, x: 20 },
    { y: 20, x: 34 }, { y: 40, x: 34 }, { y: 60, x: 34 }, { y: 80, x: 34 },
    { y: 50, x: 46 },
  ],
};

function getFormationPositions(team: Team, side: 'home' | 'away') {
  const formationCoords = FORMATIONS[team.formation] || FORMATIONS['4-4-2'];
  const starters = team.players.filter(p => p.isStarter && !p.hasLeftGame);

  return starters.slice(0, 11).map((player, idx) => {
    if (player.coordX !== undefined && player.coordY !== undefined) {
      return { player, x: player.coordX, y: player.coordY };
    }
    const coord = formationCoords[idx] || { y: 50, x: 25 };
    const x = side === 'home' ? coord.x : (100 - coord.x);
    return { player, x, y: coord.y };
  });
}

function TeamPlayers({ team, side }: { team: Team; side: 'home' | 'away' }) {
  const positions = getFormationPositions(team, side);

  if (team.players.length === 0) {
    const formationCoords = FORMATIONS[team.formation] || FORMATIONS['4-4-2'];
    return (
      <>
        {formationCoords.map((coord, idx) => {
          const x = side === 'home' ? coord.x : (100 - coord.x);
          return (
            <div
              key={idx}
              className="absolute -translate-x-1/2 -translate-y-1/2 z-10"
              style={{ left: `${x}%`, top: `${coord.y}%` }}
            >
              <div
                className="w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center text-[10px] md:text-xs font-black text-white shadow-xl border-2 border-white/20 opacity-60"
                style={{ backgroundColor: team.color }}
              >
                {idx + 1}
              </div>
            </div>
          );
        })}
      </>
    );
  }

  return (
    <>
      {positions.map(({ player, x, y }) => (
        <div
          key={player.id}
          className="absolute -translate-x-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing transition-shadow z-10 hover:z-20 group"
          style={{ left: `${x}%`, top: `${y}%` }}
        >
          <div
            className="w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center text-[10px] md:text-xs font-black text-white shadow-xl border-2 border-white/20 group-hover:scale-110 transition-transform"
            style={{ backgroundColor: team.color }}
          >
            {player.number}
          </div>
          <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap bg-slate-900/80 px-2 py-0.5 rounded text-[8px] font-black text-white uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
            {player.name.split(' ').pop()}
          </div>
        </div>
      ))}
    </>
  );
}

export function TacticalField({ state }: TacticalFieldProps) {
  return (
    <div className="tactical-field-wrapper w-full">
      <div
        className="relative bg-emerald-900/40 rounded-[2rem] md:rounded-[2.5rem] border-4 border-white/10 overflow-hidden shadow-2xl backdrop-blur-sm"
        style={{ aspectRatio: '16/9', minHeight: '300px' }}
      >
        {/* Pitch Lines */}
        <div className="absolute inset-0 pointer-events-none opacity-30">
          <div className="absolute inset-0 border-2 border-white/50 m-4 rounded-lg" />
          <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-white/50" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-28 h-28 md:w-32 md:h-32 border-2 border-white/50 rounded-full" />
          {/* Areas */}
          <div className="absolute top-[20%] bottom-[20%] left-4 w-20 md:w-24 border-2 border-white/50 border-l-0 rounded-r-lg" />
          <div className="absolute top-[20%] bottom-[20%] right-4 w-20 md:w-24 border-2 border-white/50 border-r-0 rounded-l-lg" />
          {/* Goal areas */}
          <div className="absolute top-[35%] bottom-[35%] left-4 w-10 md:w-12 border-2 border-white/50 border-l-0 rounded-r-md" />
          <div className="absolute top-[35%] bottom-[35%] right-4 w-10 md:w-12 border-2 border-white/50 border-r-0 rounded-l-md" />
        </div>

        {/* Players */}
        <div className="absolute inset-0">
          <TeamPlayers team={state.homeTeam} side="home" />
          <TeamPlayers team={state.awayTeam} side="away" />
        </div>

        {/* Label */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-[8px] font-black uppercase tracking-[0.3em] text-white/40 flex items-center gap-2">
          <span>🏟️ MAPA TÁTICO</span>
        </div>
      </div>
    </div>
  );
}
