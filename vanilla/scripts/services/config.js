// Configuração do Narrador Pro

export const getApiKey = () => {
  const localKey = typeof localStorage !== 'undefined' 
    ? (localStorage.getItem('VITE_GEMINI_API_KEY') || localStorage.getItem('GEMINI_API_KEY'))
    : undefined;

  let key = '';
  let source = 'NENHUMA';

  if (localKey) { key = localKey; source = 'LOCALSTORAGE'; }

  const cleanKey = key.toString().trim().replace(/^["']|["']$/g, '');

  console.log(`%c🔑 Detecção de IA: Origem=${source} | Valor=${cleanKey.substring(0, 4)}...`, "color: #3b82f6; font-weight: bold;");

  const placeholders = ['sua_chave_api_aqui', 'YOUR_API_KEY', 'undefined', 'null', ''];
  if (placeholders.includes(cleanKey.toLowerCase())) {
    console.error("❌ ERRO CRÍTICO: Chave de API é um placeholder ou está vazia!");
    throw new Error("INVALID_API_KEY");
  }
  
  return cleanKey;
};