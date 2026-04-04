// js/components/modals.js
// Componente de Modais - Narrador Pro (v3.1)
// Monitoramento Ativo com AbortController e Coleta de Lixo Global

import matchState from '../state.js';
import { processImageForPlayers, parseRegulationDocument } from '../services/gemini.js';

class ModalManager {
  constructor() {
    this.activeModal = null;
    this.controller = null;
    this.init();
  }

  init() {
    // Listener global para fechar no ESC
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.close();
    });
  }

  /**
   * 🗑️ COLETA DE LIXO GLOBAL (GC)
   * Remove referências temporárias no objeto window injetadas para eventos inline.
   * Evita vazamentos de memória e colisões de eventos entre modais.
   */
  cleanupGlobalFunctions() {
    const registry = [
      'handleAction', 
      'saveTeamSelf', 
      'confirmSub', 
      'concussionSub', 
      'executeConcussion', 
      'setPos', 
      'savePlayerSelf', 
      'saveSumulaSelf',
      'currentImportTeamId'
    ];
    
    registry.forEach(fn => {
      if (window[fn]) {
        try {
          delete window[fn];
        } catch (e) {
          window[fn] = undefined;
        }
      }
    });
  }

  open(content, title = '') {
    // 1. Aborta qualquer listener do modal anterior
    this.close();

    // 2. Novo ciclo de vida com AbortController
    this.controller = new AbortController();
    const { signal } = this.controller;

    const overlay = document.createElement('div');
    overlay.id = 'modalOverlay';
    overlay.className = 'modal-overlay animate-fade-in fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center';
    
    overlay.innerHTML = `
      <div class="modal-content relative bg-slate-900 border border-white/10 rounded-[2.5rem] w-full max-w-lg shadow-2xl p-6 ring-1 ring-white/10 animate-slide-up">
        <div class="modal-header border-b border-white/5 pb-4 mb-4 flex justify-between items-center">
          <h2 class="text-xs font-black uppercase tracking-[0.2em] text-slate-400">${title}</h2>
          <button id="closeModalBtn" class="p-2 text-slate-500 hover:text-white transition-colors">✕</button>
        </div>
        <div class="modal-body custom-scrollbar max-h-[70vh] overflow-y-auto">
          ${content}
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    this.activeModal = overlay;

    // Listeners gerenciados pelo AbortController
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) this.close();
    }, { signal });
    
    overlay.querySelector('#closeModalBtn').addEventListener('click', () => this.close(), { signal });
  }

  /**
   * 🛑 ENCERRAMENTO DO CICLO DE VIDA
   * Fecha o modal, anula eventos via AbortController e limpa funções globais.
   */
  close() {
    if (this.controller) {
      this.controller.abort();
      this.controller = null;
    }

    if (this.activeModal) {
      const modal = this.activeModal;
      this.activeModal = null;
      
      this.cleanupGlobalFunctions();
      
      modal.classList.add('animate-fade-out');
      setTimeout(() => {
        if (modal.parentNode) modal.remove();
      }, 200);
    }
  }

  showPlayerActions(player, team, teamId) {
    const content = `
      <div class="flex flex-col gap-6">
        <div class="flex items-center gap-4">
          <div class="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black text-white" style="background-color: ${team.color}">
            ${player.number}
          </div>
          <div>
            <h4 class="text-xl font-black text-white">${player.name}</h4>
            <p class="text-[10px] text-slate-500 font-black uppercase tracking-widest">${team.name}</p>
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <button class="p-4 bg-slate-800 rounded-2xl text-xs font-bold text-white hover:bg-emerald-600 transition-all" onclick="handleAction('GOAL')">⚽ GOL</button>
          <button class="p-4 bg-slate-800 rounded-2xl text-xs font-bold text-white hover:bg-amber-500 transition-all" onclick="handleAction('YELLOW_CARD')">🟨 AMARELO</button>
        </div>
      </div>
    `;

    // Injeção de lógica global temporária
    window.handleAction = (action) => {
      matchState.addEvent({
        type: action,
        teamId,
        playerId: player.id,
        description: `${action}: ${player.name}`
      });
      this.close();
    };

    this.open(content, 'Ações do Jogador');
  }

  showSumula() {
    const state = matchState.getState();
    const content = `
      <div class="flex flex-col gap-4">
        <button onclick="document.getElementById('img_sumula').click()" class="w-full p-4 bg-slate-800 rounded-2xl flex items-center gap-3">
          <span>📄</span> <span class="text-xs font-bold uppercase">Importar Súmula (IA)</span>
        </button>
        <input type="file" id="img_sumula" hidden accept="image/*" onchange="window.handleImageUpload(event, 'players')">
        <div class="grid grid-cols-2 gap-4">
          <button onclick="modalManager.showEditTeam(matchState.getState().homeTeam, 'home')" class="p-4 bg-slate-800 rounded-2xl">
            <span class="text-xs font-bold text-white">${state.homeTeam.shortName}</span>
          </button>
          <button onclick="modalManager.showEditTeam(matchState.getState().awayTeam, 'away')" class="p-4 bg-slate-800 rounded-2xl">
            <span class="text-xs font-bold text-white">${state.awayTeam.shortName}</span>
          </button>
        </div>
      </div>
    `;
    this.open(content, 'Ajustes de Súmula');
  }

  showEditTeam(team, teamId) {
    const isHome = teamId === 'home';
    const content = `
      <div class="flex flex-col gap-4">
        <div class="space-y-1">
          <label class="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Nome da Equipe</label>
          <input type="text" id="edit-team-name" value="${team.name}" class="w-full bg-slate-800 border border-white/5 rounded-xl p-3 text-sm text-white focus:ring-2 focus:ring-blue-500 transition-all outline-none">
        </div>
        
        <div class="mt-4 flex gap-4">
            <div class="flex-1">
                <label class="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-1 block ml-2">Sigla (Max 3)</label>
                <input type="text" id="edit-team-shortname" maxlength="3" value="${team.shortName || (isHome ? 'CAS' : 'VIS')}" class="w-full bg-slate-900 border border-white/10 text-white p-3 rounded-xl uppercase font-black focus:border-blue-500 outline-none">
            </div>
            <div class="w-24">
                <label class="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-1 block ml-2">Cor</label>
                <input type="color" id="edit-team-color" value="${team.color || (isHome ? '#3b82f6' : '#ef4444')}" class="w-full h-12 bg-slate-900 border border-white/10 p-1 rounded-xl cursor-pointer">
            </div>
        </div>

        <button class="w-full p-4 mt-2 bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-900/20 rounded-2xl text-xs font-black uppercase text-white transition-all active:scale-95" onclick="saveTeamSelf()">
          💾 SALVAR ALTERAÇÕES
        </button>
      </div>
    `;

    window.saveTeamSelf = () => {
      const newName = document.getElementById('edit-team-name').value;
      const newShortName = document.getElementById('edit-team-shortname').value.toUpperCase().slice(0, 3) || (isHome ? 'CAS' : 'VIS');
      const newColor = document.getElementById('edit-team-color').value;

      // 1. Sincroniza Estado Global
      matchState.setState(prev => {
        const key = isHome ? 'homeTeam' : 'awayTeam';
        return { 
          ...prev, 
          [key]: { 
            ...prev[key], 
            name: newName,
            shortName: newShortName,
            color: newColor
          } 
        };
      });

      // 2. Forçar Mutação do DOM (Brute Force Sync)
      if (isHome) {
          // Atualiza Nome/Sigla no Header
          const homeTitle = document.querySelector('[data-team="home"]');
          if (homeTitle) {
              homeTitle.innerHTML = `<svg class="w-2 h-2 md:w-3 md:h-3 opacity-100 md:opacity-0 md:group-hover:opacity-100 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg> ${newShortName}`;
          }
          // Atualiza Cor de Fundo no Placar
          const homeScoreDiv = document.getElementById('home-score-display');
          if (homeScoreDiv) homeScoreDiv.style.backgroundColor = newColor;
      } else {
          // Atualiza Nome/Sigla no Header
          const awayTitle = document.querySelector('[data-team="away"]');
          if (awayTitle) {
              awayTitle.innerHTML = `${newShortName} <svg class="w-2 h-2 md:w-3 md:h-3 opacity-100 md:opacity-0 md:group-hover:opacity-100 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>`;
          }
          // Atualiza Cor de Fundo no Placar
          const awayScoreDiv = document.getElementById('away-score-display');
          if (awayScoreDiv) awayScoreDiv.style.backgroundColor = newColor;
      }
      
      this.close();
    };
    this.open(content, `Editar ${isHome ? 'Mandante' : 'Visitante'}`);
  }
}

export const modalManager = new ModalManager();
