// js/components/modals.js - v4.5.11 CONSOLIDATED
// Componente de Modais - Narrador Pro (v4.5.11)
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
    const home = state.homeTeam;
    const away = state.awayTeam;

    const content = `
      <div class="flex flex-col gap-6">
        <!-- IMPORTAÇÃO IA -->
        <button onclick="document.getElementById('img_sumula').click()" class="w-full p-4 bg-slate-800/50 border border-white/5 rounded-2xl flex items-center justify-center gap-3 hover:bg-slate-800 transition-all group">
          <span class="text-xl group-hover:scale-110 transition-transform">📄</span> 
          <span class="text-xs font-black uppercase tracking-widest text-slate-300">Importar Súmula (IA Gemini)</span>
        </button>
        <input type="file" id="img_sumula" hidden accept="image/*" onchange="window.handleImageUpload(event, 'players')">

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- TIME CASA -->
          <div class="space-y-4 p-4 bg-slate-800/30 rounded-3xl border border-white/5">
            <h3 class="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em] mb-2 px-2">Mandante</h3>
            <div class="space-y-1">
              <label class="text-[9px] font-bold text-slate-500 uppercase ml-2">Nome</label>
              <input type="text" id="home-team-name" value="${home.name}" class="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-sm text-white focus:border-blue-500 outline-none transition-all">
            </div>
            
            <div class="flex gap-2 mt-2">
                <div class="flex-1">
                    <label class="text-[10px] text-slate-400 font-bold ml-2">SIGLA (3 Letras)</label>
                    <input type="text" id="home-team-short" maxlength="3" value="${home.shortName || 'CAS'}" class="w-full bg-slate-950 border border-white/10 text-white p-2 rounded uppercase font-black text-center focus:border-blue-500 outline-none">
                </div>
                <div class="w-16">
                    <label class="text-[10px] text-slate-400 font-bold">COR</label>
                    <input type="color" id="home-team-color" value="${home.color || '#3b82f6'}" class="w-full h-9 bg-slate-950 border border-white/10 rounded cursor-pointer p-0.5">
                </div>
            </div>
          </div>

          <!-- TIME VISITANTE -->
          <div class="space-y-4 p-4 bg-slate-800/30 rounded-3xl border border-white/5">
            <h3 class="text-[10px] font-black text-red-500 uppercase tracking-[0.2em] mb-2 px-2">Visitante</h3>
            <div class="space-y-1">
              <label class="text-[9px] font-bold text-slate-500 uppercase ml-2">Nome</label>
              <input type="text" id="away-team-name" value="${away.name}" class="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-sm text-white focus:border-red-500 outline-none transition-all">
            </div>
            
            <div class="flex gap-2 mt-2">
                <div class="flex-1">
                    <label class="text-[10px] text-slate-400 font-bold ml-2">SIGLA (3 Letras)</label>
                    <input type="text" id="away-team-short" maxlength="3" value="${away.shortName || 'VIS'}" class="w-full bg-slate-950 border border-white/10 text-white p-2 rounded uppercase font-black text-center focus:border-red-500 outline-none">
                </div>
                <div class="w-16">
                    <label class="text-[10px] text-slate-400 font-bold">COR</label>
                    <input type="color" id="away-team-color" value="${away.color || '#ef4444'}" class="w-full h-9 bg-slate-950 border border-white/10 rounded cursor-pointer p-0.5">
                </div>
            </div>
          </div>
        </div>

        <button onclick="window.saveSumulaSelf()" class="w-full p-5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-xl shadow-blue-900/40 rounded-2xl text-xs font-black uppercase tracking-widest text-white transition-all active:scale-[0.98]">
          💾 SALVAR DADOS DA PARTIDA
        </button>
      </div>
    `;

    window.saveSumulaSelf = () => {
      // 1. Captura os valores do formulário duplo
      const hName = document.getElementById('home-team-name')?.value || home.name;
      const hShort = document.getElementById('home-team-short')?.value.toUpperCase() || 'CAS';
      const hColor = document.getElementById('home-team-color')?.value || '#3b82f6';
      
      const aName = document.getElementById('away-team-name')?.value || away.name;
      const aShort = document.getElementById('away-team-short')?.value.toUpperCase() || 'VIS';
      const aColor = document.getElementById('away-team-color')?.value || '#ef4444';

      // 2. Atualiza o Estado Global (matchState)
      matchState.setState(prev => ({
        ...prev,
        homeTeam: { ...prev.homeTeam, name: hName, shortName: hShort, color: hColor },
        awayTeam: { ...prev.awayTeam, name: aName, shortName: aShort, color: aColor }
      }));

      // 3. Injeção Bruta no DOM (Atualização Visual Imediata)
      try {
        // Siglas no Header
        const homeTitle = document.querySelector('[data-team="home"]');
        const awayTitle = document.querySelector('[data-team="away"]');
        
        if (homeTitle) {
          homeTitle.innerHTML = `<svg class="w-2 h-2 md:w-3 md:h-3 opacity-100 md:opacity-0 md:group-hover:opacity-100 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg> ${hShort}`;
        }
        if (awayTitle) {
          awayTitle.innerHTML = `${aShort} <svg class="w-2 h-2 md:w-3 md:h-3 opacity-100 md:opacity-0 md:group-hover:opacity-100 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>`;
        }

        // Fundos dos Placares
        const hBox = document.getElementById('home-score-box');
        const aBox = document.getElementById('away-score-box');
        if (hBox) hBox.style.backgroundColor = hColor;
        if (aBox) aBox.style.backgroundColor = aColor;

        // Variáveis CSS Globais
        document.documentElement.style.setProperty('--home-color', hColor);
        document.documentElement.style.setProperty('--away-color', aColor);
      } catch (e) {
        console.warn('DOM Sync Partial Failure:', e);
      }
      
      this.close();
    };

    this.open(content, 'Ajustes da Súmula');
  }

  // Fallback para edição individual via clique no nome
  showEditTeam(team, teamId) {
    this.showSumula(); // Redireciona para o modal unificado conforme nova lógica de UX
  }
}

export const modalManager = new ModalManager();
