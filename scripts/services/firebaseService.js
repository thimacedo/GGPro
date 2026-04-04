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

// Configuração injetada via pipeline/ambiente
const firebaseConfig = {
    apiKey: "INSERIR_API_KEY",
    authDomain: "INSERIR_AUTH_DOMAIN",
    projectId: "INSERIR_PROJECT_ID",
    storageBucket: "INSERIR_STORAGE_BUCKET",
    messagingSenderId: "INSERIR_SENDER_ID",
    appId: "INSERIR_APP_ID"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Ativação da persistência offline (IndexedDB)
enableMultiTabIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
        // Múltiplas abas abertas, a persistência só pode ser habilitada em uma aba por vez.
        console.warn("Multi-tab persistence falhou: Múltiplas abas abertas simultaneamente.");
    } else if (err.code === 'unimplemented') {
        // O navegador atual não suporta todos os recursos necessários para a persistência.
        console.warn("O navegador não suporta persistência offline do Firestore.");
    }
});

const MATCH_DOC_REF = doc(db, 'matches', 'current_match');

/**
 * Inscreve a aplicação para ouvir mudanças em tempo real
 */
export function subscribeToMatch(callback) {
    return onSnapshot(MATCH_DOC_REF, (docSnap) => {
        if (docSnap.exists()) {
            callback(docSnap.data());
        } else {
            console.warn("Documento da partida não encontrado no Firestore. Certifique-se de que 'matches/current_match' existe.");
        }
    }, (error) => {
        console.error("Erro na sincronização do Firestore:", error);
    });
}

/**
 * Adiciona um novo evento à cronologia utilizando Transação Atômica.
 */
export async function addMatchEvent(newEvent, isGoal = false, teamId = null) {
    try {
        await runTransaction(db, async (transaction) => {
            const matchDoc = await transaction.get(MATCH_DOC_REF);
            if (!matchDoc.exists()) throw new Error("Documento 'matches/current_match' não existe!");

            const data = matchDoc.data();
            const currentEvents = data.events || [];
            
            const updates = { 
                events: [...currentEvents, newEvent] 
            };

            // Processamento atômico do placar
            if (isGoal && teamId) {
                if (teamId === 'home') {
                    updates['homeTeam.score'] = (data.homeTeam?.score || 0) + 1;
                } else if (teamId === 'away') {
                    updates['awayTeam.score'] = (data.awayTeam?.score || 0) + 1;
                }
            }

            transaction.update(MATCH_DOC_REF, updates);
        });
    } catch (error) {
        console.error("Falha na transação de evento:", error);
        throw error;
    }
}

/**
 * Atualiza o elenco de uma equipe após processamento de OCR
 */
export async function updateTeamRoster(teamSide, rosterData) {
    try {
        const fieldPrefix = teamSide === 'home' ? 'homeTeam' : 'awayTeam';
        await updateDoc(MATCH_DOC_REF, {
            [`${fieldPrefix}.players`]: rosterData.players || [],
            [`${fieldPrefix}.name`]: rosterData.teamName
        });
    } catch (error) {
        console.error("Erro ao sincronizar elenco:", error);
        throw error;
    }
}
