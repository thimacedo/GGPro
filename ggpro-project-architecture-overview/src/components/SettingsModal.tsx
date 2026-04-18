import { useState } from 'react';
import type { MatchState, Player } from '../types';

interface SettingsModalProps {
  state: MatchState;
  isOpen: boolean;
  onClose: () => void;
  onUpdateTeam: (teamId: 'home' | 'away', data: Partial<{ name: string; shortName: string; color: string; formation: string }>) => void;
  onAddPlayer: (teamId: 'home' | 'away', player: Omit<Player, 'id'>) => void;
  onRemovePlayer: (teamId: 'home' | 'away', playerId: string) => void;
  onUpdatePlayer: (teamId: 'home' | 'away', playerId: string, data: Partial<Player>) => void;
  onUpdateMatchDetails: (details: Partial<MatchState['matchDetails']>) => void;
  onUpdateCoach: (side: 'home' | 'away', name: string) => void;
  onResetMatch: () => void;
  onImportJSON: () => void;
  onExportJSON: () => void;
}

export function SettingsModal({ 
  state, isOpen, onClose, onUpdateTeam, onAddPlayer, onRemovePlayer, 
  onUpdateMatchDetails, onUpdateCoach, onResetMatch, onImportJSON, onExportJSON
}: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<'home' | 'away' | 'match'>('home');
  const [newPlayer, setNewPlayer] = useState({ name: '', number: '', position: 'MC', isStarter: false });

  if (!isOpen) return null;

  const teamKey = activeTab === 'match' ? 'home' : activeTab;
  const currentTeam = teamKey === 'home' ? state.homeTeam : state.awayTeam;
  const players = currentTeam.players.sort((a, b) => a.number - b.number);

  const handleAddPlayer = () => {
    if (!newPlayer.name || !newPlayer.number) return;
    onAddPlayer(teamKey, {
      hasLeftGame: false,
      name: newPlayer.name,
      number: parseInt(newPlayer.number),
      position: newPlayer.position,
      isStarter: newPlayer.isStarter,
    });
    setNewPlayer({ name: '', number: '', position: 'MC', isStarter: false });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-md" onClick={onClose}>
      <div 
        className="bg-neutral-900 w-full sm:max-w-lg max-h-[90vh] rounded-t-3xl sm:rounded-3xl overflow-hidden animate-slide-up"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
          <h2 className="text-lg font-bold">⚙️ Configurações</h2>
          <button onClick={onClose} className="p-2 text-neutral-400 hover:text-white">✕</button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/5">
          {[
            { id: 'home' as const, label: state.homeTeam.shortName, color: state.homeTeam.color },
            { id: 'away' as const, label: state.awayTeam.shortName, color: state.awayTeam.color },
            { id: 'match' as const, label: '📍 Partida', color: null },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-3 text-sm font-bold uppercase tracking-wider transition-all ${
                activeTab === tab.id
                  ? 'text-white border-b-2'
                  : 'text-neutral-500 border-b-2 border-transparent'
              }`}
              style={activeTab === tab.id && tab.color ? { borderBottomColor: tab.color } : {}}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[60vh] p-4 space-y-4 thin-scrollbar">
          {activeTab !== 'match' ? (
            <>
              {/* Team Info */}
              <div className="space-y-3">
                <input
                  type="text"
                  value={currentTeam.name}
                  onChange={e => onUpdateTeam(teamKey, { name: e.target.value })}
                  placeholder="Nome do time"
                  className="w-full bg-neutral-800 rounded-xl px-3 py-2 text-sm text-white"
                />
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={currentTeam.shortName}
                    onChange={e => onUpdateTeam(activeTab, { shortName: e.target.value.toUpperCase().slice(0, 3) })}
                    placeholder="SIGLA"
                    maxLength={3}
                    className="w-20 bg-neutral-800 rounded-xl px-3 py-2 text-sm text-white text-center font-bold"
                  />
                  <input
                    type="color"
                    value={currentTeam.color}
                    onChange={e => onUpdateTeam(activeTab, { color: e.target.value })}
                    className="w-12 h-10 rounded-xl cursor-pointer"
                  />
                  <select
                    value={currentTeam.formation}
                    onChange={e => onUpdateTeam(activeTab, { formation: e.target.value })}
                    className="flex-1 bg-neutral-800 rounded-xl px-3 py-2 text-sm text-white"
                  >
                    <option value="4-4-2">4-4-2</option>
                    <option value="4-3-3">4-3-3</option>
                    <option value="4-2-3-1">4-2-3-1</option>
                    <option value="3-5-2">3-5-2</option>
                    <option value="5-3-2">5-3-2</option>
                    <option value="5-4-1">5-4-1</option>
                  </select>
                </div>
                
                {/* Coach */}
                <input
                  type="text"
                  value={activeTab === 'home' ? state.homeCoach : state.awayCoach}
                  onChange={e => onUpdateCoach(activeTab, e.target.value)}
                  placeholder="Nome do técnico"
                  className="w-full bg-neutral-800 rounded-xl px-3 py-2 text-sm text-white"
                />
              </div>

              {/* Players List */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-2">
                  Jogadores ({players.length})
                </h3>
                
                <div className="space-y-1 mb-3">
                  {players.map(p => (
                    <div key={p.id} className="flex items-center gap-2 bg-neutral-800/50 rounded-lg px-2 py-1.5">
                      <span className="w-6 text-center font-mono text-sm text-neutral-500">#{p.number}</span>
                      <span className="flex-1 text-sm truncate">{p.name}</span>
                      <span className="text-[10px] text-neutral-500 uppercase">{p.position}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${p.isStarter ? 'bg-green-600/20 text-green-400' : 'bg-yellow-600/20 text-yellow-400'}`}>
                        {p.isStarter ? 'T' : 'R'}
                      </span>
                      <button
                        onClick={() => onRemovePlayer(activeTab, p.id)}
                        className="text-neutral-600 hover:text-red-400 text-xs"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>

                {/* Add Player */}
                <div className="flex gap-1">
                  <input
                    type="number"
                    value={newPlayer.number}
                    onChange={e => setNewPlayer({ ...newPlayer, number: e.target.value })}
                    placeholder="#"
                    className="w-14 bg-neutral-800 rounded-lg px-2 py-1.5 text-sm text-white"
                  />
                  <input
                    type="text"
                    value={newPlayer.name}
                    onChange={e => setNewPlayer({ ...newPlayer, name: e.target.value })}
                    placeholder="Nome"
                    className="flex-1 bg-neutral-800 rounded-lg px-2 py-1.5 text-sm text-white"
                  />
                  <select
                    value={newPlayer.position}
                    onChange={e => setNewPlayer({ ...newPlayer, position: e.target.value })}
                    className="w-16 bg-neutral-800 rounded-lg px-1 py-1.5 text-xs text-white"
                  >
                    <option value="GK">GK</option>
                    <option value="ZAG">ZAG</option>
                    <option value="LE">LE</option>
                    <option value="LD">LD</option>
                    <option value="VOL">VOL</option>
                    <option value="MC">MC</option>
                    <option value="MEI">MEI</option>
                    <option value="PE">PE</option>
                    <option value="PD">PD</option>
                    <option value="ATA">ATA</option>
                  </select>
                  <button
                    onClick={handleAddPlayer}
                    className="px-3 py-1.5 rounded-lg bg-green-600 text-white font-bold text-xs"
                  >
                    +
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Match Details */}
              <div className="space-y-3">
                <input
                  type="text"
                  value={state.matchDetails.competition}
                  onChange={e => onUpdateMatchDetails({ competition: e.target.value })}
                  placeholder="Competição"
                  className="w-full bg-neutral-800 rounded-xl px-3 py-2 text-sm text-white"
                />
                <input
                  type="text"
                  value={state.matchDetails.stadium}
                  onChange={e => onUpdateMatchDetails({ stadium: e.target.value })}
                  placeholder="Estádio"
                  className="w-full bg-neutral-800 rounded-xl px-3 py-2 text-sm text-white"
                />
                <input
                  type="text"
                  value={state.matchDetails.referee}
                  onChange={e => onUpdateMatchDetails({ referee: e.target.value })}
                  placeholder="Árbitro"
                  className="w-full bg-neutral-800 rounded-xl px-3 py-2 text-sm text-white"
                />
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={state.matchDetails.date}
                    onChange={e => onUpdateMatchDetails({ date: e.target.value })}
                    className="flex-1 bg-neutral-800 rounded-xl px-3 py-2 text-sm text-white"
                  />
                  <input
                    type="time"
                    value={state.matchDetails.time}
                    onChange={e => onUpdateMatchDetails({ time: e.target.value })}
                    className="flex-1 bg-neutral-800 rounded-xl px-3 py-2 text-sm text-white"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-2 pt-4 border-t border-white/5">
                <div className="flex gap-2">
                  <button
                    onClick={onImportJSON}
                    className="flex-1 py-2 rounded-xl bg-neutral-800 text-white font-bold text-sm"
                  >
                    📂 Importar
                  </button>
                  <button
                    onClick={onExportJSON}
                    className="flex-1 py-2 rounded-xl bg-neutral-800 text-white font-bold text-sm"
                  >
                    💾 Exportar
                  </button>
                </div>
                <button
                  onClick={() => { if (confirm('Resetar partida?')) onResetMatch(); }}
                  className="w-full py-2 rounded-xl bg-red-600/20 text-red-400 font-bold text-sm"
                >
                  🗑️ Resetar Partida
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
