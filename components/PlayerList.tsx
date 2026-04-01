import React, { useState } from 'react';
import { Team, Player } from '../types';
import { User, Users, MapPin, UserCog, Pencil, PlusCircle, Trash2 } from 'lucide-react';

interface PlayerListProps {
  team: Team;
  variant: 'full' | 'compact';
  onPlayerClick: (player: Player) => void;
  onEditCoach?: () => void;
  onEditPlayer?: (player: Player) => void;
}

const PlayerList: React.FC<PlayerListProps> = ({ team, variant, onPlayerClick, onEditCoach, onEditPlayer }) => {
  const sortByGK = (a: Player, b: Player) => {
    if (a.position === 'GK' && b.position !== 'GK') return -1;
    if (a.position !== 'GK' && b.position === 'GK') return 1;
    return a.number - b.number; // secundário: número
  };

  const players = [...(team.players || [])];
  const starters = players.filter(p => p.isStarter).sort(sortByGK);
  const subs = players.filter(p => !p.isStarter).sort(sortByGK);
  const coach = team.coach || 'Comissão Técnica';

  const [searchTerm, setSearchTerm] = useState('');

  const filteredPlayers = players.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.number.toString().includes(searchTerm)
  );

  if (variant === 'compact') {
    return (
      <div className="flex flex-col">
        <div className="space-y-1.5">
          {starters.map(player => (
            <button 
              key={player.id} 
              onClick={() => onPlayerClick(player)}
              className={`w-full p-2.5 rounded-xl text-left font-bold text-sm flex items-center gap-3 transition-all border border-white/5 bg-slate-900/40 hover:bg-slate-800`}
              style={{ borderColor: `${team.color}15` }}
            >
              <div className={`font-mono text-sm font-black w-8 h-8 flex items-center justify-center rounded-lg shadow-xl text-white shrink-0`} style={{ backgroundColor: `${team.color}` }}>
                {player.number}
              </div>
              <span className={`flex-1 truncate text-white font-black`}>{player.name}</span>
            </button>
          ))}
          {players.length === 0 && (
            <div className="text-center text-slate-500 text-xs py-10 flex flex-col items-center gap-3">
              <Users size={24} className="opacity-30" />
              Nenhum jogador cadastrado.
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      
      {/* COORDENAÇÃO / TREINADOR - AJUSTADO PARA CONTRASTE */}
      <div className="bg-slate-900 border border-white/5 p-5 rounded-3xl flex items-center justify-between group shadow-xl">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-slate-800 rounded-xl text-slate-400 border border-white/5">
            <UserCog size={20} />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-0.5">Treinador / Coordenação</p>
            <p className="text-white font-black text-base">{coach}</p>
          </div>
        </div>
        {onEditCoach && (
            <button onClick={onEditCoach} className="p-2.5 rounded-xl bg-slate-800 text-slate-500 hover:text-white hover:bg-slate-700 transition-all border border-white/5 opacity-100 md:opacity-0 md:group-hover:opacity-100"><Pencil size={16} /></button>
        )}
      </div>

      {/* LISTA COMPLETA - ALTURA LIMITADA COM SCROLL PARA EVITAR OVERLAP */}
      <div className="bg-slate-900 border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col">
        <div className="max-h-[500px] overflow-y-auto custom-scrollbar">
          {/* TITULARES - AJUSTADO */}
          <div className="p-5 pb-3">
            <div className="flex items-center gap-3 mb-4">
              <h4 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: team.color }}></div>
                Titulares <span className="font-mono text-slate-400">({starters.length})</span>
              </h4>
            </div>
            <div className="space-y-1.5">
              {starters.map(player => (
                <div key={player.id} className="flex items-center gap-4 p-2.5 rounded-xl hover:bg-slate-800 group border border-transparent hover:border-white/5 transition-all">
                  <div className="font-mono text-lg font-black w-10 h-10 flex items-center justify-center rounded-lg bg-black/80 text-white border border-white/10 shadow-inner">
                    {player.number}
                  </div>
                  <div className="flex-1">
                    <p className="text-white font-extrabold text-sm">{player.name}</p>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">{player.position || 'Jogador'}</p>
                  </div>
                  <div className="flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                    {onEditPlayer && <button onClick={() => onEditPlayer(player)} className="p-2 rounded-lg bg-slate-700/50 text-slate-400 hover:text-white"><Pencil size={14} /></button>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="h-px bg-white/5 mx-5"></div>

          {/* RESERVAS - AJUSTADO */}
          <div className="p-5 pt-4">
            <div className="flex items-center gap-3 mb-4">
              <h4 className="text-sm font-black text-slate-100 uppercase tracking-wider flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-slate-500"></div>
                Reservas <span className="font-mono text-slate-400">({subs.length})</span>
              </h4>
            </div>
            <div className="space-y-1.5">
              {subs.map(player => (
                <div key={player.id} className="flex items-center gap-4 p-2.5 rounded-xl hover:bg-slate-800 group border border-transparent hover:border-white/5 transition-all bg-slate-900/40">
                  <div className="font-mono text-base font-black w-9 h-9 flex items-center justify-center rounded-lg bg-slate-800/80 text-slate-100 border border-white/5">
                    {player.number}
                  </div>
                  <div className="flex-1">
                    <p className="text-slate-100 font-bold text-sm">{player.name}</p>
                    <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-widest">{player.position || 'Reserva'}</p>
                  </div>
                  <div className="flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                    {onEditPlayer && <button onClick={() => onEditPlayer(player)} className="p-2 rounded-lg bg-slate-700/50 text-slate-400 hover:text-white"><Pencil size={14} /></button>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {players.length === 0 && (
          <div className="text-center text-slate-500 text-sm py-16 flex flex-col items-center gap-4">
            <Users size={32} className="opacity-30" />
            Nenhum jogador cadastrado.
          </div>
        )}
      </div>
    </div>
  );
};

export default PlayerList;