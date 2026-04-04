import React, { useState, useMemo } from 'react';
import { Team, Player, MatchState } from '../types';
import { Check, X } from 'lucide-react';

interface PenaltyShootoutProps {
    homeTeam: Team; awayTeam: Team; state: MatchState;
    onRegisterPenalty: (teamId: 'home' | 'away', player: Player, outcome: 'scored' | 'missed', details: string) => void;
}

const PenaltyShootout: React.FC<PenaltyShootoutProps> = ({ homeTeam, awayTeam, state, onRegisterPenalty }) => {
    const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);

    const getEligible = (team: Team) => {
        return team.players.filter(p => {
            const hasRedCard = p.events.some(e => e.type === 'RED_CARD' && !e.isAnnulled);
            const wasSubbedOut = p.events.some(e => e.type === 'SUBSTITUTION' && e.playerId === p.id);
            const wasInGame = p.isStarter || p.events.some(e => e.type === 'SUBSTITUTION' && e.relatedPlayerId === p.id);
            return wasInGame && !wasSubbedOut && !hasRedCard;
        });
    };

    const homeEligible = useMemo(() => getEligible(homeTeam), [homeTeam]);
    const awayEligible = useMemo(() => getEligible(awayTeam), [awayTeam]);
    
    const starter = state.penaltyStarter || 'home';
    const totalShots = state.penaltySequence.length;
    const nextTeamToShoot = totalShots % 2 === 0 ? starter : (starter === 'home' ? 'away' : 'home');

    const handleOutcome = (outcome: 'scored' | 'missed') => {
        if (selectedPlayer) {
            const details = outcome === 'scored' ? 'Gol de Pênalti' : 'Pênalti Perdido';
            onRegisterPenalty(selectedPlayer.teamId, selectedPlayer, outcome, details);
            setSelectedPlayer(null);
        }
    };

    const renderDots = (teamId: 'home' | 'away') => {
        const teamShots = state.penaltySequence.filter(s => s.teamId === teamId);
        const totalSlots = Math.max(5, teamShots.length + 1);
        
        return Array.from({ length: totalSlots }).map((_, i) => {
            const shot = teamShots[i];
            let color = 'bg-slate-800 border-slate-700 text-slate-600'; 
            let content = <span className="text-[10px] font-mono">{i + 1}</span>;

            if (shot) {
                if (shot.outcome === 'scored') {
                    color = 'bg-emerald-500 border-emerald-400 text-white shadow-[0_0_10px_rgba(16,185,129,0.5)]';
                    content = <Check size={10} strokeWidth={4} />;
                } else {
                    color = 'bg-rose-500 border-rose-400 text-white shadow-[0_0_10px_rgba(244,63,94,0.5)]';
                    content = <X size={10} strokeWidth={4} />;
                }
            }

            return <div key={i} className={`flex-shrink-0 w-6 h-6 md:w-8 md:h-8 rounded-full flex items-center justify-center border ${color} transition-all`}>{content}</div>;
        });
    };

    const renderPlayerButton = (p: Player, teamId: 'home' | 'away') => {
        const shotHistory = state.penaltySequence.find(shot => shot.playerId === p.id);
        const hasKicked = !!shotHistory;
        const isMyTurn = nextTeamToShoot === teamId;

        let btnClass = "w-full p-3 rounded-xl text-xs font-bold text-left transition-all border flex items-center justify-between ";
        
        if (hasKicked) {
            if (shotHistory?.outcome === 'scored') btnClass += "bg-emerald-600/90 border-emerald-500 text-white opacity-80 cursor-not-allowed";
            else btnClass += "bg-rose-600/90 border-rose-500 text-white opacity-80 cursor-not-allowed";
        } else if (isMyTurn) {
            btnClass += "bg-slate-800 text-white border-slate-600 hover:border-blue-400 hover:bg-slate-700 hover:shadow-lg cursor-pointer";
        } else {
            btnClass += "bg-slate-900/40 text-slate-600 border-transparent opacity-40 cursor-not-allowed";
        }

        return (
            <button key={p.id} disabled={hasKicked || !isMyTurn} onClick={() => setSelectedPlayer(p)} className={btnClass}>
                <div className="flex items-center gap-2">
                    <span className={`font-mono ${hasKicked ? 'text-white/70' : 'text-slate-500'}`}>#{String(p.number).padStart(2, '0')}</span> 
                    <span className="truncate">{p.name}</span>
                </div>
                {hasKicked && <div className="bg-black/20 p-1 rounded-full">{shotHistory?.outcome === 'scored' ? <Check size={12}/> : <X size={12}/>}</div>}
            </button>
        );
    };

    return (
        <div className="flex flex-col gap-4 bg-slate-900 p-2 md:p-4 rounded-3xl border border-white/10 h-full">
            <div className="bg-black/40 p-4 rounded-2xl border border-white/5 shadow-inner">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex flex-col items-center w-full md:w-auto">
                        <div className={`text-3xl md:text-5xl font-black mb-2 transition-colors ${nextTeamToShoot === 'home' ? 'text-blue-400 scale-110' : 'text-white'}`}>{state.penaltyScore.home}</div>
                        <div className="text-[10px] uppercase font-bold text-slate-500 mb-1">{homeTeam.shortName}</div>
                        <div className="flex gap-1 overflow-x-auto max-w-[140px] md:max-w-none pb-2 no-scrollbar px-1">{renderDots('home')}</div>
                    </div>
                    <div className="text-xs font-black text-slate-600 uppercase">X</div>
                    <div className="flex flex-col items-center w-full md:w-auto">
                        <div className={`text-3xl md:text-5xl font-black mb-2 transition-colors ${nextTeamToShoot === 'away' ? 'text-red-400 scale-110' : 'text-white'}`}>{state.penaltyScore.away}</div>
                        <div className="text-[10px] uppercase font-bold text-slate-500 mb-1">{awayTeam.shortName}</div>
                        <div className="flex gap-1 overflow-x-auto max-w-[140px] md:max-w-none pb-2 no-scrollbar px-1">{renderDots('away')}</div>
                    </div>
                </div>
                {!selectedPlayer && (
                    <div className="text-center animate-pulse mt-4 bg-white/5 py-1 rounded-lg">
                        <span className={`text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 ${nextTeamToShoot === 'home' ? 'text-blue-400' : 'text-red-400'}`}>
                            Vez de bater: {nextTeamToShoot === 'home' ? homeTeam.name : awayTeam.name}
                        </span>
                    </div>
                )}
            </div>

            {selectedPlayer ? (
                <div className="bg-slate-800 p-6 rounded-2xl border border-blue-500/30 flex-1 flex flex-col justify-center animate-in zoom-in-95 duration-200">
                    <div className="text-center mb-6">
                        <h2 className="text-2xl font-black text-white">{selectedPlayer.name}</h2>
                        <span className="text-sm font-bold text-slate-500">Camisa #{selectedPlayer.number}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <button onClick={() => handleOutcome('scored')} className="bg-emerald-600 hover:bg-emerald-500 h-24 rounded-xl font-black text-white flex flex-col items-center justify-center gap-2 shadow-lg active:scale-95 transition-all"><Check size={32} /> <span className="text-sm uppercase tracking-widest">Gol</span></button>
                        <button onClick={() => handleOutcome('missed')} className="bg-rose-600 hover:bg-rose-500 h-24 rounded-xl font-black text-white flex flex-col items-center justify-center gap-2 shadow-lg active:scale-95 transition-all"><X size={32} /> <span className="text-sm uppercase tracking-widest">Perdeu</span></button>
                    </div>
                    <button onClick={() => setSelectedPlayer(null)} className="w-full mt-6 py-4 text-xs font-bold uppercase tracking-widest text-slate-500 hover:text-white transition-colors">Cancelar / Trocar Batedor</button>
                </div>
            ) : (
                <div className="grid grid-cols-2 gap-3 flex-1 overflow-y-auto custom-scrollbar pr-1 content-start">
                    <div className="space-y-1">
                        <div className="sticky top-0 bg-slate-900/80 backdrop-blur-md py-2 z-10 border-b border-white/5 mb-2"><span className="text-[10px] font-black uppercase text-blue-500 tracking-widest">Batedores {homeTeam.shortName}</span></div>
                        {homeEligible.map(p => renderPlayerButton(p, 'home'))}
                    </div>
                    <div className="space-y-1">
                        <div className="sticky top-0 bg-slate-900/80 backdrop-blur-md py-2 z-10 border-b border-white/5 mb-2"><span className="text-[10px] font-black uppercase text-rose-500 tracking-widest">Batedores {awayTeam.shortName}</span></div>
                        {awayEligible.map(p => renderPlayerButton(p, 'away'))}
                    </div>
                </div>
            )}
            <style>{`.no-scrollbar::-webkit-scrollbar { display: none; } .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }`}</style>
        </div>
    );
};
export default PenaltyShootout;
