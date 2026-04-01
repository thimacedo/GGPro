import { MatchState, EventType } from '../types';

export const generateReportText = (matchState: MatchState, formatEventType: (type: EventType) => string): string => {
  const safeEvents = matchState.events || [];
  const homeScore = safeEvents.filter(e => e.teamId === 'home' && e.type === 'GOAL' && !e.isAnnulled).length;
  const awayScore = safeEvents.filter(e => e.teamId === 'away' && e.type === 'GOAL' && !e.isAnnulled).length;

  let report = `🔴 GG PRO - Resumo da Partida 🔴\n`;
  if (matchState.competition) report += `${matchState.competition}\n`;
  report += `${matchState.homeTeam.name} ${homeScore} x ${awayScore} ${matchState.awayTeam.name}\n`;
  const now = Date.now();
  const elapsed = matchState.timeElapsed + (matchState.timerStartedAt && !matchState.isPaused ? now - matchState.timerStartedAt : 0);
  const currentMin = Math.floor(elapsed / 60000);
  report += `Tempo de Jogo: ${currentMin}'\n\n`;

  const goals = safeEvents.filter(e => e.type === 'GOAL' && !e.isAnnulled).reverse();
  if (goals.length > 0) {
    report += `⚽ GOLS:\n`;
    goals.forEach(g => {
      const teamName = g.teamId === 'home' ? matchState.homeTeam.shortName : matchState.awayTeam.shortName;
      const descClean = g.description.replace(/⚽|🟨|🟥|🔄|🛑|🚩|🧤|❌|🎯/g, '').trim();
      report += `- ${g.minute}': ${descClean} (${teamName})\n`;
    });
    report += `\n`;
  }

  const cards = safeEvents.filter(e => (e.type === 'YELLOW_CARD' || e.type === 'RED_CARD') && !e.isAnnulled).reverse();
  if (cards.length > 0) {
    report += `🟨/🟥 CARTÕES:\n`;
    cards.forEach(c => {
      const teamName = c.teamId === 'home' ? matchState.homeTeam.shortName : matchState.awayTeam.shortName;
      const descClean = c.description.replace(/⚽|🟨|🟥|🔄|🛑|🚩|🧤|❌|🎯/g, '').trim();
      report += `- ${c.minute}': ${descClean} (${teamName})\n`;
    });
    report += `\n`;
  }

  const subs = safeEvents.filter(e => e.type === 'SUBSTITUTION' && !e.isAnnulled).reverse();
  if (subs.length > 0) {
    report += `🔄 SUBSTITUIÇÕES:\n`;
    subs.forEach(s => {
      const teamName = s.teamId === 'home' ? matchState.homeTeam.shortName : matchState.awayTeam.shortName;
      const descClean = s.description.replace(/⚽|🟨|🟥|🔄|🛑|🚩|🧤|❌|🎯/g, '').trim();
      report += `- ${s.minute}': ${descClean} (${teamName})\n`;
    });
    report += `\n`;
  }

  const others = safeEvents.filter(e => !['GOAL', 'YELLOW_CARD', 'RED_CARD', 'SUBSTITUTION'].includes(e.type) && !e.isAnnulled).reverse();
  if (others.length > 0) {
    report += `📋 OUTROS LANCES:\n`;
    others.forEach(o => {
      const teamName = o.teamId === 'home' ? matchState.homeTeam.shortName : o.teamId === 'away' ? matchState.awayTeam.shortName : '';
      const descClean = o.description.replace(/⚽|🟨|🟥|🔄|🛑|🚩|🧤|❌|🎯/g, '').trim();
      report += `- ${o.minute}': ${formatEventType(o.type)} - ${descClean} ${teamName ? `(${teamName})` : ''}\n`;
    });
  }

  return report;
};
