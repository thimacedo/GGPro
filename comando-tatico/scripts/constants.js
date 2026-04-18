/**
 * constants.js — Formações, Eventos, Instruções, Marcações, Períodos
 */

export const FORMATIONS = {
  '4-4-2': {
    desc: 'Clássica — dois atacantes fixos, meio equilibrado',
    positions: [
      { x: 50, y: 88 }, // GK
      { x: 15, y: 72 }, { x: 37, y: 75 }, { x: 63, y: 75 }, { x: 85, y: 72 }, // DEF
      { x: 25, y: 52 }, { x: 42, y: 50 }, { x: 58, y: 50 }, { x: 75, y: 52 }, // MID
      { x: 38, y: 25 }, { x: 62, y: 25 } // ATK
    ]
  },
  '4-3-3': {
    desc: 'Ofensiva — trio de ataque, laterais projetados',
    positions: [
      { x: 50, y: 88 },
      { x: 12, y: 72 }, { x: 37, y: 75 }, { x: 63, y: 75 }, { x: 88, y: 72 },
      { x: 50, y: 58 }, { x: 35, y: 48 }, { x: 65, y: 48 },
      { x: 15, y: 25 }, { x: 50, y: 22 }, { x: 85, y: 25 }
    ]
  },
  '4-2-3-1': {
    desc: 'Moderna — dupla de volantes, meia ofensivo livre',
    positions: [
      { x: 50, y: 88 },
      { x: 12, y: 72 }, { x: 37, y: 75 }, { x: 63, y: 75 }, { x: 88, y: 72 },
      { x: 40, y: 58 }, { x: 60, y: 58 },
      { x: 25, y: 42 }, { x: 50, y: 40 }, { x: 75, y: 42 },
      { x: 50, y: 22 }
    ]
  },
  '3-5-2': {
    desc: 'Alas — três zagueiros com alas abertos',
    positions: [
      { x: 50, y: 88 },
      { x: 25, y: 76 }, { x: 50, y: 78 }, { x: 75, y: 76 },
      { x: 10, y: 48 }, { x: 35, y: 55 }, { x: 50, y: 48 }, { x: 65, y: 55 }, { x: 90, y: 48 },
      { x: 40, y: 25 }, { x: 60, y: 25 }
    ]
  },
  '3-4-3': {
    desc: 'Agressiva — trio de ataque com bloco médio',
    positions: [
      { x: 50, y: 88 },
      { x: 25, y: 76 }, { x: 50, y: 78 }, { x: 75, y: 76 },
      { x: 15, y: 55 }, { x: 40, y: 55 }, { x: 60, y: 55 }, { x: 85, y: 55 },
      { x: 18, y: 25 }, { x: 50, y: 22 }, { x: 82, y: 25 }
    ]
  },
  '5-3-2': {
    desc: 'Defensiva — cinco na defesa, três no meio compacto',
    positions: [
      { x: 50, y: 88 },
      { x: 10, y: 68 }, { x: 32, y: 74 }, { x: 50, y: 76 }, { x: 68, y: 74 }, { x: 90, y: 68 },
      { x: 35, y: 48 }, { x: 50, y: 46 }, { x: 65, y: 48 },
      { x: 40, y: 24 }, { x: 60, y: 24 }
    ]
  },
  '4-1-4-1': {
    desc: 'Trinco — volante solo, quatro meias atrás do atacante',
    positions: [
      { x: 50, y: 88 },
      { x: 12, y: 72 }, { x: 37, y: 75 }, { x: 63, y: 75 }, { x: 88, y: 72 },
      { x: 50, y: 60 },
      { x: 25, y: 45 }, { x: 50, y: 42 }, { x: 75, y: 45 },
      { x: 50, y: 20 }, { x: 15, y: 32 }
    ]
  },
  '4-5-1': {
    desc: 'Compacta — domina o meio com 5 jogadores',
    positions: [
      { x: 50, y: 88 },
      { x: 12, y: 72 }, { x: 37, y: 75 }, { x: 63, y: 75 }, { x: 88, y: 72 },
      { x: 50, y: 56 }, { x: 28, y: 45 }, { x: 50, y: 42 }, { x: 72, y: 45 },
      { x: 38, y: 30 }, { x: 50, y: 20 }
    ]
  }
};

export const INSTRUCTIONS = {
  'pressing':       { label: '🔥 Pressing Alto',    desc: 'Recuperação rápida após perda, linha alta',       pressing: 90 },
  'contra-ataque':  { label: '⚡ Contra-Ataque',     desc: 'Absorve pressão, transição rápida ofensiva',     pressing: 40 },
  'posse':          { label: '🔄 Posse de Bola',    desc: 'Toques curtos, paciência, circulação',           pressing: 55 },
  'defesa-baixa':   { label: '🛡️ Defesa Baixa',     desc: 'Bloco baixo perto do gol, espera o erro',        pressing: 20 },
  'bola-longa':     { label: '🎯 Bola Longa',       desc: 'Saídas rápidas dos defensores para o ataque',     pressing: 45 },
  'trocas-lado':    { label: '↔️ Trocas de Lado',    desc: 'Explorar lado fraco do adversário com inversões', pressing: 50 },
  'insinuacao':     { label: '🪝 Insinuação',        desc: 'Infiltração entre linhas adversárias sem bola',   pressing: 60 },
  'miolo':          { label: '🎯 Explorar Miolo',    desc: 'Penetração central entre zagueiros e volantes',  pressing: 55 }
};

export const MARKINGS = {
  'zonal': 'Cada jogador cobre sua zona de responsabilidade',
  'homem': 'Cada defensor marca um adversário específico',
  'mista':  'Zonal no meio-campo, por homem na área'
};

export const EVENT_TYPES = {
  GOAL:            { icon: '⚽', label: 'GOL',              color: '#22c55e' },
  YELLOW_CARD:     { icon: '🟨', label: 'AMARELO',          color: '#eab308' },
  RED_CARD:        { icon: '🟥', label: 'VERMELHO',         color: '#ef4444' },
  SUBSTITUTION:    { icon: '🔄', label: 'SUBSTITUIÇÃO',     color: '#3b82f6' },
  FOUL:            { icon: '🛑', label: 'FALTA',            color: '#f97316' },
  SHOT:            { icon: '🎯', label: 'FINALIZAÇÃO',      color: '#a855f7' },
  CORNER:          { icon: '🚩', label: 'ESCANTEIO',        color: '#06b6d4' },
  PENALTY:         { icon: '💥', label: 'PÊNALTI',          color: '#f59e0b' },
  OFFSIDE:         { icon: '📏', label: 'IMPEDIMENTO',      color: '#64748b' },
  SAVE:            { icon: '🧤', label: 'DEFESA',           color: '#14b8a6' },
  WOODWORK:        { icon: '🪵', label: 'TRAVE',            color: '#78716c' },
  VAR:             { icon: '📺', label: 'VAR',              color: '#f59e0b' },
  INJURY:          { icon: '🏥', label: 'CONTUSÃO',         color: '#ec4899' },
  PERIOD_START:    { icon: '▶️', label: 'INÍCIO',           color: '#22c55e' },
  PERIOD_END:      { icon: '⏹️', label: 'FIM',              color: '#64748b' },
  PENALTY_GOAL:    { icon: '🥅', label: 'PÊNALTI GOL',      color: '#22c55e' },
  PENALTY_MISS:    { icon: '❌', label: 'PÊNALTI ERROU',    color: '#ef4444' },
  CONCUSSION_SUB:  { icon: '🤕', label: 'SUBST. CONCUSSÃO', color: '#ec4899' },
  GENERIC:         { icon: '•',  label: 'EVENTO',           color: '#64748b' }
};

export const PERIODS = ['PRE', '1T', 'INTERVAL', '2T', '1ET', '2ET', 'PENALTIES', 'FINISHED'];

export const PERIOD_NAMES = {
  PRE:        'Pré-Jogo',
  1T:         '1º Tempo',
  INTERVAL:   'Intervalo',
  2T:         '2º Tempo',
  1ET:        'Prorrogação 1',
  2ET:        'Prorrogação 2',
  PENALTIES:  'Pênaltis',
  FINISHED:   'Encerrado'
};

export const QUICK_EVENTS = [
  'GOAL', 'YELLOW_CARD', 'RED_CARD', 'FOUL',
  'SHOT', 'CORNER', 'PENALTY', 'OFFSIDE', 'SAVE', 'WOODWORK'
];
