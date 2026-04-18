/**
 * commander.js — Interpretador de Comandos (NLP Heurístico)
 */

import state from '../state.js';
import Clock from './clock.js';
import Engine from './matchEngine.js';
import { FORMATIONS, INSTRUCTIONS, MARKINGS } from '../constants.js';

function execute(text) {
  const cmd = text.trim().toLowerCase();
  if (!cmd) return null;

  // === FORMATION ===
  for (const f of Object.keys(FORMATIONS)) {
    if (cmd.includes(f)) return doFormation('home', f);
  }

  // === EVENTS ===
  const eventPatterns = [
    { type: 'GOAL',        keys: ['gol ', 'goal ', 'marcou', 'golaço', 'golaco', 'marcação'] },
    { type: 'YELLOW_CARD', keys: ['cartão amarelo', 'cartao amarelo', 'amarelo pra', 'amarelo no'] },
    { type: 'RED_CARD',    keys: ['cartão vermelho', 'cartao vermelho', 'vermelho pra', 'expulsão', 'expulsao'] },
    { type: 'FOUL',        keys: ['falta cometida', 'falta em'] },
    { type: 'SHOT',        keys: ['finalização', 'finalizacao', 'chute a gol'] },
    { type: 'CORNER',      keys: ['escanteio pra', 'escanteio'] },
    { type: 'PENALTY',     keys: ['pênalti pra', 'penalti pra', 'penalty'] },
    { type: 'OFFSIDE',     keys: ['impedimento'] },
    { type: 'SAVE',        keys: ['defesa do', 'goleiro defendeu'] },
    { type: 'WOODWORK',    keys: ['bateu na trave', 'na trave', 'no poste'] },
    { type: 'INJURY',      keys: ['contusão', 'contusao', 'lesão', 'lesao', 'machucou'] },
  ];

  for (const { type, keys } of eventPatterns) {
    for (const k of keys) {
      if (cmd.includes(k)) return resolveEvent(type, cmd);
    }
  }

  // === SUBSTITUTION ===
  if (cmd.includes('substituição') || cmd.includes('substituicao') || cmd.includes('entra') || cmd.includes('sai ')) {
    return resolveSubstitution(cmd);
  }

  // === TACTICAL ===
  if (cmd.includes('press') && cmd.includes('alto')) return doInstruction('pressing');
  for (const [key] of Object.entries(INSTRUCTIONS)) {
    if (cmd.includes(key.replace(/-/g, ' '))) return doInstruction(key);
  }

  // === MARKING ===
  if (cmd.includes('zonal'))    return doMarking('zonal');
  if (cmd.includes('homem') || cmd.includes('individual')) return doMarking('homem');
  if (cmd.includes('mista'))    return doMarking('mista');

  // === PERIOD CONTROL ===
  if (cmd.includes('iniciar') || cmd.includes('começar') || cmd.includes('comecar') || cmd === 'play') {
    Clock.togglePause(); return { ok: true, msg: '⏯ Play/Pause', type: 'info' };
  }
  if (cmd.includes('pausar') || cmd.includes('parar') || cmd === 'pause') {
    if (!state.get().match.isPaused) Clock.togglePause();
    return { ok: true, msg: '⏸ Pausado', type: 'info' };
  }
  if (cmd.includes('próximo') || cmd.includes('proximo') || cmd.includes('avançar')) {
    Clock.advancePeriod(); return { ok: true, msg: '⏩ Avançado', type: 'info' };
  }
  if (cmd.includes('intervalo')) { Clock.advancePeriod('INTERVAL'); return { ok: true, msg: '⏸ Intervalo', type: 'info' }; }
  if (cmd.includes('encerrar') || cmd.includes('finalizar')) { Clock.advancePeriod('FINISHED'); return { ok: true, msg: '🏁 Encerrado', type: 'info' }; }
  if (cmd.includes('pênaltis') || cmd.includes('penaltis') || cmd.includes('disputa')) { Clock.advancePeriod('PENALTIES'); return { ok: true, msg: '🥅 Pênaltis', type: 'info' }; }

  // === UTILITY ===
  if (cmd.includes('reset') || cmd.includes('reiniciar')) { state.reset(); return { ok: true, msg: '🗑 Resetado', type: 'warning' }; }
  if (cmd.includes('desfazer') || cmd.includes('undo')) {
    if (state.undo()) return { ok: true, msg: '↩ Desfeito', type: 'info' };
    return { ok: false, msg: 'Nada para desfazer', type: 'warning' };
  }

  // === PLAYER MOVEMENT ===
  const playerNum = parseInt(cmd.match(/\b(\d{1,2})\b/)?.[1]);
  if (playerNum >= 1 && playerNum <= 11) {
    const teamId = cmd.includes('visitante') || cmd.includes('fora') ? 'away' : 'home';
    const teamKey = teamId === 'home' ? 'homeTeam' : 'awayTeam';
    const player = state.get()[teamKey].players.find(p => p.number === playerNum);
    if (player) {
      if (cmd.includes('avançar') || cmd.includes('subir'))  { Engine.movePlayer(teamId, player.id, 0, -8); return { ok: true, msg: `${player.name} avançou`, type: 'success' }; }
      if (cmd.includes('recuar') || cmd.includes('descer'))  { Engine.movePlayer(teamId, player.id, 0, 8);  return { ok: true, msg: `${player.name} recuou`, type: 'success' }; }
      if (cmd.includes('direita')) { Engine.movePlayer(teamId, player.id, 10, 0); return { ok: true, msg: `${player.name} → direita`, type: 'success' }; }
      if (cmd.includes('esquerda')) { Engine.movePlayer(teamId, player.id, -10, 0); return { ok: true, msg: `${player.name} → esquerda`, type: 'success' }; }
      return { ok: true, msg: `Jogador #${playerNum} ${player.name}`, type: 'info' };
    }
  }

  return { ok: false, msg: `Comando não reconhecido: "${text}"`, type: 'error' };
}

// --- Helpers ---

function resolveTeam(cmd) {
  const s = state.get();
  if (cmd.includes('visitante') || cmd.includes('fora') ||
      cmd.includes(s.awayTeam.short.toLowerCase()) || cmd.includes(s.awayTeam.name.toLowerCase())) return 'away';
  return 'home';
}

function resolveEvent(type, cmd) {
  const teamId = resolveTeam(cmd);
  const teamKey = teamId === 'home' ? 'homeTeam' : 'awayTeam';
  const playerNum = parseInt(cmd.match(/\b(\d{1,2})\b/)?.[1]);
  const player = playerNum ? state.get()[teamKey].players.find(p => p.number === playerNum) : null;

  if (type === 'GOAL')        return Engine.goal(teamId, player?.id);
  if (type === 'YELLOW_CARD') return Engine.yellowCard(teamId, player?.id);
  if (type === 'RED_CARD')    return Engine.redCard(teamId, player?.id);
  return Engine.simpleEvent(type, teamId, player?.id);
}

function resolveSubstitution(cmd) {
  const teamId = resolveTeam(cmd);
  const teamKey = teamId === 'home' ? 'homeTeam' : 'awayTeam';
  const nums = [...cmd.matchAll(/\b(\d{1,2})\b/g)].map(m => parseInt(m[1])).filter(n => n >= 1 && n <= 22);
  if (nums.length >= 2) {
    const out = state.get()[teamKey].players.find(p => p.number === nums[0]);
    const inn = state.get()[teamKey].players.find(p => p.number === nums[1]);
    if (out && inn) return Engine.substitution(teamId, out.id, inn.id);
  }
  return { ok: false, msg: 'Use: "entra 12 sai 7"', type: 'warning' };
}

function doFormation(teamId, formation) {
  const key = teamId === 'home' ? 'homeTeam' : 'awayTeam';
  const positions = FORMATIONS[formation].positions;
  state.set(prev => ({
    [key]: {
      ...prev[key],
      formation,
      players: prev[key].players.map((p, i) => i < positions.length ? { ...p, x: positions[i].x, y: positions[i].y } : p)
    }
  }));
  return { ok: true, msg: `📐 ${formation} — ${FORMATIONS[formation].desc}`, type: 'success' };
}

function doInstruction(instrKey) {
  const instr = INSTRUCTIONS[instrKey];
  state.set(prev => ({ tactic: { ...prev.tactic, instruction: instrKey, pressing: instr.pressing } }));
  return { ok: true, msg: `${instr.label} — ${instr.desc}`, type: 'success' };
}

function doMarking(type) {
  state.set(prev => ({ tactic: { ...prev.tactic, marking: type } }));
  return { ok: true, msg: `🛡️ Marcação ${type}: ${MARKINGS[type]}`, type: 'success' };
}

export default { execute };
