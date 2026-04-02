/**
 * 🔒 Central de Configuração do GGPro (Vanilla JS)
 */

export const getApiKey = () => {
  const localKey = typeof localStorage !== 'undefined' 
    ? (localStorage.getItem('VITE_GEMINI_API_KEY') || localStorage.getItem('GEMINI_API_KEY')) 
    : undefined;

  let key = localKey || '';
  let source = localKey ? 'LOCALSTORAGE' : 'NENHUMA';

  const cleanKey = key.toString().trim().replace(/^["']|["']$/g, '');

  console.log(`%c🔑 Detecção de IA: Origem=${source} | Valor=${cleanKey.substring(0, 4)}...`, "color: #3b82f6; font-weight: bold;");

  const placeholders = ['sua_chave_api_aqui', 'YOUR_API_KEY', 'undefined', 'null', ''];
  if (placeholders.includes(cleanKey.toLowerCase())) {
    console.error("❌ ERRO CRÍTICO: Chave de API é um placeholder ou está vazia!");
    throw new Error("INVALID_API_KEY");
  }
  
  return cleanKey;
};
