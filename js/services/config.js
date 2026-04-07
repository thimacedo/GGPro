/**
 * 🔑 MOTOR DE CONFIGURAÇÃO (Narrador Pro)
 * Centraliza chaves de API e credenciais de serviços (Groq & Firebase).
 */

export const getApiKey = () => {
  // Prioriza o localStorage para ambiente de produção estático (Vercel)
  const localKey = typeof localStorage !== 'undefined'
    ? (localStorage.getItem('VITE_GROQ_API_KEY') || localStorage.getItem('GROQ_API_KEY') || localStorage.getItem('groq_api_key'))
    : undefined;

  let key = '';
  let source = 'NENHUMA';

  if (localKey) {
    key = localKey;
    source = 'LOCALSTORAGE';
  }

  const cleanKey = key.toString().trim().replace(/^["']|["']$/g, '');

  if (source !== 'NENHUMA') console.log("%c🔑 Groq AI: Chave carregada.", "color: #3b82f6; font-weight: bold;");

  const placeholders = ['sua_chave_api_aqui', 'YOUR_API_KEY', 'undefined', 'null', ''];
  if (!cleanKey || placeholders.includes(cleanKey.toLowerCase())) {
    console.warn("⚠️ API KEY GS: Chave não configurada no Storage.");
    return null;
  }

  return cleanKey;
};

export const getFirebaseConfig = () => {
    const defaultPlaceholder = "INSERIR_VALOR";
    
    // Tenta carregar do localStorage para permitir configuração sem redeploy
    const config = {
        apiKey: localStorage.getItem('FB_API_KEY') || defaultPlaceholder,
        authDomain: localStorage.getItem('FB_AUTH_DOMAIN') || defaultPlaceholder,
        projectId: localStorage.getItem('FB_PROJECT_ID') || defaultPlaceholder,
        storageBucket: localStorage.getItem('FB_STORAGE_BUCKET') || defaultPlaceholder,
        messagingSenderId: localStorage.getItem('FB_SENDER_ID') || defaultPlaceholder,
        appId: localStorage.getItem('FB_APP_ID') || defaultPlaceholder
    };

    const isConfigured = Object.values(config).every(val => val !== defaultPlaceholder);
    
    if (!isConfigured) {
        console.warn("⚠️ Firebase: Configuração incompleta detectada.");
    } else {
        console.log("%c🔥 Firebase: Configuração detectada via LocalStorage.", "color: #f59e0b; font-weight: bold;");
    }

    return config;
};