import { renderTimeline } from './components/timeline.js';
import { renderMatchDetails } from './components/details.js';
import { showMatchSettings } from './components/modals.js';
import { renderTacticalField } from './components/field.js';
import { parseMatchCommand } from './services/gemini.js';
import { subscribeToMatch, addMatchEvent, updateTeamRoster, updatePlayerCoordinates, toggleMatchTimer } from './services/firebaseService.js';

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

// Hoisting para acesso global
export async function handleImageUpload(file, type) {
    try {
        const result = await import('./services/gemini.js').then(m => m.processMatchDocument(file, type));
        return result;
    } catch (error) {
        console.error("Falha no handleImageUpload:", error);
        throw error;
    }
}

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
        const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
        const seconds = String(totalSeconds % 60).padStart(2, '0');
        
        const timerDisplay = document.getElementById('main-timer');
        if (timerDisplay) {
            timerDisplay.innerText = `${minutes}:${seconds}`;
        }
    }, 1000);
}

const getPlayerById = (id) => {
    const allPlayers = [
        ...(matchState.homeTeam?.players || []),
        ...(matchState.awayTeam?.players || [])
    ];
    return allPlayers.find(p => p.id == id || p.number == id) || { id, name: `Jogador ${id}`, shortName: 'JOG', position: 'N/A' };
};

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
                        <div id="timeline-container"></div>
                    </aside>
                </div>
            </main>

            <footer class="fixed-footer">
                <div class="footer-content">
                    <button class="btn-play-pause" id="btn-main-action"><i data-lucide="play"></i></button>
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

function setupGlobalDelegation() {
    document.getElementById('view-tabs')?.addEventListener('click', (e) => {
        const btn = e.target.closest('.btn-view');
        if (!btn) return;
        document.querySelectorAll('#view-tabs .btn-view').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        switchView(btn.dataset.view);
    });

    document.getElementById('btn-main-action')?.addEventListener('click', () => {
        let timeToSave = matchState.timeElapsed || 0;
        if (!matchState.isPaused && matchState.timerStartedAt) {
            timeToSave = (Date.now() - matchState.timerStartedAt) + (matchState.timeElapsed || 0);
        }
        toggleMatchTimer(matchState.isPaused, timeToSave);
    });

    document.getElementById('btn-settings')?.addEventListener('click', () => {
        showMatchSettings(matchState.homeTeam, matchState.awayTeam);
    });

    document.getElementById('ai-submit')?.addEventListener('click', processAiCommand);
    document.getElementById('ai-input')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') processAiCommand();
    });

    window.addEventListener('rosterImported', async (e) => {
        const { teamSide, rosterData } = e.detail;
        try {
            await updateTeamRoster(teamSide, rosterData);
            console.log(`Dados do OCR enviados ao Firebase para o time: ${teamSide}`);
        } catch (error) {
            alert("Falha ao salvar o elenco sincronizado no banco de dados.");
        }
    });
}

async function processAiCommand() {
    const input = document.getElementById('ai-input');
    if (!input || !input.value.trim()) return;
    
    const text = input.value.trim();
    input.disabled = true;
    input.placeholder = "Processando lance...";

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
        await addMatchEvent(newEvent, isGoal, aiEvent.teamId);
        
        input.value = '';
    } catch (err) {
        console.error("Erro no comando:", err);
        alert("Falha ao interpretar comando ou sincronizar. Tente novamente.");
    } finally {
        input.disabled = false;
        input.placeholder = "Comando: 'Gol do 10 do Flamengo'...";
        input.focus();
    }
}

function updateAppUI() {
    // Atualiza o visual do botão de play/pause
    const playBtn = document.getElementById('btn-main-action');
    if (playBtn) {
        const isPlaying = !matchState.isPaused;
        playBtn.innerHTML = `<i data-lucide="${isPlaying ? 'pause' : 'play'}"></i>`;
        if (window.lucide) window.lucide.createIcons();
    }

    document.getElementById('home-name').innerText = matchState.homeTeam?.shortName || '--';
    document.getElementById('away-name').innerText = matchState.awayTeam?.shortName || '--';
    
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

    if (document.getElementById('match-period')) {
        document.getElementById('match-period').innerText = matchState.period === 'PENALTIES' ? 'PÊNALTIS' : (matchState.period || '1T');
    }

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
                <h3 class="uppercase tracking-widest mb-4">Elencos</h3>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <p class="font-bold mb-2">${matchState.homeTeam?.name || 'Mandante'}</p>
                        ${matchState.homeTeam?.players?.map(p => `<div class="player-item"><span class="num-tag">${p.number}</span> ${p.name}</div>`).join('') || '<p class="text-sm text-slate-500">Nenhum jogador carregado.</p>'}
                    </div>
                    <div>
                        <p class="font-bold mb-2">${matchState.awayTeam?.name || 'Visitante'}</p>
                        ${matchState.awayTeam?.players?.map(p => `<div class="player-item"><span class="num-tag">${p.number}</span> ${p.name}</div>`).join('') || '<p class="text-sm text-slate-500">Nenhum jogador carregado.</p>'}
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
    buildAppShell();
    runClockEngine();
    
    subscribeToMatch((newState) => {
        matchState = newState;
        
        if (!matchState.isPaused && matchState.period !== 'PENALTIES') {
            runClockEngine();
        } else if (matchState.period === 'PENALTIES') {
            document.getElementById('match-period').innerText = 'PÊNALTIS';
        }
        
        updateAppUI();
    });
}

document.addEventListener('DOMContentLoaded', initApp);
