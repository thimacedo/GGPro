import React from 'react';
import { LayoutDashboard, ListFilter, Maximize, Minimize, History, Camera, Users, Pencil } from 'lucide-react';
import Field from './Field';
import PlayerList from './PlayerList';
import QuickActionsPanel from './QuickActionsPanel';
import EventItem from './EventItem';
import PenaltyShootout from './PenaltyShootout';
import { MatchState, MatchEvent, PenaltyShot } from '../types';

interface Props {
  matchState: MatchState;
  ctrl: any; // useMatchController
  ui: any;   // useUIController
  ai: any;   // useAIExtractor
}

export default function DashboardTab({ matchState, ctrl, ui, ai }: Props) {
  const isList = ui.viewMode === 'list';
  const isField = ui.viewMode === 'field';

  return (
    <>
      {matchState.period !== 'PENALTIES' ? (
        <div className={`grid grid-cols-1 lg:grid-cols-12 gap-4 ${ui.isFullscreen ? 'h-full' : ''}`}>
            <div className={`${ui.isFullscreen ? 'lg:col-span-9 flex flex-col h-full min-h-0' : 'lg:col-span-8 flex flex-col gap-4'}`}>
                <div className="flex items-center gap-2 mb-1">
                    <button onClick={() => ui.setViewMode('list')} className={`flex-1 py-3 rounded-2xl flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest border transition-all ${isList ? 'bg-blue-600 border-blue-400 text-white' : 'bg-slate-900 border-white/5 text-slate-500'}`}><ListFilter size={14} /> Lista</button>
                    <button onClick={() => ui.setViewMode('field')} className={`flex-1 py-3 rounded-2xl flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest border transition-all ${isField ? 'bg-blue-600 border-blue-400 text-white' : 'bg-slate-900 border-white/5 text-slate-500'}`}><LayoutDashboard size={14} /> Mapa Tático</button>
                    <button onClick={() => ui.setIsFullscreen(!ui.isFullscreen)} className={`p-3 rounded-2xl flex items-center justify-center border transition-all ${ui.isFullscreen ? 'bg-blue-600 border-blue-400 text-white' : 'bg-slate-900 border-white/5 text-slate-500'}`}>{ui.isFullscreen ? <Minimize size={14} /> : <Maximize size={14} />}</button>
                </div>
                <div className={`relative ${ui.isFullscreen ? 'flex-1 flex flex-col min-h-0' : ''}`}>
                    {isField ? (
                        <Field 
                            homeTeam={matchState.homeTeam} 
                            awayTeam={matchState.awayTeam} 
                            onPlayerClick={(p) => ui.setSelectedPlayerForAction({ player: p, teamId: p.teamId })} 
                            onPlayerMove={(t, id, x, y) => { 
                                ctrl.setMatchState((prev: any) => { 
                                    const k = t === 'home' ? 'homeTeam' : 'awayTeam'; 
                                    const ups = prev[k].players.map((pl: any) => pl.id === id ? { ...pl, x, y } : pl); 
                                    return { ...prev, [k]: { ...prev[k], players: ups } }; 
                                }); 
                            }} 
                            onQuickAction={(type: any, teamId: any) => ctrl.addEvent({ type, teamId, description: `Lance rápido (${ctrl.formatEventType(type)})` })} 
                            isFullscreen={ui.isFullscreen} 
                        />
                    ) : (
                        <div className={`flex-1 bg-slate-900/50 rounded-3xl border border-white/5 p-4 flex flex-col ${ui.isFullscreen ? 'h-full min-h-0' : 'h-auto min-h-[600px]'}`}>
                            <div className="grid grid-cols-2 gap-4 flex-1">
                                <div><div className="sticky top-0 bg-slate-900/90 z-10 py-2 border-b border-white/10 mb-2 cursor-pointer hover:bg-slate-800 transition-colors" onClick={() => ui.setSelectedTeamForAction({ team: matchState.homeTeam, teamId: 'home' })}><h4 className="text-[10px] font-black uppercase text-center" style={{color: matchState.homeTeam.color}}>{matchState.homeTeam.shortName}</h4></div><PlayerList team={matchState.homeTeam} variant="compact" onPlayerClick={(p) => ui.setSelectedPlayerForAction({ player: p, teamId: 'home' })} /></div>
                                <div><div className="sticky top-0 bg-slate-900/90 z-10 py-2 border-b border-white/10 mb-2 cursor-pointer hover:bg-slate-800 transition-colors" onClick={() => ui.setSelectedTeamForAction({ team: matchState.awayTeam, teamId: 'away' })}><h4 className="text-[10px] font-black uppercase text-center" style={{color: matchState.awayTeam.color}}>{matchState.awayTeam.shortName}</h4></div><PlayerList team={matchState.awayTeam} variant="compact" onPlayerClick={(p) => ui.setSelectedPlayerForAction({ player: p, teamId: 'away' })} /></div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            
            <div className={`${ui.isFullscreen ? 'lg:col-span-3 flex flex-col h-full min-h-0' : 'lg:col-span-4 flex flex-col gap-4'}`}>
                {!ui.isFullscreen && (
                <div className="grid grid-cols-2 gap-3 flex-none">
                    <QuickActionsPanel team={matchState.homeTeam} teamId="home" onAddEvent={ctrl.addEvent} />
                    <QuickActionsPanel team={matchState.awayTeam} teamId="away" onAddEvent={ctrl.addEvent} />
                </div>
                )}

                <div className={`bg-slate-900/50 rounded-[2rem] border border-white/5 flex flex-col overflow-hidden shadow-2xl h-full ${ui.isFullscreen ? '' : 'min-h-[500px]'}`}>
                    <div className="p-6 border-b border-white/5 bg-white/5 flex justify-between items-center">
                        <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-400 flex items-center gap-2"><History size={16} /> Cronologia</h3>
                        {(matchState.events || []).length > 0 && (
                            <button onClick={() => {
                                ctrl.setMatchState((prev: MatchState) => {
                                    if (!prev.events || prev.events.length === 0) return prev;
                                    return { ...prev, events: prev.events.slice(1) };
                                });
                            }} className="text-[9px] font-black text-slate-500 hover:text-red-400 uppercase">Desfazer Último</button>
                        )}
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-3">
                        {(matchState.events || []).map(e => (<div key={e.id} className={`flex gap-3 py-3 border-l-4 mb-1 pl-3 transition-colors rounded-r ${e.isAnnulled ? 'opacity-50' : ''}`} style={{ borderColor: e.isAnnulled ? '#64748b' : (e.teamId === 'home' ? matchState.homeTeam.color : e.teamId === 'away' ? matchState.awayTeam.color : '#475569'), backgroundColor: `${e.teamId === 'home' ? matchState.homeTeam.color : matchState.awayTeam.color}10` }}><span className={`font-mono font-black text-[10px] pt-0.5 min-w-[24px] ${e.isAnnulled ? 'line-through text-slate-600' : 'text-slate-400'}`}>{e.minute}'</span><EventItem event={e} matchState={matchState} formatEventType={ctrl.formatEventType} /></div>))}
                        {(matchState.events || []).length === 0 && (
                            <div className="text-center text-slate-500 text-xs py-2">Nenhum evento registrado</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
      ) : (<div className={`${ui.isFullscreen ? 'h-full' : 'h-[500px]'}`}><PenaltyShootout homeTeam={matchState.homeTeam} awayTeam={matchState.awayTeam} state={matchState} onRegisterPenalty={(t, p, o, d) => {
          ctrl.saveToHistory(); ctrl.setMatchState((prev: MatchState) => { const s = { ...prev.penaltyScore }; if (o === 'scored') s[t]++; const shot: PenaltyShot = { id: Math.random().toString(36).substr(2, 9), teamId: t, playerId: p.id, outcome: o, number: prev.penaltySequence.length + 1 }; const event: MatchEvent = { id: Math.random().toString(36).substr(2, 9), type: 'PENALTY_SHOOTOUT', teamId: t, playerId: p.id, minute: prev.currentTime, timestamp: Date.now(), description: `${d} - ${p.name}`, isAnnulled: false }; return { ...prev, penaltyScore: s, penaltySequence: [...prev.penaltySequence, shot], events: [event, ...(prev.events || [])] }; });
      }} /></div>)}

      {!ui.isFullscreen && (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-4">
          {['home', 'away'].map((tId) => {
              const t = tId === 'home' ? matchState.homeTeam : matchState.awayTeam;
              return (
                  <div key={tId} className="bg-slate-900/30 rounded-[2.5rem] p-8 border border-white/5">
                      <div className="flex items-center justify-between mb-8">
                          <h3 className="text-xl font-black text-white uppercase tracking-tighter flex items-center gap-3 cursor-pointer hover:text-blue-400 transition-colors group" onClick={() => ui.setTeamModal({ isOpen: true, teamId: tId as 'home' | 'away' })}>
                              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: t.color }}></div>
                              {t.name}
                              <Pencil size={12} className="opacity-0 group-hover:opacity-100" />
                          </h3>
                          <div className="flex gap-2">
                              <label className="p-3 bg-slate-800 hover:bg-slate-700 rounded-xl cursor-pointer text-white transition-all">
                                <Camera size={16} />
                                <input type="file" className="hidden" accept="image/*" onChange={(e) => ai.handleImageUpload(e, tId)} />
                              </label>
                              <button onClick={() => ui.setImportListModal({ isOpen: true, teamId: tId as 'home' | 'away' })} className="p-3 bg-slate-800 hover:bg-slate-700 rounded-xl text-white transition-all"><Users size={16} /></button>
                          </div>
                      </div>
                      <PlayerList 
                          team={t} 
                          variant="full" 
                          onEditCoach={() => ui.setCoachModal({isOpen: true, teamId: tId as 'home' | 'away'})} 
                          onPlayerClick={(p) => ui.setSelectedPlayerForAction({ player: p, teamId: p.teamId })} 
                          onEditPlayer={(p) => ui.setPlayerModal({ isOpen: true, teamId: p.teamId, player: p })}
                      />
                  </div>
              );
          })}
      </div>
      )}
    </>
  );
}
