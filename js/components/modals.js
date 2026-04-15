// js/components/modals.js - v5.0 EXPANDED
// Modais: Player Actions, Sumula, PreMatch, Penalty, Coach, PlayerEdit, ImportList, EndGame, Report

import matchState from '../state.js';
import { processImageForPlayers, parseRegulationDocument } from '../services/gemini.js';

class ModalManager {
  constructor() {
    this.activeModal = null;
    this.controller = null;
    this.init();
  }

  init() {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.close();
    });
  }

  cleanupGlobalFunctions() {
    const registry = [
      'handleAction', 'saveTeamSelf', 'confirmSub', 'confirmConcussion', 'concussionSub',
      'executeConcussion', 'setPos', 'savePlayerSelf', 'saveSumulaSelf',
      'currentImportTeamId', 'savePreMatchSelf', 'saveCoachSelf',
      'saveEditPlayerSelf', 'importListSelf', 'executeEndGame', 'copyReportSelf',
      'handleImageUploadTeam', 'importTextListTeam', 'saveAiConfigSelf',
      'executeResetSelf', 'copyReportSelf_report', 'downloadReportSelf_report',
      'registerPenaltyResult', 'executeSub', 'modalActionSelf'
    ];
    registry.forEach(fn => {
      if (window[fn]) { delete window[fn]; }
    });
  }

  open(content, title = '') {
    this.close();
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

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) this.close();
    }, { signal });
    overlay.querySelector('#closeModalBtn').addEventListener('click', () => this.close(), { signal });
  }

  close() {
    if (this.controller) { this.controller.abort(); this.controller = null; }
    if (this.activeModal) {
      const modal = this.activeModal;
      this.activeModal = null;
      this.cleanupGlobalFunctions();
      modal.classList.add('animate-fade-out');
      setTimeout(() => { if (modal.parentNode) modal.remove(); }, 200);
    }
  }

  // ============================================================
  // PLAYER ACTIONS
  // ============================================================
  showPlayerActions(player, team, teamId) {
    const state = matchState.getState();
    const teamPlayers = state[teamId === 'home' ? 'homeTeam' : 'awayTeam'].players || [];
    const teammates = teamPlayers.filter(p => p.id !== player.id);
    const oppKey = teamId === 'home' ? 'away' : 'home';
    const opponents = state[oppKey].players || [];
    const isGoalkeeper = player.position === 'GK';

    let teammatesSelect = teammates.map(p =>
      `<option value="${p.id}">#${p.number} ${p.name} (${p.position})</option>`
    ).join('');
    let opponentsSelect = teammates // sub normal usa do mesmo time
      .map(p => `<option value="${p.id}">#${p.number} ${p.name} (${p.position})</option>`).join('');

    // Para substituição: quem entra (pode ser jogador não escalado)
    let benchPlayers = teamPlayers.filter(p => !p.isStarter && !p.hasLeftGame);
    let benchOptions = benchPlayers.map(p =>
      `<option value="${p.id}">#${p.number} ${p.name} (${p.position})</option>`
    ).join('');

    const content = `
      <div class="flex flex-col gap-4">
        <div class="flex items-center gap-4">
          <div class="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black text-white" style="background-color: ${team.color}">
            ${player.number}
          </div>
          <div>
            <h4 class="text-lg font-black text-white">${player.name}</h4>
            <p class="text-[10px] text-slate-500 font-black uppercase tracking-widest">${player.position} • ${team.name}</p>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <button onclick="window.modalActionSelf('GOAL')" class="p-4 bg-slate-800 rounded-2xl text-[11px] font-bold text-white hover:bg-emerald-600 transition-all">⚽ GOL</button>
          <button onclick="window.modalActionSelf('SHOT')" class="p-4 bg-slate-800 rounded-2xl text-[11px] font-bold text-white hover:bg-blue-600 transition-all">🎯 FINALIZAÇÃO</button>
          <button onclick="window.modalActionSelf('YELLOW_CARD')" class="p-4 bg-slate-800 rounded-2xl text-[11px] font-bold text-white hover:bg-amber-500 transition-all">🟨 AMARELO</button>
          <button onclick="window.modalActionSelf('FOUL')" class="p-4 bg-slate-800 rounded-2xl text-[11px] font-bold text-white hover:bg-red-600 transition-all">🛑 FALTA</button>
          <button onclick="window.modalActionSelf('CORNER')" class="p-4 bg-slate-800 rounded-2xl text-[11px] font-bold text-white hover:bg-cyan-600 transition-all">🚩 ESCANTEIO</button>
          <button onclick="window.modalActionSelf('OFFSIDE')" class="p-4 bg-slate-800 rounded-2xl text-[11px] font-bold text-white hover:bg-orange-500 transition-all">📏 IMPEDIMENTO</button>
          <button onclick="window.modalActionSelf('SAVE')" class="p-4 bg-slate-800 rounded-2xl text-[11px] font-bold text-white hover:bg-green-600 transition-all">🧤 DEFESA</button>
          <button onclick="window.modalActionSelf('INJURY')" class="p-4 bg-slate-800 rounded-2xl text-[11px] font-bold text-white hover:bg-pink-600 transition-all">🏥 CONTUSÃO</button>
          ${!isGoalkeeper ? `<button onclick="window.modalActionSelf('SET_GOALKEEPER')" class="p-4 bg-slate-800 rounded-2xl text-[11px] font-bold text-white hover:bg-teal-600 transition-all">🧤 NOV. GOLEIRO</button>` : ''}
        </div>

        <div class="h-px bg-white/5"></div>

        <div class="flex flex-col gap-2">
          <p class="text-[10px] font-black text-slate-500 uppercase tracking-widest">SUBSTITUIÇÃO</p>
          <select id="subInPlayer" class="w-full bg-slate-800 border border-white/10 rounded-xl p-3 text-xs text-white outline-none">
            <option value="">-- Quem ENTRA --</option>
            ${benchOptions || '<option value="__manual">+ Digitar nome (jogador novo)</option>'}
            ${benchOptions ? '<option value="__manual">+ Digitar nome (jogador novo)</option>' : ''}
          </select>
          <button onclick="window.executeSub('${teamId}', '${player.id}')" class="w-full p-4 bg-blue-600 hover:bg-blue-500 rounded-2xl text-[11px] font-black uppercase text-white transition-all">🔄 SUBSTITUIR</button>
        </div>
      </div>
    `;

    window.modalActionSelf = (action) => {
      matchState.addEvent({
        type: action,
        teamId,
        playerId: player.id,
        description: null // auto-generated
      });
      this.close();
    };

    window.executeSub = (tId, playerId) => {
      const sel = document.getElementById('subInPlayer');
      const inId = sel?.value;
      if (!inId) return;

      if (inId === '__manual') {
        // Criar jogador novo
        const name = prompt('Nome do jogador que entra:');
        if (!name) return;
        const number = parseInt(prompt('Número da camisa:')) || 0;
        matchState.addEvent({
          type: 'SUBSTITUTION',
          teamId: tId,
          playerId,
          isManual: true,
          newPlayerName: name,
          newPlayerNumber: number,
          newPlayerPosition: 'MF',
          description: null
        });
      } else {
        matchState.addEvent({
          type: 'SUBSTITUTION',
          teamId: tId,
          playerId: inId,
          relatedPlayerId: playerId,
          description: null
        });
      }
      this.close();
    };

    this.open(content, `Ações do Jogador`);
  }

  // ============================================================
  // EDIT PLAYER
  // ============================================================
  showEditPlayer(player, team, teamId) {
    const positions = ['GK', 'DEF', 'MF', 'FW'];
    const content = `
      <div class="flex flex-col gap-4">
        <div class="flex items-center gap-3">
          <div class="w-12 h-12 rounded-xl flex items-center justify-center text-lg font-black text-white" style="background-color: ${team.color}">${player.number}</div>
          <span class="text-sm font-black text-white">${player.name}</span>
        </div>
        <div class="space-y-3">
          <div>
            <label class="text-[10px] text-slate-400 font-bold">Nome</label>
            <input type="text" id="edit-player-name" value="${player.name}" class="w-full bg-slate-800 border border-white/10 rounded-xl p-3 text-sm text-white outline-none"/>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="text-[10px] text-slate-400 font-bold">Número</label>
              <input type="number" id="edit-player-number" value="${player.number}" class="w-full bg-slate-800 border border-white/10 rounded-xl p-3 text-sm text-white outline-none"/>
            </div>
            <div>
              <label class="text-[10px] text-slate-400 font-bold">Posição</label>
              <select id="edit-player-position" class="w-full bg-slate-800 border border-white/10 rounded-xl p-3 text-sm text-white outline-none">
                ${positions.map(p => `<option value="${p}" ${player.position === p ? 'selected' : ''}>${p}</option>`).join('')}
              </select>
            </div>
          </div>
          <div class="flex items-center gap-3">
            <input type="checkbox" id="edit-player-starter" ${player.isStarter ? 'checked' : ''} class="w-5 h-5 accent-blue-500"/>
            <label class="text-xs text-slate-300 font-bold">Titular</label>
          </div>
        </div>
        <button onclick="window.saveEditPlayerSelf('${teamId}', '${player.id}')" class="w-full p-4 bg-blue-600 hover:bg-blue-500 rounded-2xl text-[11px] font-black uppercase text-white transition-all">💾 SALVAR</button>
      </div>
    `;

    window.saveEditPlayerSelf = (tId, pId) => {
      const teamKey = tId === 'home' ? 'homeTeam' : 'awayTeam';
      const name = document.getElementById('edit-player-name')?.value || player.name;
      const number = parseInt(document.getElementById('edit-player-number')?.value) || player.number;
      const position = document.getElementById('edit-player-position')?.value || player.position;
      const isStarter = document.getElementById('edit-player-starter')?.checked || false;

      matchState.setState(prev => {
        const players = prev[teamKey].players.map(p =>
          p.id === pId ? { ...p, name, number, position, isStarter } : p
        );
        return { ...prev, [teamKey]: { ...prev[teamKey], players } };
      });
      this.close();
    };

    this.open(content, 'Editar Jogador');
  }

  // ============================================================
  // SÚMULA (Enhanced)
  // ============================================================
  showSumula() {
    const state = matchState.getState();
    const home = state.homeTeam;
    const away = state.awayTeam;
    const conflict = matchState.detectColorConflict();

    const content = `
      <div class="flex flex-col gap-4">
        <!-- IMPORT: Mandante -->
        <div class="p-3 bg-slate-800/30 rounded-2xl border border-white/5">
          <h4 class="text-[10px] font-black uppercase tracking-widest mb-2" style="color: ${home.color}">⬆ Importar ${home.name || 'Mandante'}</h4>
          <div class="grid grid-cols-2 gap-2">
            <button onclick="window.currentImportTeamId='home'; document.getElementById('img_home').click()" class="p-3 bg-slate-800 border border-white/5 rounded-xl text-center hover:bg-slate-700 transition-all">
              <span class="text-lg">📄</span><br/>
              <span class="text-[9px] font-black text-slate-300 uppercase">OCR Imagem</span>
            </button>
            <input type="file" id="img_home" hidden accept="image/*" onchange="window.handleImageUploadTeam(event, 'home')"/>
            <button onclick="window.currentImportTeamId='home'; document.getElementById('txt_home').click()" class="p-3 bg-slate-800 border border-white/5 rounded-xl text-center hover:bg-slate-700 transition-all">
              <span class="text-lg">📋</span><br/>
              <span class="text-[9px] font-black text-slate-300 uppercase">Texto/Lista</span>
            </button>
            <input type="file" id="txt_home" hidden accept=".txt,.csv,.text" onchange="window.importTextListTeam(event, 'home')"/>
          </div>
        </div>

        <!-- IMPORT: Visitante -->
        <div class="p-3 bg-slate-800/30 rounded-2xl border border-white/5">
          <h4 class="text-[10px] font-black uppercase tracking-widest mb-2" style="color: ${away.color}">⬆ Importar ${away.name || 'Visitante'}</h4>
          <div class="grid grid-cols-2 gap-2">
            <button onclick="window.currentImportTeamId='away'; document.getElementById('img_away').click()" class="p-3 bg-slate-800 border border-white/5 rounded-xl text-center hover:bg-slate-700 transition-all">
              <span class="text-lg">📄</span><br/>
              <span class="text-[9px] font-black text-slate-300 uppercase">OCR Imagem</span>
            </button>
            <input type="file" id="img_away" hidden accept="image/*" onchange="window.handleImageUploadTeam(event, 'away')"/>
            <button onclick="window.currentImportTeamId='away'; document.getElementById('txt_away').click()" class="p-3 bg-slate-800 border border-white/5 rounded-xl text-center hover:bg-slate-700 transition-all">
              <span class="text-lg">📋</span><br/>
              <span class="text-[9px] font-black text-slate-300 uppercase">Texto/Lista</span>
            </button>
            <input type="file" id="txt_away" hidden accept=".txt,.csv,.text" onchange="window.importTextListTeam(event, 'away')"/>
          </div>
        </div>

        <!-- Regras extraídas por IA -->
        ${state.extractedRules ? `
          <div class="p-3 bg-emerald-900/20 border border-emerald-500/30 rounded-xl space-y-1">
            <p class="text-[10px] font-black text-emerald-400 uppercase">📋 Regras Extraídas</p>
            <p class="text-xs text-slate-300">Tempo: ${state.extractedRules.halfDuration || '?'}min | Subst: ${state.extractedRules.maxSubstitutions || '?'}</p>
          </div>
        ` : `
          <div class="grid grid-cols-2 gap-2">
            <button onclick="document.getElementById('banner_img_sumula').click()" class="p-3 bg-slate-800/50 border border-white/5 rounded-xl text-center hover:bg-slate-800 transition-all">
              <span class="text-lg">🏷️</span><br/>
              <span class="text-[9px] font-black text-slate-300 uppercase">OCR Banner</span>
            </button>
            <input type="file" id="banner_img_sumula" hidden accept="image/*" onchange="window.handleBannerUpload(event)"/>
            <button onclick="document.getElementById('reg_file_sumula').click()" class="p-3 bg-slate-800/50 border border-white/5 rounded-xl text-center hover:bg-slate-800 transition-all">
              <span class="text-lg">📑</span><br/>
              <span class="text-[9px] font-black text-slate-300 uppercase">Regulamento</span>
            </button>
            <input type="file" id="reg_file_sumula" hidden accept="image/*,.pdf" onchange="window.handleRegulationUpload(event)"/>
          </div>
        `}

        ${conflict ? `<div class="p-3 bg-amber-900/20 border border-amber-500/30 rounded-xl text-xs text-amber-400 font-bold text-center">⚠️ Cores semelhantes detectadas!</div>` : ''}

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="space-y-3 p-4 bg-slate-800/30 rounded-2xl border border-white/5">
            <h3 class="text-[10px] font-black text-blue-500 uppercase tracking-widest">Mandante</h3>
            <input type="text" id="home-team-name" value="${home.name}" placeholder="Nome" class="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-sm text-white outline-none"/>
            <div class="flex gap-2">
              <input type="text" id="home-team-short" maxlength="3" value="${home.shortName || ''}" placeholder="SIG" class="flex-1 bg-slate-950 border border-white/10 rounded-xl p-2 text-sm text-white font-black text-center outline-none"/>
              <input type="color" id="home-team-color" value="${home.color || '#3b82f6'}" class="w-12 h-10 bg-slate-950 border border-white/10 rounded-xl cursor-pointer"/>
            </div>
            <div class="mt-1">
              <label class="text-[9px] text-slate-500 font-bold uppercase">Técnico</label>
              <input type="text" id="home-coach" value="${state.homeCoach || ''}" placeholder="Nome do técnico" class="w-full bg-slate-900 border border-white/10 rounded-xl p-2 text-xs text-white outline-none"/>
            </div>
          </div>
          <div class="space-y-3 p-4 bg-slate-800/30 rounded-2xl border border-white/5">
            <h3 class="text-[10px] font-black text-red-500 uppercase tracking-widest">Visitante</h3>
            <input type="text" id="away-team-name" value="${away.name}" placeholder="Nome" class="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-sm text-white outline-none"/>
            <div class="flex gap-2">
              <input type="text" id="away-team-short" maxlength="3" value="${away.shortName || ''}" placeholder="SIG" class="flex-1 bg-slate-950 border border-white/10 rounded-xl p-2 text-sm text-white font-black text-center outline-none"/>
              <input type="color" id="away-team-color" value="${away.color || '#ef4444'}" class="w-12 h-10 bg-slate-950 border border-white/10 rounded-xl cursor-pointer"/>
            </div>
            <div class="mt-1">
              <label class="text-[9px] text-slate-500 font-bold uppercase">Técnico</label>
              <input type="text" id="away-coach" value="${state.awayCoach || ''}" placeholder="Nome do técnico" class="w-full bg-slate-900 border border-white/10 rounded-xl p-2 text-xs text-white outline-none"/>
            </div>
          </div>
        </div>

        <div>
          <label class="text-[10px] text-slate-400 font-bold uppercase ml-1">Formação Mandante</label>
          <select id="home-formation" class="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-sm text-white outline-none">
            ${Object.keys(window.FORMATIONS || {'4-4-2':1,'4-3-3':1,'5-3-2':1,'3-4-3':1}).map(f =>
              `<option value="${f}" ${home.formation === f ? 'selected' : ''}>${f}</option>`
            ).join('')}
          </select>
        </div>
        <div>
          <label class="text-[10px] text-slate-400 font-bold uppercase ml-1">Formação Visitante</label>
          <select id="away-formation" class="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-sm text-white outline-none">
            ${Object.keys(window.FORMATIONS || {'4-4-2':1,'4-3-3':1,'5-3-2':1,'3-4-3':1}).map(f =>
              `<option value="${f}" ${away.formation === f ? 'selected' : ''}>${f}</option>`
            ).join('')}
          </select>
        </div>

        <button onclick="window.saveSumulaSelf()" class="w-full p-4 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl text-[11px] font-black uppercase text-white transition-all">💾 SALVAR DADOS</button>
      </div>
    `;

    window.saveSumulaSelf = () => {
      const hName = document.getElementById('home-team-name')?.value || home.name;
      const hShort = (document.getElementById('home-team-short')?.value || 'CAS').toUpperCase();
      const hColor = document.getElementById('home-team-color')?.value || '#3b82f6';
      const aName = document.getElementById('away-team-name')?.value || away.name;
      const aShort = (document.getElementById('away-team-short')?.value || 'VIS').toUpperCase();
      const aColor = document.getElementById('away-team-color')?.value || '#ef4444';
      const homeFormation = document.getElementById('home-formation')?.value || '4-4-2';
      const awayFormation = document.getElementById('away-formation')?.value || '4-4-2';
      const homeCoach = document.getElementById('home-coach')?.value || '';
      const awayCoach = document.getElementById('away-coach')?.value || '';

      // Resolve color conflict
      let finalAColor = aColor;
      if (matchState.detectColorConflict()) {
        const fallbacks = ['#ef4444','#f97316','#22c55e','#8b5cf6','#06b6d4','#fff','#1e293b'];
        finalAColor = fallbacks.find(c => {
          const r1=parseInt(hColor.slice(1,3),16),g1=parseInt(hColor.slice(3,5),16),b1=parseInt(hColor.slice(5,7),16);
          const r2=parseInt(c.slice(1,3),16),g2=parseInt(c.slice(3,5),16),b2=parseInt(c.slice(5,7),16);
          return Math.sqrt((r1-r2)**2+(g1-g2)**2+(b1-b2)**2) >= 60;
        }) || '#ef4444';
      }

      matchState.setState(prev => ({
        ...prev,
        homeTeam: { ...prev.homeTeam, name: hName, shortName: hShort, color: hColor, formation: homeFormation },
        awayTeam: { ...prev.awayTeam, name: aName, shortName: aShort, color: finalAColor, formation: awayFormation },
        homeCoach,
        awayCoach
      }));
      this.close();
    };

    // Upload de imagem por time (OCR)
    window.handleImageUploadTeam = async (event, teamId) => {
      const file = event.target.files[0];
      if (!file) return;
      const teamName = teamId === 'home' ? home.name : away.name;
      window.toastManager?.show(`OCR ${teamName}`, 'Analisando imagem...', 'ai');
      try {
        const result = await processImageForPlayers(file, 'players');
        window.currentImportTeamId = teamId;
        if (Array.isArray(result)) {
          const teamKey = teamId === 'home' ? 'homeTeam' : 'awayTeam';
          matchState.setState(prev => {
            const existing = prev[teamKey].players || [];
            const existingNumbers = new Set(existing.map(p => p.number));
            const newPlayers = result.filter(p => !existingNumbers.has(p.number));
            return { ...prev, [teamKey]: { ...prev[teamKey], players: [...existing, ...newPlayers] } };
          });
          window.toastManager?.show('Sucesso', `${result.length} jogadores importados para ${teamName}.`, 'success');
        }
      } catch (e) {
        window.toastManager?.show('Erro', e.message || 'Falha no OCR.', 'error');
      }
    };

    // Import por texto por time
    window.importTextListTeam = async (event, teamId) => {
      const file = event.target.files[0];
      if (!file) return;
      const teamName = teamId === 'home' ? home.name : away.name;
      try {
        const text = await file.text();
        const lines = text.split('\n').filter(l => l.trim());

        // Tenta parse com IA primeiro para texto bruto
        if (lines.length > 3) {
          window.toastManager?.show(`IA ${teamName}`, 'Processando lista...', 'ai');
          try {
            const { processTextForPlayers } = await import('../services/gemini.js');
            const result = await processTextForPlayers(text);
            if (Array.isArray(result) && result.length > 0) {
              const teamKey = teamId === 'home' ? 'homeTeam' : 'awayTeam';
              matchState.setState(prev => {
                const existing = prev[teamKey].players || [];
                const existingNumbers = new Set(existing.map(p => p.number));
                const newPlayers = result.filter(p => !existingNumbers.has(p.number));
                return { ...prev, [teamKey]: { ...prev[teamKey], players: [...existing, ...newPlayers] } };
              });
              window.toastManager?.show('Sucesso', `${result.length} jogadores importados para ${teamName}.`, 'success');
              return;
            }
          } catch (e) {
            console.warn('IA text parse failed, falling back to manual', e);
          }
        }

        // Fallback manual para texto simples
        const players = lines.map((line, i) => {
          const parts = line.trim().split(/\s*,\s*|\s+/);
          const number = parseInt(parts[0]) || (i + 1);
          const name = parts.slice(1).join(' ') || line.trim();
          return {
            id: crypto.randomUUID?.() || Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
            name, number,
            position: i === 0 ? 'GK' : 'MF',
            isStarter: true, hasLeftGame: false
          };
        });
        const teamKey = teamId === 'home' ? 'homeTeam' : 'awayTeam';
        matchState.setState(prev => ({
          ...prev,
          [teamKey]: { ...prev[teamKey], players: [...prev[teamKey].players, ...players] }
        }));
        window.toastManager?.show('Sucesso', `${players.length} jogadores importados para ${teamName}.`, 'success');
      } catch (e) {
        window.toastManager?.show('Erro', 'Falha ao importar lista.', 'error');
      }
    };

    this.open(content, 'Súmula da Partida');
  }

  // ============================================================
  // PRE-MATCH SETUP
  // ============================================================
  showPreMatchSetup() {
    const state = matchState.getState();
    const details = state.matchDetails || {};

    const content = `
      <div class="flex flex-col gap-4">
        <button onclick="document.getElementById('banner_img').click()" class="w-full p-4 bg-slate-800/50 border border-white/5 rounded-2xl flex items-center gap-3 hover:bg-slate-800 transition-all">
          <span class="text-xl">🏷️</span>
          <span class="text-[11px] font-black text-slate-300 uppercase">OCR Banner (Foto da Placa)</span>
        </button>
        <input type="file" id="banner_img" hidden accept="image/*" onchange="window.handleBannerUpload(event)"/>

        <button onclick="document.getElementById('reg_file').click()" class="w-full p-4 bg-slate-800/50 border border-white/5 rounded-2xl flex items-center gap-3 hover:bg-slate-800 transition-all">
          <span class="text-xl">📋</span>
          <span class="text-[11px] font-black text-slate-300 uppercase">Regulamento (PDF/Imagem)</span>
        </button>
        <input type="file" id="reg_file" hidden accept="image/*,.pdf" onchange="window.handleRegulationUpload(event)"/>

        ${state.extractedRules ? `
          <div class="p-3 bg-emerald-900/20 border border-emerald-500/30 rounded-xl space-y-1">
            <p class="text-[10px] font-black text-emerald-400 uppercase">📋 Regras Extraídas por IA</p>
            <p class="text-xs text-slate-300">Tempo: ${state.extractedRules.halfDuration || '?' }min</p>
            <p class="text-xs text-slate-300">Substituições: ${state.extractedRules.maxSubstitutions || '?' }</p>
            <p class="text-xs text-slate-300">Pênaltis: ${state.extractedRules.penaltyKicks || 5 }</p>
          </div>
        ` : ''}

        <div class="space-y-2">
          <input type="text" id="pre-comp" value="${details.competition || ''}" placeholder="Competição" class="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-sm text-white outline-none"/>
          <input type="text" id="pre-referee" value="${details.referee || ''}" placeholder="Árbitro" class="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-sm text-white outline-none"/>
          <input type="text" id="pre-stadium" value="${details.stadium || ''}" placeholder="Estádio" class="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-sm text-white outline-none"/>
          <div class="grid grid-cols-2 gap-2">
            <input type="text" id="pre-date" value="${details.date || new Date().toLocaleDateString('pt-BR')}" placeholder="Data" class="bg-slate-900 border border-white/10 rounded-xl p-3 text-sm text-white outline-none"/>
            <input type="text" id="pre-time" value="${details.time || ''}" placeholder="Horário" class="bg-slate-900 border border-white/10 rounded-xl p-3 text-sm text-white outline-none"/>
          </div>
          <textarea id="pre-obs" rows="2" placeholder="Observações" class="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-sm text-white outline-none resize-none">${details.observations || ''}</textarea>
        </div>

        <button onclick="window.savePreMatchSelf()" class="w-full p-4 bg-emerald-600 hover:bg-emerald-500 rounded-2xl text-[11px] font-black uppercase text-white transition-all">✅ PRÉ-JOGO CONFIGURADO</button>
      </div>
    `;

    window.handleBannerUpload = async (event) => {
      const file = event.target.files[0];
      if (!file) return;
      window.toastManager?.show('Vision AI', 'Analisando banner...', 'ai');
      try {
        const reader = new FileReader();
        reader.onloadend = async () => {
          const prompt = `Extraia dados do banner da partida: competição, times, estádio, data, hora. Formato JSON: {"competition":"...","stadium":"...","date":"...","homeTeam":"...","awayTeam":"..."}`;
          const { callBannerAI } = await import('../services/gemini.js');
          const text = await callBannerAI(reader.result);
          const parsed = cleanAndParseJSON(text);
          matchState.setState(prev => ({
            ...prev,
            bannerData: parsed,
            matchDetails: { ...prev.matchDetails, ...parsed }
          }));
          window.toastManager?.show('Sucesso', 'Dados do banner extraídos.', 'success');
          document.getElementById('pre-comp').value = parsed.competition || '';
          document.getElementById('pre-stadium').value = parsed.stadium || '';
          document.getElementById('pre-date').value = parsed.date || '';
        };
        reader.readAsDataURL(file);
      } catch (e) {
        window.toastManager?.show('Erro', 'Falha no OCR do banner.', 'error');
      }
    };

    window.savePreMatchSelf = () => {
      matchState.saveMatchDetails({
        competition: document.getElementById('pre-comp')?.value || '',
        referee: document.getElementById('pre-referee')?.value || '',
        stadium: document.getElementById('pre-stadium')?.value || '',
        date: document.getElementById('pre-date')?.value || '',
        time: document.getElementById('pre-time')?.value || '',
        observations: document.getElementById('pre-obs')?.value || ''
      });
      this.close();
    };

    this.open(content, 'Configuração Pré-Jogo');
  }

  // ============================================================
  // PENALTY SHOOTOUT MODAL
  // ============================================================
  showPenaltyShootout() {
    const state = matchState.getState();
    const seq = state.penaltySequence || [];
    const homeShots = seq.filter(p => p.team === 'home');
    const awayShots = seq.filter(p => p.team === 'away');
    const nextTeam = homeShots.length === awayShots.length
      ? (state.penaltyStarter === 'home' ? 'home' : 'away')
      : (homeShots.length < awayShots.length ? 'home' : 'away');

    const renderShot = (shot) => {
      const team = shot.team === 'home' ? state.homeTeam : state.awayTeam;
      return `<span class="inline-block w-8 h-8 rounded-full ${shot.scored ? 'bg-emerald-500' : 'bg-red-500'} text-white text-[10px] font-black leading-8 text-center" title="${team.name} #${shot.number}">${shot.number}</span>`;
    };

    const content = `
      <div class="flex flex-col gap-4">
        <div class="flex justify-between items-center">
          <div class="text-center flex-1">
            <p class="text-[10px] font-black uppercase tracking-widest" style="color:${state.homeTeam.color}">${state.homeTeam.shortName}</p>
            <p class="text-3xl font-black text-white">${state.penaltyScore.home}</p>
            <div class="flex gap-1 justify-center mt-1">${homeShots.map(renderShot).join('')}</div>
          </div>
          <div class="text-2xl font-black text-slate-500 px-4">✕</div>
          <div class="text-center flex-1">
            <p class="text-[10px] font-black uppercase tracking-widest" style="color:${state.awayTeam.color}">${state.awayTeam.shortName}</p>
            <p class="text-3xl font-black text-white">${state.penaltyScore.away}</p>
            <div class="flex gap-1 justify-center mt-1">${awayShots.map(renderShot).join('')}</div>
          </div>
        </div>

        <div class="h-px bg-white/5"></div>

        <p class="text-center text-xs text-slate-400 font-bold">Próxima cobrança: <span style="color:${nextTeam === 'home' ? state.homeTeam.color : state.awayTeam.color}">${nextTeam === 'home' ? state.homeTeam.shortName : state.awayTeam.shortName}</span></p>

        <div class="grid grid-cols-2 gap-3">
          <button onclick="window.registerPenaltyResult('${nextTeam}', true)" class="p-5 bg-emerald-600 hover:bg-emerald-500 rounded-2xl text-xs font-black uppercase text-white transition-all">✅ CONVERTEU</button>
          <button onclick="window.registerPenaltyResult('${nextTeam}', false)" class="p-5 bg-red-600 hover:bg-red-500 rounded-2xl text-xs font-black uppercase text-white transition-all">❌ PERDEU</button>
        </div>
      </div>
    `;

    window.registerPenaltyResult = (teamId, scored) => {
      matchState.registerPenalty(teamId, scored);
      // Re-open to show updated state
      this.close();
      const newState = matchState.getState();
      if (newState.isPenaltyShootoutActive || newState.penaltySequence.length < (newState.rules?.penaltyKicks || 5) * 2) {
        setTimeout(() => this.showPenaltyShootout(), 250);
      }
    };

    this.open(content, 'Disputa de Pênaltis');
  }

  // ============================================================
  // END GAME OPTIONS
  // ============================================================
  showEndGameOptions() {
    const content = `
      <div class="flex flex-col gap-4">
        <p class="text-center text-sm text-slate-400 font-bold">O tempo acabou. Como deseja proceder?</p>
        <button onclick="window.executeEndGame('finish')" class="w-full p-5 bg-red-600 hover:bg-red-500 rounded-2xl text-xs font-black uppercase text-white transition-all">🏁 ENCERRAR PARTIDA</button>
        <button onclick="window.executeEndGame('extratime')" class="w-full p-5 bg-purple-600 hover:bg-purple-500 rounded-2xl text-xs font-black uppercase text-white transition-all">⏱️ IR PARA PRORROGAÇÃO</button>
        <button onclick="window.executeEndGame('penalties')" class="w-full p-5 bg-blue-600 hover:bg-blue-500 rounded-2xl text-xs font-black uppercase text-white transition-all">🥅 IR PARA PÊNALTIS</button>
        <button onclick="window.modalManager.close()" class="w-full p-3 bg-slate-800 hover:bg-slate-700 rounded-2xl text-[10px] font-black uppercase text-slate-400 transition-all">← VOLTAR</button>
      </div>
    `;

    window.executeEndGame = (option) => {
      this.close();
      if (option === 'finish') {
        matchState.handleFinalizeMatch();
        // Show report
        setTimeout(() => this.showMatchReport(), 300);
      } else if (option === 'extratime') {
        matchState.advancePeriod('1ET');
        window.toastManager?.show('Prorrogação', 'Início da prorrogação!', 'info');
      } else if (option === 'penalties') {
        matchState.setState({ period: 'PENALTIES', isPaused: true, isPenaltyShootoutActive: true });
        setTimeout(() => this.showPenaltyShootout(), 300);
      }
    };

    this.open(content, 'Fim do Tempo');
  }

  // ============================================================
  // MATCH REPORT (structured)
  // ============================================================
  showMatchReport() {
    const report = matchState.generateStructuredReport();
    const content = `
      <div class="flex flex-col gap-4">
        <pre class="text-xs text-slate-300 whitespace-pre-wrap font-mono bg-slate-800 p-4 rounded-xl max-h-60 overflow-y-auto">${report}</pre>
        <div class="grid grid-cols-2 gap-3">
          <button onclick="window.copyReportSelf()" class="w-full p-4 bg-blue-600 hover:bg-blue-500 rounded-2xl text-[11px] font-black uppercase text-white transition-all">📋 COPIAR</button>
          <button onclick="window.downloadReportSelf()" class="w-full p-4 bg-emerald-600 hover:bg-emerald-500 rounded-2xl text-[11px] font-black uppercase text-white transition-all">💾 SALVAR</button>
        </div>
      </div>
    `;

    window.copyReportSelf = () => {
      navigator.clipboard.writeText(report);
      window.toastManager?.show('Copiado', 'Relatório copiado.', 'success');
    };

    window.downloadReportSelf = () => {
      const blob = new Blob([report], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `relatorio_${new Date().toISOString().slice(0,10)}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    };

    this.open(content, 'Relatório da Partida');
  }

  // ============================================================
  // RESET CONFIRMATION
  // ============================================================
  showResetConfirm() {
    const content = `
      <div class="flex flex-col gap-4">
        <div class="text-center p-4 bg-red-900/20 border border-red-500/20 rounded-2xl">
          <p class="text-2xl mb-2">⚠️</p>
          <p class="text-sm font-black text-red-400">ATENÇÃO</p>
          <p class="text-xs text-slate-400 mt-1">Isso apagará TODOS os dados da partida. Esta ação é irreversível.</p>
        </div>
        <button onclick="window.executeResetSelf()" class="w-full p-5 bg-red-600 hover:bg-red-500 rounded-2xl text-xs font-black uppercase text-white transition-all">🗑️ RESETAR PARTIDA</button>
        <button onclick="window.modalManager.close()" class="w-full p-3 bg-slate-800 rounded-2xl text-[10px] font-black uppercase text-slate-400 transition-all">← CANCELAR</button>
      </div>
    `;

    window.executeResetSelf = () => {
      matchState.handleReset();
      this.close();
      window.toastManager?.show('Reset', 'Estado inicial restaurado.', 'warning');
      window.render?.();
    };

    this.open(content, 'Confirmar Reset');
  }

  // ============================================================
  // AI CONFIGURATION
  // ============================================================
  showAiConfig() {
    const geminiKey = localStorage.getItem('GGPRO_GEMINI_KEY') || '';
    const groqKey = localStorage.getItem('GGPRO_GROQ_KEY') || '';

    const content = `
      <div class="flex flex-col gap-5 p-2">
        <p class="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-relaxed">
          Configure suas chaves de API para garantir o funcionamento ininterrupto da IA durante a transmissão. 
          As chaves são salvas apenas no seu navegador.
        </p>

        <div class="space-y-4">
          <div class="flex flex-col gap-2">
            <label class="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Google Gemini API Key</label>
            <input type="password" id="geminiKeyInput" value="${geminiKey}" placeholder="Insira sua chave Gemini..." 
                   class="w-full bg-slate-800 border border-white/10 rounded-xl p-4 text-xs text-white outline-none focus:border-blue-500/50 transition-all shadow-inner" />
          </div>

          <div class="flex flex-col gap-2">
            <label class="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Groq API Key (Llama 3 Fallback)</label>
            <input type="password" id="groqKeyInput" value="${groqKey}" placeholder="Insira sua chave Groq..." 
                   class="w-full bg-slate-800 border border-white/10 rounded-xl p-4 text-xs text-white outline-none focus:border-blue-500/50 transition-all shadow-inner" />
          </div>
        </div>

        <div class="h-px bg-white/5 my-2"></div>

        <button onclick="window.saveAiConfigSelf()" class="w-full p-5 bg-blue-600 hover:bg-blue-500 rounded-2xl text-xs font-black uppercase text-white transition-all shadow-lg shadow-blue-900/20 active:scale-95">
          💾 SALVAR CONFIGURAÇÕES
        </button>

        <p class="text-[8px] text-slate-600 text-center italic font-medium">
          Dica: Use chaves próprias para evitar limites de token do servidor público.
        </p>
      </div>
    `;

    window.saveAiConfigSelf = () => {
      const gKey = document.getElementById('geminiKeyInput')?.value;
      const grKey = document.getElementById('groqKeyInput')?.value;
      
      localStorage.setItem('GGPRO_GEMINI_KEY', gKey || '');
      localStorage.setItem('GGPRO_GROQ_KEY', grKey || '');
      
      window.toastManager?.show('Configurado', 'Chaves de IA atualizadas com sucesso.', 'success');
      this.close();
    };

    this.open(content, 'Configuração de IA Ultra');
  }
}

export const modalManager = new ModalManager();
