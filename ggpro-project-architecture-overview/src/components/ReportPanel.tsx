import { useState } from 'react';
import type { MatchState } from '../types';

interface ReportPanelProps {
  state: MatchState;
  homeGoals: number;
  awayGoals: number;
  onSaveMatch: () => void;
}

const EVENT_ICONS: Record<string, string> = {
  GOAL: '⚽', YELLOW_CARD: '🟨', RED_CARD: '🟥', SUBSTITUTION: '🔄',
  SHOT: '🎯', FOUL: '🛑', CORNER: '🚩', VAR: '📺',
};

export function ReportPanel({ state, homeGoals, awayGoals, onSaveMatch }: ReportPanelProps) {
  const { homeTeam, awayTeam, events, matchDetails, homeCoach, awayCoach } = state;
  const [showShare, setShowShare] = useState(false);

  // Sort events chronologically
  const sortedEvents = [...events].sort((a, b) => a.timestamp - b.timestamp);
  const goals = sortedEvents.filter(e => e.type === 'GOAL' && !e.isAnnulled);
  const cards = sortedEvents.filter(e => (e.type === 'YELLOW_CARD' || e.type === 'RED_CARD') && !e.isAnnulled);
  const subs = sortedEvents.filter(e => e.type === 'SUBSTITUTION' && !e.isAnnulled);

  const getPlayerName = (playerId: string | undefined, teamId: 'home' | 'away'): string => {
    if (!playerId) return '';
    const team = teamId === 'home' ? homeTeam : awayTeam;
    return team.players.find(p => p.id === playerId)?.name || '';
  };

  const generateTextReport = (): string => {
    const lines = [
      `⚽ ${homeTeam.name} ${homeGoals} × ${awayGoals} ${awayTeam.name}`,
      matchDetails.competition && `🏆 ${matchDetails.competition}`,
      matchDetails.stadium && `🏟️ ${matchDetails.stadium}`,
      matchDetails.date && `📅 ${matchDetails.date}`,
      '',
      '--- GOLS ---',
      ...goals.map(e => {
        const team = e.teamId === 'home' ? homeTeam : awayTeam;
        const player = getPlayerName(e.playerId, e.teamId!);
        return `${e.minute}' ${EVENT_ICONS[e.type]} ${player} (${team.shortName})`;
      }),
      '',
      '--- CARTÕES ---',
      ...cards.map(e => {
        const team = e.teamId === 'home' ? homeTeam : awayTeam;
        const player = getPlayerName(e.playerId, e.teamId!);
        return `${e.minute}' ${EVENT_ICONS[e.type]} ${player} (${team.shortName})`;
      }),
      '',
      '--- SUBSTITUIÇÕES ---',
      ...subs.map(e => {
        const team = e.teamId === 'home' ? homeTeam : awayTeam;
        const out = getPlayerName(e.playerId, e.teamId!);
        const inn = getPlayerName(e.relatedPlayerId, e.teamId!);
        return `${e.minute}' ${out} ↔️ ${inn} (${team.shortName})`;
      }),
    ].filter(Boolean);

    return lines.join('\n');
  };

  const handleShare = async () => {
    const report = generateTextReport();
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${homeTeam.shortName} ${homeGoals} × ${awayGoals} ${awayTeam.shortName}`,
          text: report,
        });
      } catch {
        setShowShare(true);
      }
    } else {
      setShowShare(true);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generateTextReport());
    alert('Relatório copiado!');
  };

  return (
    <div className="space-y-4">
      {/* Score Header */}
      <div className="bg-neutral-900/50 rounded-2xl p-4">
        <div className="text-center mb-4">
          {matchDetails.competition && (
            <div className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-1">
              🏆 {matchDetails.competition}
            </div>
          )}
          
          <div className="flex items-center justify-center gap-4">
            <div className="text-right flex-1">
              <div className="text-sm font-bold uppercase" style={{ color: homeTeam.color }}>
                {homeTeam.name}
              </div>
              {homeCoach && <div className="text-[10px] text-neutral-500">Técnico: {homeCoach}</div>}
            </div>
            
            <div className="flex items-center gap-2">
              <div className="text-4xl font-black" style={{ color: homeTeam.color }}>{homeGoals}</div>
              <div className="text-2xl text-neutral-600">×</div>
              <div className="text-4xl font-black" style={{ color: awayTeam.color }}>{awayGoals}</div>
            </div>
            
            <div className="text-left flex-1">
              <div className="text-sm font-bold uppercase" style={{ color: awayTeam.color }}>
                {awayTeam.name}
              </div>
              {awayCoach && <div className="text-[10px] text-neutral-500">Técnico: {awayCoach}</div>}
            </div>
          </div>
          
          {(matchDetails.stadium || matchDetails.date) && (
            <div className="text-[10px] text-neutral-500 mt-2">
              {matchDetails.stadium && `🏟️ ${matchDetails.stadium}`}
              {matchDetails.stadium && matchDetails.date && ' · '}
              {matchDetails.date && `📅 ${matchDetails.date}`}
            </div>
          )}
        </div>
      </div>

      {/* Goals */}
      {goals.length > 0 && (
        <div className="bg-neutral-900/50 rounded-2xl p-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-2">⚽ Gols</h3>
          <div className="space-y-1">
            {goals.map(e => {
              const team = e.teamId === 'home' ? homeTeam : awayTeam;
              const player = getPlayerName(e.playerId, e.teamId!);
              return (
                <div key={e.id} className="flex items-center gap-2 text-sm">
                  <span className="font-mono text-neutral-500 w-8">{e.minute}'</span>
                  <span style={{ color: team.color }}>⚽</span>
                  <span className="font-medium">{player}</span>
                  <span className="text-xs text-neutral-500">({team.shortName})</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Cards */}
      {cards.length > 0 && (
        <div className="bg-neutral-900/50 rounded-2xl p-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-2">🟨🟥 Cartões</h3>
          <div className="space-y-1">
            {cards.map(e => {
              const team = e.teamId === 'home' ? homeTeam : awayTeam;
              const player = getPlayerName(e.playerId, e.teamId!);
              return (
                <div key={e.id} className="flex items-center gap-2 text-sm">
                  <span className="font-mono text-neutral-500 w-8">{e.minute}'</span>
                  <span>{EVENT_ICONS[e.type]}</span>
                  <span className="font-medium">{player}</span>
                  <span className="text-xs text-neutral-500">({team.shortName})</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Substitutions */}
      {subs.length > 0 && (
        <div className="bg-neutral-900/50 rounded-2xl p-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-2">🔄 Substituições</h3>
          <div className="space-y-1">
            {subs.map(e => {
              const team = e.teamId === 'home' ? homeTeam : awayTeam;
              const out = getPlayerName(e.playerId, e.teamId!);
              const inn = getPlayerName(e.relatedPlayerId, e.teamId!);
              return (
                <div key={e.id} className="flex items-center gap-2 text-sm">
                  <span className="font-mono text-neutral-500 w-8">{e.minute}'</span>
                  <span className="text-neutral-400 line-through">{out}</span>
                  <span className="text-neutral-500">→</span>
                  <span className="font-medium text-green-400">{inn}</span>
                  <span className="text-xs text-neutral-500">({team.shortName})</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={handleShare}
          className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-bold text-sm uppercase tracking-wider"
        >
          📤 Compartilhar
        </button>
        <button
          onClick={onSaveMatch}
          className="flex-1 py-3 rounded-xl bg-green-600 text-white font-bold text-sm uppercase tracking-wider"
        >
          💾 Salvar
        </button>
      </div>

      {/* Share Modal */}
      {showShare && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80" onClick={() => setShowShare(false)}>
          <div className="bg-neutral-900 rounded-2xl w-full max-w-md p-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-3">📋 Relatório</h3>
            <textarea
              readOnly
              value={generateTextReport()}
              className="w-full h-64 bg-neutral-800 rounded-xl p-3 text-sm font-mono text-white resize-none"
            />
            <div className="flex gap-2 mt-3">
              <button onClick={handleCopy} className="flex-1 py-2 rounded-xl bg-blue-600 text-white font-bold text-sm">
                📋 Copiar
              </button>
              <button onClick={() => setShowShare(false)} className="flex-1 py-2 rounded-xl bg-neutral-700 text-white font-bold text-sm">
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
