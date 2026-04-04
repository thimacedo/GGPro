/**
 * @fileoverview Serviço de persistência e sincronização em tempo real (Firebase Firestore)
 * com suporte a Offline-First e Transações Atômicas.
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { 
    getFirestore, 
    doc, 
    onSnapshot, 
    runTransaction, 
    updateDoc,
    enableMultiTabIndexedDbPersistence
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

/**
 * 🔒 BLINDAGEM DE INICIALIZAÇÃO (Suspeita 2)
 * Previne que a ausência de chaves interrompa o carregamento da aplicação (SPA).
 */
try {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    
    // Suporte a cache offline (Persistência multi-tab)
    enableMultiTabIndexedDbPersistence(db).catch((err) => {
        if (err.code === 'failed-precondition') {
            console.warn("Persistência offline: Múltiplas abas abertas.");
        } else if (err.code === 'unimplemented') {
            console.warn("Persistência offline: Navegador não compatível.");
        }
    });
    
    console.log("✅ Firebase Service: Ativo.");
} catch (e) {
    console.warn("⚠️ Firebase aguardando chaves válidas. A UI continuará acessível mas sem sincronização em tempo real.");
}

/**
 * 🛰️ SINCRONIZAÇÃO EM TEMPO REAL
 * Mantém o estado da partida (matchState) atualizado para todos os observadores.
 */
export function subscribeToMatch(callback) {
    if (!db) return;
    const matchDoc = doc(db, "matches", "live_match");
    return onSnapshot(matchDoc, (snapshot) => {
        if (snapshot.exists()) {
            callback(snapshot.data());
        }
    });
}

/**
 * ⚽ ADIÇÃO DE EVENTO COM TRANSAÇÃO ATÔMICA
 * Garante que o placar e a cronologia sejam atualizados de forma consistente.
 */
export async function addMatchEvent(event, isGoal = false, teamId = null) {
    if (!db) return;
    const matchRef = doc(db, "matches", "live_match");

    try {
        await runTransaction(db, async (transaction) => {
            const matchDoc = await transaction.get(matchRef);
            if (!matchDoc.exists()) {
                throw new Error("Documento da partida inexistente.");
            }

            const data = matchDoc.data();
            const events = data.events || [];
            
            const updateData = {
                events: [...events, event]
            };

            // Incremento do placar
            if (isGoal && teamId) {
                if (teamId === 'home') {
                    updateData['homeTeam.score'] = (data.homeTeam.score || 0) + 1;
                } else if (teamId === 'away') {
                    updateData['awayTeam.score'] = (data.awayTeam.score || 0) + 1;
                }
            }

            transaction.update(matchRef, updateData);
        });
    } catch (e) {
        console.error("Falha ao registrar evento:", e);
        throw e;
    }
}

/**
 * 📋 ATUALIZAÇÃO DO ELENCO (OCR Import)
 */
export async function updateTeamRoster(teamSide, rosterData) {
    if (!db) return;
    const matchRef = doc(db, "matches", "live_match");
    
    const updatePath = teamSide === 'home' ? 'homeTeam' : 'awayTeam';
    await updateDoc(matchRef, {
        [`${updatePath}.name`]: rosterData.teamName || (teamSide === 'home' ? 'Mandante' : 'Visitante'),
        [`${updatePath}.players`]: rosterData.players || []
    });
}

/**
 * 🗺️ PERSISTÊNCIA DE COORDENADAS TÁTICAS
 */
export async function updatePlayerCoordinates(teamId, playerId, x, y) {
    if (!db) return;
    const matchRef = doc(db, "matches", "live_match");

    try {
        await runTransaction(db, async (transaction) => {
            const matchDoc = await transaction.get(matchRef);
            if (!matchDoc.exists()) return;

            const data = matchDoc.data();
            const teamKey = teamId === 'home' ? 'homeTeam' : 'awayTeam';
            const players = data[teamKey].players || [];
            
            const updatedPlayers = players.map(p => {
                if (p.id == playerId || p.number == playerId) {
                    return { ...p, coordX: x, coordY: y };
                }
                return p;
            });

            transaction.update(matchRef, {
                [`${teamKey}.players`]: updatedPlayers
            });
        });
    } catch (e) {
        console.error("Falha ao salvar coordenadas:", e);
    }
}

/**
 * ⏱️ CONTROLE DE CRONÔMETRO (Sincronização Atômica)
 */
export async function toggleMatchTimer(isPaused, timeElapsed) {
    if (!db) return;
    const matchRef = doc(db, "matches", "live_match");

    await updateDoc(matchRef, {
        isPaused: !isPaused,
        timeElapsed: timeElapsed,
        timerStartedAt: isPaused ? Date.now() : null
    });
}
