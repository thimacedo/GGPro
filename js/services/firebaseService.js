/**
 * @fileoverview Serviço de persistência e sincronização em tempo real (Firebase Firestore).
 * Reconstruído para garantir Transações Atômicas de Gols e Sincronização do Cronômetro.
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { 
    getFirestore, 
    doc, 
    onSnapshot, 
    runTransaction, 
    updateDoc,
    enableMultiTabIndexedDbPersistence,
    setDoc,
    getDoc
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "INSERIR_API_KEY",
    authDomain: "INSERIR_AUTH_DOMAIN",
    projectId: "INSERIR_PROJECT_ID",
    storageBucket: "INSERIR_STORAGE_BUCKET",
    messagingSenderId: "INSERIR_SENDER_ID",
    appId: "INSERIR_APP_ID"
};

let app, db;
const MATCH_ID = "live_match";

/**
 * 🔒 BLINDAGEM DE INICIALIZAÇÃO
 * Evita que a falta de chaves interrompa o carregamento da UI.
 */
try {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    
    // Persistência Offline (Multi-tab)
    enableMultiTabIndexedDbPersistence(db).catch((err) => {
        if (err.code === 'failed-precondition') {
            console.warn("Persistência Offline: Múltiplas abas abertas.");
        } else if (err.code === 'unimplemented') {
            console.warn("Persistência Offline: Navegador sem suporte.");
        }
    });

    console.log("✅ Firebase Service: Inicializado com sucesso.");
} catch (e) {
    console.warn("⚠️ Firebase: Aguardando configuração. Modo local ativo.");
}

/**
 * 🛰️ SUBSCREVER À PARTIDA (Real-time)
 * Escuta mudanças no documento central da partida.
 */
export function subscribeToMatch(callback) {
    if (!db) return;
    const matchRef = doc(db, "matches", MATCH_ID);
    
    return onSnapshot(matchRef, (snapshot) => {
        if (snapshot.exists()) {
            callback(snapshot.data());
        } else {
            console.log("Criando documento inicial da partida...");
            const initialState = {
                period: 'PRE_MATCH',
                timeElapsed: 0,
                timerStartedAt: null,
                isPaused: true,
                homeTeam: { name: 'Mandante', shortName: 'HOME', color: '#ef4444', score: 0, players: [] },
                awayTeam: { name: 'Visitante', shortName: 'AWAY', color: '#10b981', score: 0, players: [] },
                events: []
            };
            setDoc(matchRef, initialState);
            callback(initialState);
        }
    }, (error) => {
        console.error("Erro na sincronização Firebase:", error);
    });
}

/**
 * ⚽ ADICIONAR EVENTO (Transação Atômica)
 * Garante consistência entre a lista de eventos e o placar.
 */
export async function addMatchEvent(event, isGoal = false, teamSide = null) {
    if (!db) return;
    const matchRef = doc(db, "matches", MATCH_ID);

    try {
        await runTransaction(db, async (transaction) => {
            const matchDoc = await transaction.get(matchRef);
            if (!matchDoc.exists()) throw new Error("Partida não encontrada.");

            const data = matchDoc.data();
            const events = data.events || [];
            
            const updatePayload = {
                events: [...events, event]
            };

            if (isGoal && teamSide) {
                const teamKey = teamSide === 'home' ? 'homeTeam' : 'awayTeam';
                const currentScore = data[teamKey]?.score || 0;
                updatePayload[`${teamKey}.score`] = currentScore + 1;
            }

            transaction.update(matchRef, updatePayload);
        });
        console.log(`✅ Evento registrado: ${event.type}`);
    } catch (e) {
        console.error("Falha na Transação Atômica:", e);
        throw e;
    }
}

/**
 * 📋 ATUALIZAR ELENCO (OCR Import)
 */
export async function updateTeamRoster(teamSide, rosterData) {
    if (!db) return;
    const matchRef = doc(db, "matches", MATCH_ID);
    
    const teamKey = teamSide === 'home' ? 'homeTeam' : 'awayTeam';
    try {
        await updateDoc(matchRef, {
            [`${teamKey}.name`]: rosterData.teamName || (teamSide === 'home' ? 'Mandante' : 'Visitante'),
            [`${teamKey}.players`]: rosterData.players || []
        });
    } catch (e) {
        console.error("Erro ao atualizar elenco:", e);
    }
}

/**
 * 🗺️ ATUALIZAR COORDENADAS TÁTICAS (Drag & Drop)
 */
export async function updatePlayerCoordinates(teamId, playerId, x, y) {
    if (!db) return;
    const matchRef = doc(db, "matches", MATCH_ID);

    try {
        await runTransaction(db, async (transaction) => {
            const matchDoc = await transaction.get(matchRef);
            if (!matchDoc.exists()) return;

            const data = matchDoc.data();
            const teamKey = teamId === 'home' ? 'homeTeam' : 'awayTeam';
            const players = data[teamKey]?.players || [];
            
            const updatedPlayers = players.map(p => {
                if (String(p.id) === String(playerId) || String(p.number) === String(playerId)) {
                    return { ...p, coordX: x, coordY: y };
                }
                return p;
            });

            transaction.update(matchRef, {
                [`${teamKey}.players`]: updatedPlayers
            });
        });
    } catch (e) {
        console.error("Falha ao salvar tática:", e);
    }
}

/**
 * ⏪ ANULAÇÃO DE EVENTO (Undo)
 * Remove o último evento da lista de forma atômica.
 * Se o evento removido for um GOL, o placar é automaticamente decrementado.
 */
export async function undoLastMatchEvent() {
    if (!db) return;

    const matchRef = doc(db, "matches", MATCH_ID);
    
    try {
        await runTransaction(db, async (transaction) => {
            const matchDoc = await transaction.get(matchRef);
            if (!matchDoc.exists()) throw "Partida não encontrada!";

            const data = matchDoc.data();
            const events = data.events || [];
            
            if (events.length === 0) return; // Nada para desfazer

            const lastEvent = events[events.length - 1];
            const updatedEvents = events.slice(0, -1);
            
            let updates = { events: updatedEvents };

            // Se o evento que estamos removendo for um GOL, subtrai do placar
            if (lastEvent.type === 'GOAL' || lastEvent.isGoal) {
                const teamSide = lastEvent.teamSide || (lastEvent.teamId === 'away' ? 'away' : 'home');
                const teamKey = teamSide === 'home' ? 'homeTeam' : 'awayTeam';
                const currentScore = data[teamKey]?.score || 0;
                
                updates[`${teamKey}.score`] = Math.max(0, currentScore - 1);
            }

            transaction.update(matchRef, updates);
        });
        return true;
    } catch (e) {
        console.error("Erro ao desfazer evento:", e);
        throw e;
    }
}

/**
 * ⏱️ CONTROLE DO CRONÔMETRO (Sincronização Atômica)
 */
export async function toggleMatchTimer(isPaused, timeElapsed) {
    if (!db) return;
    const matchRef = doc(db, "matches", MATCH_ID);

    try {
        const nextStatePaused = !isPaused;
        await updateDoc(matchRef, {
            isPaused: nextStatePaused,
            timeElapsed: timeElapsed,
            timerStartedAt: nextStatePaused ? null : Date.now()
        });
        console.log(`⏱️ Sinc de tempo: ${nextStatePaused ? 'PAUSADO' : 'CORRENDO'}`);
    } catch (e) {
        console.error("Falha ao alternar timer:", e);
    }
}

