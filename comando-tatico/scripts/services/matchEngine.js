/**
 * matchEngine.js — Regras de Jogo + Motor de Eventos
 */

import state from '../state.js';
import Clock from './clock.js';

function uid() {
  return crypto.randomUUID?.() ?? Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

function teamKey(teamId) { return teamId === 'home' ? 'homeTeam' : 'awayTeam'; }
function teamShort(teamId) { return state.get()[teamKey(teamId)].short; }
function updateStat(teamId, playerId, stat, delta = 1) {
  state.set(prev => {
    const k = teamKey(teamId);
    return { [k]: { ...prev[k], players: prev[k].players.map(p => p.id === playerId ? { ...p, stats: { ...p.stats, [stat]: p.stats[stat] + delta } } : p) } };
  });
}

// --- Core Event ---
function addEvent(data) {
  const minute = Clock.getMinute();
  const icon = { GOAL:'⚽', YELLOW_CARD:'🟨', RED_CARD:'🟥', SUBSTITUTION:'🔄', FOUL:'🛑', SHOT:'🎯', CORNER:'🚩', PENALTY:'💥', OFFSIDE:'📏', SAVE:'🧤', WOODWORK:'🪵', VAR:'📺', INJURY:'🏥', PERIOD_START:'▶️', PERIOD_END:'⏹️', PENALTY_GOAL:'🥅', PENALTY_MISS:'❌', CONCUSSION_SUB:'🤕', GENERIC:'•' };
  const event = {
    id: uid(), type: data.type, teamId: data.teamId ?? 'none',
    playerId: data.playerId ?? null, relatedPlayerId: data.relatedPlayerId ?? null,
    minute, timestamp: Date.now(),
    description: data.description || `${icon[data.type] || '•'} ${data.type}`,
    isAnnulled: false
  };
  state.set(prev => ({ match: { ...prev.match, events: [event, ...prev.match.events] } }));
  return event;
}

// --- Goal ---
function goal(teamId, playerId) {
  state.pushHistory();
  const s = state.get();
  const k = teamId === 'home' ? 'home' : 'away';
  const p = playerId ? s[teamKey(teamId)].players.find(pl => pl.id === playerId) : null;
  const desc = p ? `⚽ #${p.number} ${p.name} [${teamShort(teamId)}]` : `⚽ [${teamShort(teamId)}]`;
  state.set(prev => ({ match: { ...prev.match, score: { ...prev.match.score, [k]: prev.match.score[k] + 1 } } }));
  if (p) updateStat(teamId, playerId, 'goals');
  addEvent({ type: 'GOAL', teamId, playerId, description: desc });
  return { ok: true, msg: `⚽ GOOOL! ${desc}`, type: 'celebration' };
}

// --- Cards ---
function yellowCard(teamId, playerId) {
  state.pushHistory();
  const s = state.get();
  const p = playerId ? s[teamKey(teamId)].players.find(pl => pl.id === playerId) : null;
  if (!p) return { ok: false, msg: 'Jogador não encontrado', type: 'error' };
  const yellows = s.match.events.filter(e => e.type === 'YELLOW_CARD' && e.teamId === teamId && e.playerId === playerId && !e.isAnnulled).length;
  updateStat(teamId, playerId, 'yellows');
  const desc = `🟨 #${p.number} ${p.name} [${teamShort(teamId)}]`;
  addEvent({ type: 'YELLOW_CARD', teamId, playerId, description: desc });
  if (yellows >= 1) { setTimeout(() => redCard(teamId, playerId, true), 150); return { ok: true, msg: `🟨 2º amarelo → ${desc}`, type: 'warning' }; }
  return { ok: true, msg: desc, type: 'warning' };
}

function redCard(teamId, playerId, isAuto = false) {
  if (!isAuto) state.pushHistory();
  const p = playerId ? state.get()[teamKey(teamId)].players.find(pl => pl.id === playerId) : null;
  if (!p) return { ok: false, msg: 'Jogador não encontrado', type: 'error' };
  updateStat(teamId, playerId, 'reds');
  const desc = `🟥 #${p.number} ${p.name} [${teamShort(teamId)}]${isAuto ? ' — 2º amarelo' : ' — EXPULSO'}`;
  addEvent({ type: 'RED_CARD', teamId, playerId, description: desc });
  return { ok: true, msg: desc, type: 'danger' };
}

// --- Substitution ---
function substitution(teamId, outId, inId) {
  state.pushHistory();
  const s = state.get();
  const k = teamKey(teamId);
  const out = s[k].players.find(p => p.id === outId);
  const inn = s[k].players.find(p => p.id === inId);
  if (!out || !inn) return { ok: false, msg: 'Jogador não encontrado', type: 'error' };
  if (out.hasLeft)  return { ok: false, msg: `${out.name} já saiu!`, type: 'warning' };
  if (inn.isStarter && !inn.hasLeft) return { ok: false, msg: `${inn.name} já está em campo!`, type: 'warning' };
  const subs = s.match.events.filter(e => e.type === 'SUBSTITUTION' && e.teamId === teamId && !e.isAnnulled).length;
  if (subs >= s.rules.maxSubs) return { ok: false, msg: `Limite de ${s.rules.maxSubs} substituições!`, type: 'danger' };

  state.set(prev => ({ [k]: { ...prev[k], players: prev[k].players.map(p => {
    if (p.id === outId) return { ...p, isStarter: false, hasLeft: true };
    if (p.id === inId)  return { ...p, isStarter: true, pos: out.pos, role: out.role, x: out.x, y: out.y };
    return p;
  })}}));

  const desc = `🔄 Entra #${inn.number} ${inn.name} → Sai #${out.number} ${out.name} [${teamShort(teamId)}] (${subs+1}/${s.rules.maxSubs})`;
  addEvent({ type: 'SUBSTITUTION', teamId, playerId: inId, relatedPlayerId: outId, description: desc });
  return { ok: true, msg: desc, type: 'success' };
}

// --- Simple Events ---
function simpleEvent(type, teamId, playerId) {
  const p = playerId ? state.get()[teamKey(teamId)].players.find(pl => pl.id === playerId) : null;
  const icon = { FOUL:'🛑', SHOT:'🎯', CORNER:'🚩', PENALTY:'💥', OFFSIDE:'📏', SAVE:'🧤', WOODWORK:'🪵', INJURY:'🏥' };
  let desc = `${icon[type] || '•'} `;
  if (p) desc += `#${p.number} ${p.name} [${teamShort(teamId)}]`;
  else desc += `[${teamShort(teamId)}]`;
  if (p && type === 'SHOT')  updateStat(teamId, playerId, 'shots');
  if (p && type === 'FOUL')  updateStat(teamId, playerId, 'fouls');
  if (p && type === 'SAVE')  updateStat(teamId, playerId, 'saves');
  addEvent({ type, teamId, playerId, description: desc });
  return { ok: true, msg: desc, type: 'success' };
}

// --- VAR ---
function annulEvent(eventId) {
  state.pushHistory();
  const s = state.get();
  const event = s.match.events.find(e => e.id === eventId);
  if (!event) return;
  let newScore = { ...s.match.score };
  if (event.type === 'GOAL' && !event.isAnnulled) {
    const k = event.teamId === 'home' ? 'home' : 'away';
    newScore[k] = Math.max(0, newScore[k] - 1);
  }
  state.set(prev => ({
    match: {
      ...prev.match, score: newScore,
      events: [
        { id: uid(), type: 'VAR', teamId: 'none', minute: Clock.getMinute(), timestamp: Date.now(), description: `📺 VAR: Decisão Revisada — ${event.description}`, isAnnulled: false },
        ...prev.match.events.map(e => e.id === eventId ? { ...e, isAnnulled: !e.isAnnulled } : e)
      ]
    }
  }));
}

// --- Penalty Shootout ---
function registerPenalty(teamId, scored) {
  state.pushHistory();
  const s = state.get();
  const k = teamId === 'home' ? 'home' : 'away';
  const shotNum = (s.match.penaltySequence.filter(p => p.team === k).length) + 1;
  let newScore = { ...s.match.penaltyScore };
  if (scored) newScore[k]++;
  const desc = scored ? `🥅 Pênalti convertido [${teamShort(teamId)}] (${shotNum}º)` : `❌ Pênalti perdido [${teamShort(teamId)}] (${shotNum}º)`;
  addEvent({ type: scored ? 'PENALTY_GOAL' : 'PENALTY_MISS', teamId, description: desc });
  state.set(prev => ({
    match: { ...prev.match, penaltyScore: newScore, penaltySequence: [...prev.match.penaltySequence, { team: k, number: shotNum, scored }] }
  }));
}

// --- Move Player ---
function movePlayer(teamId, playerId, dx, dy) {
  const k = teamKey(teamId);
  state.set(prev => ({
    [k]: { ...prev[k], players: prev[k].players.map(p => p.id === playerId ? { ...p, x: Math.max(3, Math.min(97, p.x + dx)), y: Math.max(3, Math.min(97, p.y + dy)) } : p) }
  }));
}

// --- Wire Clock ---
Clock._setAddEvent(addEvent);

export default { addEvent, goal, yellowCard, redCard, substitution, simpleEvent, annulEvent, registerPenalty, movePlayer };
