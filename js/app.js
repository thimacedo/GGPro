import { renderTimeline } from './components/timeline.js';
import { renderMatchDetails } from './components/details.js';
import { showMatchSettings, showReportModal } from './components/modals.js';
import { renderTacticalField } from './components/field.js';
import { parseMatchCommand, generateMatchReport } from './services/gemini.js';
import { 
    subscribeToMatch, 
    addMatchEvent, 
    updateTeamRoster, 
    updatePlayerCoordinates,
    toggleMatchTimer,
    undoLastMatchEvent,
    saveMatchReport 
} from './services/firebaseService.js';

let matchState = {
    period: 'PRE_MATCH',
    timeElapsed: 0,
    timerStartedAt: null,
    isPaused: true,
    homeTeam: { name: '', shortName: 'HOME', color: '#ef4444', score: 0, players: [] },
    awayTeam: { name: '', shortName: 'AWAY', color: '#10b981', score: 0, players: [] },
    events: []
};

let clockInterval = null;

/**
 * 🛠️ MOTOR DO RELÓGIO (Engine)
 * Calcula o tempo decorrido baseado no timestamp de início gravado no Firebase.
 */
function runClockEngine() {
    if (clockInterval) clearInterval(clockInterval);

    clockInterval = setInterval(() => {
        if (matchState.period === 'PENALTIES' || matchState.isPaused) {
            return;
        }

        const now = Date.now();
        const start = matchState.timerStartedAt || now;
        const totalMs = (matchState.timeElapsed || 0) + (now - start);
        
        const totalSeconds = Math.floor(totalMs / 1000);
        updateTimerDisplay(totalSeconds);
    }, 1000);
}

function updateTimerDisplay(totalSeconds) {
    const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
    const seconds = String(totalSeconds % 60).padStart(2, '0');
    
    const timerDisplay = document.getElementById('main-timer');
    if (timerDisplay) {
        timerDisplay.innerText = `${minutes}:${seconds}`;
    }
}

const getPlayerById = (id) => {
    const allPlayers = [
        ...(matchState.homeTeam?.players || []),
        ...(matchState.awayTeam?.players || [])
    ];
    return allPlayers.find(p => String(p.id) === String(id) || String(p.number) === String(id)) 
           || { id, name: `Jogador ${id}`, shortName: 'JOG', position: 'N/A' };
};

/**
 * 🏗️ CONSTRUÇÃO DA INTERFACE (Shell)
 */
function buildAppShell() {
    const root = document.getElementById('root');
    if (!root) return;

    root.innerHTML = `
        <div class="app-container">
            <header id="scoreboard-container">
                <div class="app-header">
                    <div class="top-bar">
                        <div class="team-info home">
                            <div class="team-titles home">
                                <span class="team-name-h2" id="home-name">--</span>
                            </div>
                            <div class="score-badge" id="score-home" style="background: var(--red-500)">0</div>
                        </div>
                        
                        <div class="clock-container">
                            <span class="period-badge" id="match-period">--</span>
                            <span class="timer-text" id="main-timer">00:00</span>
                        </div>

                        <div class="team-info away">
                            <div class="score-badge" id="score-away" style="background: var(--emerald-500)">0</div>
                            <div class="team-titles away">
                                <span class="team-name-h2" id="away-name">--</span>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            <nav class="options-menu">
                <div class="tabs" id="view-tabs">
                    <button class="btn-view active" data-view="lista">Lista</button>
                    <button class="btn-view" data-view="mapa">Mapa Tático</button>
                </div>
                
                <div class="options-menu__actions">
                    <button class="icon-btn" id="btn-var"><i data-lucide="monitor-play"></i> VAR</button>
                    <button class="icon-btn" id="btn-undo"><i data-lucide="rotate-ccw"></i> Desfazer</button>
                    <button class="icon-btn" id="btn-settings"><i data-lucide="settings"></i> Ajustes</button>
                </div>
            </nav>

            <main class="main-content">
                <div class="dashboard-grid">
                    <section id="primary-view-container"></section>
                    <aside class="sidebar">
                        <div id="details-container" style="margin-bottom: 24px;"></div>
                        <div class="card p-4 mb-6" id="ai-report-box">
                            <h3 class="uppercase tracking-widest mb-3" style="font-size: 0.75rem; color:var(--primary)">Pós-Jogo AI</h3>
                            <button class="btn-view" id="btn-generate-report" style="width: 100%; justify-content: center; gap: 10px;">
                                <i data-lucide="sparkles"></i> Gerar Crônica AI
                            </button>
                        </div>
                        <div id="timeline-container"></div>
                    </aside>
                </div>
            </main>

            <footer class="fixed-footer">
                <div class="footer-content">
                    <button class="btn-play-pause" id="btn-main-action">
                        <i data-lucide="play"></i>
                    </button>
                    <div class="command-bar">
                        <input type="text" class="command-input" placeholder="Comando: 'Gol do 10 do Flamengo'..." id="ai-input" />
                        <button class="icon-btn" id="ai-submit"><i data-lucide="send"></i></button>
                    </div>
                </div>
            </footer>
        </div>
    `;

    if (window.lucide) window.lucide.createIcons();
    setupGlobalDelegation();
}

/**
 * 🛰️ DELEGAÇÃO DE EVENTOS E UI
 */
function setupGlobalDelegation() {
    // Tabs de Visualização
    document.getElementById('view-tabs')?.addEventListener('click', (e) => {
        const btn = e.target.closest('.btn-view');
        if (!btn) return;
        document.querySelectorAll('#view-tabs .btn-view').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        switchView(btn.dataset.view);
    });

    // Botão de Play/Pause (Cronômetro real-time)
    document.getElementById('btn-main-action')?.addEventListener('click', async () => {
        const btn = document.getElementById('btn-main-action');
        btn.disabled = true;
        
        // Calcula o tempo atual antes de alternar para persistência correta
        const now = Date.now();
        const start = matchState.timerStartedAt || now;
        const currentElapsed = matchState.isPaused ? matchState.timeElapsed : (matchState.timeElapsed + (now - start));

        try {
            await toggleMatchTimer(matchState.isPaused, currentElapsed);
        } finally {
            btn.disabled = false;
        }
    });

    // Ajustes
    document.getElementById('btn-settings')?.addEventListener('click', () => {
        showMatchSettings(matchState.homeTeam, matchState.awayTeam);
    });

    // Comando IA
    document.getElementById('ai-submit')?.addEventListener('click', processAiCommand);
    document.getElementById('ai-input')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') processAiCommand();
    });

    // Listener para OCR de Elencos
    window.addEventListener('rosterImported', async (e) => {
        const { teamSide, rosterData } = e.detail;
        try {
            await updateTeamRoster(teamSide, rosterData);
        } catch (error) {
            console.error("Erro ao importar elenco:", error);
            alert("Falha ao sincronizar elenco no Firebase.");
        }
    });

    // Crônica AI (Inteligência Pós-Jogo)
    document.getElementById('btn-generate-report')?.addEventListener('click', async () => {
        // Se já existe um relatório, abre o existente sem gastar tokens
        if (matchState.aiReport) {
            showReportModal(matchState.aiReport);
            return;
        }

        if (matchState.events.length < 3) {
            alert("A crônica requer pelo menos 3 eventos registrados para ser representativa.");
            return;
        }

        const btn = document.getElementById('btn-generate-report');
        const originalText = btn.innerHTML;

        btn.disabled = true;
        btn.innerHTML = `<i data-lucide="loader-2" class="animate-spin"></i> Gerando Crônica...`;
        if (window.lucide) window.lucide.createIcons();

        try {
            const report = await generateMatchReport(matchState);
            await saveMatchReport(report); // Persiste no Firebase
            showReportModal(report);
        } catch (error) {
            alert(`Erro ao gerar crônica: ${error.message}`);
        } finally {
            btn.disabled = false;
            btn.innerHTML = originalText;
            if (window.lucide) window.lucide.createIcons();
        }
    });

    // Botão Desfazer (Anulação Atômica)
    document.getElementById('btn-undo')?.addEventListener('click', async () => {
        if (matchState.events.length === 0) return;
        
        const btn = document.getElementById('btn-undo');
        const icon = btn.querySelector('i');
        
        btn.disabled = true;
        if (icon) icon.classList.add('animate-spin');

        try {
            await undoLastMatchEvent();
        } catch (error) {
            console.error("Erro ao desfazer:", error);
            alert("Não foi possível desfazer o último evento.");
        } finally {
            btn.disabled = false;
            if (icon) icon.classList.remove('animate-spin');
            if (window.lucide) window.lucide.createIcons();
        }
    });
}

async function processAiCommand() {
    const input = document.getElementById('ai-input');
    if (!input || !input.value.trim()) return;
    
    const text = input.value.trim();
    input.disabled = true;
    input.placeholder = "IA interpretando lance...";

    try {
        const aiEvent = await parseMatchCommand(text, matchState);
        const timeDisplay = document.getElementById('main-timer').innerText;

        const newEvent = {
            ...aiEvent,
            id: crypto.randomUUID(),
            period: matchState.period,
            timeStr: timeDisplay + "'",
            minute: parseInt(timeDisplay.split(':')[0]) || 0,
            timestamp: Date.now(),
            playerId: aiEvent.playerNumber
        };

        const isGoal = aiEvent.type === 'GOAL';
        await addMatchEvent(newEvent, isGoal, aiEvent.teamSide || (aiEvent.teamId === 'home' ? 'home' : 'away'));
        
        input.value = '';
    } catch (err) {
        console.error("Erro no comando IA:", err);
        alert("Falha ao interpretar comando. Verifique a conexão com o Gemini.");
    } finally {
        input.disabled = false;
        input.placeholder = "Comando: 'Gol do 10 do Flamengo'...";
        input.focus();
    }
}

function updateAppUI() {
    const homeNameDisp = document.getElementById('home-name');
    const awayNameDisp = document.getElementById('away-name');
    if (homeNameDisp) homeNameDisp.innerText = matchState.homeTeam?.shortName || '--';
    if (awayNameDisp) awayNameDisp.innerText = matchState.awayTeam?.shortName || '--';
    
    const scoreHome = document.getElementById('score-home');
    const scoreAway = document.getElementById('score-away');
    
    if (scoreHome) {
        scoreHome.innerText = matchState.homeTeam?.score || 0;
        scoreHome.style.background = matchState.homeTeam?.color || '#ef4444';
    }
    
    if (scoreAway) {
        scoreAway.innerText = matchState.awayTeam?.score || 0;
        scoreAway.style.background = matchState.awayTeam?.color || '#10b981';
    }

    const periodDisp = document.getElementById('match-period');
    if (periodDisp) {
        periodDisp.innerText = matchState.period === 'PENALTIES' ? 'PÊNALTIS' : (matchState.period || '1T');
    }

    // Atualiza o botão de Play/Pause e o estado do timer
    const mainBtn = document.getElementById('btn-main-action');
    const timerText = document.getElementById('main-timer');
    
    if (mainBtn) {
        mainBtn.innerHTML = matchState.isPaused ? '<i data-lucide="play"></i>' : '<i data-lucide="pause"></i>';
        mainBtn.classList.toggle('playing', !matchState.isPaused);
    }
    
    if (timerText) {
        timerText.classList.toggle('paused', matchState.isPaused);
    }

    if (window.lucide) window.lucide.createIcons();

    // Atualiza o estado visual do botão de Crônica AI
    const reportBtn = document.getElementById('btn-generate-report');
    if (reportBtn) {
        if (matchState.aiReport) {
            reportBtn.innerHTML = `<i data-lucide="file-text"></i> Ler Crônica Salva`;
            reportBtn.style.background = 'var(--bg-accent)';
            reportBtn.style.borderColor = 'var(--primary)';
        } else {
            reportBtn.innerHTML = `<i data-lucide="sparkles"></i> Gerar Crônica AI`;
            reportBtn.style.background = '';
            reportBtn.style.borderColor = '';
        }
    }
    if (window.lucide) window.lucide.createIcons();

    renderMatchDetails(matchState, 'details-container');

    renderTimeline(matchState.events || [], getPlayerById, 'timeline-container');
    
    const activeView = document.querySelector('.btn-view.active')?.dataset.view || 'lista';
    switchView(activeView);
}

function switchView(viewName) {
    const container = document.getElementById('primary-view-container');
    if (!container) return;

    if (viewName === 'lista') {
        container.innerHTML = `
            <div class="card p-6">
                <h3 class="uppercase tracking-widest mb-4">Elencos em Campo</h3>
                <div class="grid grid-cols-2 gap-8">
                    <div>
                        <p class="font-bold mb-4 flex items-center gap-2">
                            <span class="w-2 h-4 rounded-full" style="background:${matchState.homeTeam?.color}"></span>
                            ${matchState.homeTeam?.name || 'Mandante'}
                        </p>
                        <div class="player-list-grid">
                            ${matchState.homeTeam?.players?.map(p => `
                                <div class="player-item ${p.isStarter ? 'starter' : 'reserve'}">
                                    <span class="num-tag">${p.number}</span>
                                    <span class="name">${p.name}</span>
                                    ${p.isCaptain ? '<span class="captain-tag">C</span>' : ''}
                                </div>
                            `).join('') || '<p class="text-xs text-slate-500">Aguardando súmula...</p>'}
                        </div>
                    </div>
                    <div>
                        <p class="font-bold mb-4 flex items-center gap-2">
                            <span class="w-2 h-4 rounded-full" style="background:${matchState.awayTeam?.color}"></span>
                            ${matchState.awayTeam?.name || 'Visitante'}
                        </p>
                        <div class="player-list-grid">
                            ${matchState.awayTeam?.players?.map(p => `
                                <div class="player-item ${p.isStarter ? 'starter' : 'reserve'}">
                                    <span class="num-tag">${p.number}</span>
                                    <span class="name">${p.name}</span>
                                    ${p.isCaptain ? '<span class="captain-tag">C</span>' : ''}
                                </div>
                            `).join('') || '<p class="text-xs text-slate-500">Aguardando súmula...</p>'}
                        </div>
                    </div>
                </div>
            </div>
        `;
    } else if (viewName === 'mapa') {
        renderTacticalField(
            matchState.homeTeam, 
            matchState.awayTeam, 
            'primary-view-container',
            (teamId, playerId, coordX, coordY) => {
                updatePlayerCoordinates(teamId, playerId, coordX, coordY);
            }
        );
    }
}

function initApp() {
    console.log("🚀 Narrador Pro: Iniciando App...");
    
    try {
        buildAppShell();
        console.log("✅ Shell da aplicação construído.");

        if (typeof subscribeToMatch === 'function') {
            console.log("📡 Tentando conexão com Firebase...");
            const unsubscribe = subscribeToMatch((newState) => {
                const wasPaused = matchState.isPaused;
                matchState = newState;
                
                if (wasPaused !== matchState.isPaused) {
                    runClockEngine();
                }
                
                updateAppUI();
            });

            if (!unsubscribe) {
                console.warn("⚠️ Firebase Offline/Indisponível. Rodando em modo local.");
                updateAppUI();
                runClockEngine();
            }
        } else {
            updateAppUI();
            runClockEngine();
        }
    } catch (error) {
        console.error("❌ Erro crítico na inicialização:", error);
        document.body.innerHTML = `<div style="padding:20px; color:white; background:red;">Erro ao carregar App: ${error.message}</div>`;
    }
}

// Garantia de execução (Safe Boot)
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}


