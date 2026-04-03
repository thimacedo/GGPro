/**
 * @fileoverview Serviço de persistência e sincronização em tempo real (Firebase Firestore)
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { 
    getFirestore, 
    doc, 
    onSnapshot, 
    runTransaction, 
    updateDoc 
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// Configuração injetada via pipeline/ambiente
// [ALERTA] Substitua pelos dados do seu console Firebase
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

// Referência fixa para a partida atual (Pode ser dinâmica via URL params no futuro)
const MATCH_DOC_REF = doc(db, 'matches', 'current_match');

/**
 * Inscreve a aplicação para ouvir mudanças em tempo real
 * @param {Function} callback Função executada a cada atualização de estado
 */
export function subscribeToMatch(callback) {
    return onSnapshot(MATCH_DOC_REF, (docSnap) => {
        if (docSnap.exists()) {
            callback(docSnap.data());
        } else {
            console.warn("Documento da partida não encontrado no Firestore. Certifique-se de que o documento 'matches/current_match' existe.");
        }
    }, (error) => {
        console.error("Erro na sincronização do Firestore:", error);
    });
}

/**
 * Adiciona um novo evento à cronologia utilizando Transação Atômica.
 * Evita Race Conditions caso dois operadores registrem eventos simultâneos.
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
