import { createWorker, type Worker } from 'tesseract.js';

export interface OCRParsedPlayer {
  name: string;
  number: number;
  position: string;
  isStarter: boolean;
}

export interface OCRParsedResult {
  rawText: string;
  engine: string;
  homeTeam: string;
  awayTeam: string;
  competition: string;
  category: string;
  stadium: string;
  referee: string;
  date: string;
  time: string;
  homeCoach: string;
  awayCoach: string;
  homePlayers: OCRParsedPlayer[];
  awayPlayers: OCRParsedPlayer[];
}

// ==========================================
// AI PARSE PROMPT — Football-aware
// ==========================================

const AI_PARSE_PROMPT = `Você é um especialista em ler SÚMULAS DE FUTEBOL. Analise o texto OCR abaixo de uma súmula de futebol e extraia TODOS os dados estruturados.

REGRAS DE OURO DO FUTEBOL:
- Cada time tem EXATAMENTE 11 titulares e 0-12 reservas.
- Os primeiros 11 jogadores listados por número são TITULARES por padrão.
- Os demais são RESERVAS (banco).

REGRAS DE POSIÇÃO POR NÚMERO (convenção brasileira):
- #1 = GK (goleiro), sempre titular
- #2-4 = ZAG ou LD/LE (defensores)
- #5-6 = VOL ou LE (volantes/laterais)
- #7 = MD ou PD (meia/ponta)
- #8 = MC (meia central)
- #9 = ATA (atacante/centroavante)
- #10 = MEI (meia ofensivo)
- #11 = PE ou PD (ponta)
- Use: GK, ZAG, LD, LE, VOL, MC, MD, ME, MEI, ATA, PD, PE

REGRAS CRÍTICAS DO LAYOUT DA SÚMULA:
- A COLUNA DA ESQUERDA = TIME DA CASA (mandante)
- A COLUNA DA DIREITA = TIME VISITANTE (fora)
- Marcadores: "T", "(T)", "*", "•", "►" antes/depois do nome = TITULAR
- Se não houver marcadores, os primeiros 11 por número = TITULARES
- Ordene: titulares primeiro (número crescente), depois reservas (número crescente)

REGRAS DE NOMES DOS ATLETAS — REGRA #1 (ABSOLUTA):
!!!
A REGRA MAIS IMPORTANTE: QUANDO A SÚMULA TIVER UMA COLUNA DE "APELIDO", "NOME DE GUERRA", "NOME CURTO" OU "ALCUNHA", USE EXCLUSIVAMENTE ESSA COLUNA. IGNORE COMPLETAMENTE A COLUNA DE NOME COMPLETO.

Isso é uma ORDEM. Jamais use o nome completo quando houver apelido disponível.

EXEMPLOS DE QUANDO HÁ COLUNA DE APELIDO:
  Coluna "Nome Completo": "João Pedro da Silva Ferreira"  |  Coluna "Apelido": "Jota"
  → Resultado: "Jota"  ✅   (NUNCA "João" ou "João Pedro")

  Coluna "Nome": "Carlos Eduardo Santos"  |  Coluna "Apelido": "Dudu"
  → Resultado: "Dudu"  ✅   (NUNCA "Carlos" ou "Carlos Eduardo")

  Coluna "Nome": "José Roberto da Silva"  |  Coluna "Alcunha": "Zé Roberto"
  → Resultado: "Zé Roberto"  ✅

QUANDO NÃO HÁ COLUNA DE APELIDO (nome completo apenas):
- Se houver apelido entre parênteses no próprio nome → use o apelido: "João Pedro da Silva (Jota)" → "Jota"
- Se houver nome completo sem apelido → use APENAS o PRIMEIRO NOME: "Carlos Eduardo Santos Silva" → "Carlos"
- EXCEÇÃO: se no mesmo time houver dois atletas com o mesmo primeiro nome, use primeiro E segundo nome:
  - "João Pedro da Silva" e "João Marcos Oliveira" → "João Pedro" e "João Marcos"
- Nunca use preposições: "Pedro de Almeida" → "Pedro"
- Nomes compostos conhecidos são UM nome: "Jean Carlos", "Luiz Fernando", "Anderson Lopes"
- Remova marcadores de titularidade: "João T" → "João", "Carlos *" → "Carlos"
- Se o nome for muito curto (1 letra) ou inválido, coloque o nome completo original
!!!

INFORMAÇÕES DE CONTEXTO (extraia se existirem):
- Competição / Campeonato / Torneio
- Categoria (Sub-17, Sub-20, Profissional, Master, Amador, etc.)
- Estádio / Arena / Local
- Árbitro
- Data e Hora
- Técnico/Mister/Coach de cada time
- Qualquer outra informação relevante (rodada, grupo, etc.)

Responda APENAS com JSON válido, sem nenhum texto adicional ou markdown fences:
{
  "homeTeam": "nome do time mandante",
  "awayTeam": "nome do time visitante",
  "competition": "nome da competição ou string vazia",
  "category": "categoria ou string vazia",
  "stadium": "estádio ou string vazia",
  "referee": "árbitro ou string vazia",
  "date": "data formatada (dd/mm/aaaa) ou string vazia",
  "time": "horário (hh:mm) ou string vazia",
  "homeCoach": "técnico mandante ou string vazia",
  "awayCoach": "técnico visitante ou string vazia",
  "homePlayers": [
    {"number": 1, "name": "apelido", "position": "GK", "isStarter": true}
  ],
  "awayPlayers": [
    {"number": 1, "name": "apelido", "position": "GK", "isStarter": true}
  ]
}

TEXTO OCR DA SÚMULA:
`;

// ==========================================
// HELPERS
// ==========================================

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function resizeImageToBlob(file: File | Blob, maxPx: number, quality: number, maxSizeBytes: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      try {
        const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d')!;
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(url);
        canvas.toBlob(blob => {
          if (blob && blob.size <= maxSizeBytes) {
            resolve(blob);
          } else if (quality > 0.3) {
            canvas.toBlob(blob2 => blob2 ? resolve(blob2) : reject(new Error('Resize failed')), 'image/jpeg', quality - 0.2);
          } else {
            resolve(blob || new Blob());
          }
        }, 'image/jpeg', quality);
      } catch (e) { URL.revokeObjectURL(url); resolve(file); }
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Image load failed')); };
    img.src = url;
  });
}

// ==========================================
// ENGINE 1: Puter.js + Mistral OCR (AI)
// ==========================================

async function tryMistralOCR(file: File): Promise<{ text: string; engine: string }> {
  const dataUrl = await fileToDataUrl(file);
  const puter = (window as any).puter;
  if (!puter?.ai?.img2txt) throw new Error('Puter.js não carregado');

  const text = await puter.ai.img2txt({
    source: dataUrl,
    provider: 'mistral',
    model: 'mistral-ocr-latest',
  });

  if (!text || typeof text !== 'string' || !text.trim()) throw new Error('Mistral OCR: texto vazio');
  return { text: text.trim(), engine: 'Mistral OCR (IA)' };
}

// ==========================================
// ENGINE 2: Puter.js + AWS Textract (AI)
// ==========================================

async function tryTextractOCR(file: File): Promise<{ text: string; engine: string }> {
  const dataUrl = await fileToDataUrl(file);
  const puter = (window as any).puter;
  if (!puter?.ai?.img2txt) throw new Error('Puter.js não carregado');

  const text = await puter.ai.img2txt(dataUrl);
  if (!text || typeof text !== 'string' || !text.trim()) throw new Error('Textract: texto vazio');
  return { text: text.trim(), engine: 'AWS Textract (IA)' };
}

// ==========================================
// ENGINE 3: OCR.space API
// ==========================================

async function tryOCRSpace(file: File): Promise<{ text: string; engine: string }> {
  const resized = await resizeImageToBlob(file, 2000, 0.75, 900 * 1024);
  const formData = new FormData();
  formData.append('file', resized, 'sumula.jpg');
  formData.append('language', 'por');
  formData.append('isTable', 'true');
  formData.append('detectOrientation', 'true');
  formData.append('scale', 'true');
  formData.append('OCREngine', '2');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  try {
    const response = await fetch('https://api.ocr.space/parse/image', {
      method: 'POST',
      headers: { 'apikey': 'helloworld' },
      body: formData,
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const result = await response.json();
    if (result.IsErroredOnProcessing) throw new Error(result.ErrorMessage || 'Erro');
    const parsedResults = result.ParsedResults;
    if (!parsedResults || parsedResults.length === 0) throw new Error('Sem resultados');
    const text = parsedResults[0].ParsedText || '';
    if (!text.trim()) throw new Error('Texto vazio');
    return { text, engine: 'OCR.space' };
  } catch (err) {
    clearTimeout(timeout);
    throw err;
  }
}

// ==========================================
// ENGINE 4: Tesseract.js (offline)
// ==========================================

let workerInstance: Worker | null = null;
let workerReady = false;
let workerInitPromise: Promise<Worker> | null = null;

async function getTesseractWorker(onProgress?: (p: number) => void): Promise<Worker> {
  if (workerInstance && workerReady) return workerInstance;
  if (workerInitPromise) return workerInitPromise;
  workerInitPromise = (async () => {
    const worker = await createWorker('por+eng', 1, {
      logger: (m: any) => {
        if (m.status === 'recognizing text') onProgress?.(20 + Math.round((m.progress ?? 0) * 70));
      },
    });
    await worker.setParameters({ tessedit_pageseg_mode: '6' as any, preserve_interword_spaces: '1' });
    workerInstance = worker;
    workerReady = true;
    return worker;
  })();
  return workerInitPromise;
}

export async function terminateWorker(): Promise<void> {
  if (workerInstance) {
    try { await workerInstance.terminate(); } catch {}
    workerInstance = null;
    workerReady = false;
    workerInitPromise = null;
  }
}

function preprocessForTesseract(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d')!;
        const MIN_SIZE = 3500;
        const maxDim = Math.max(img.width, img.height);
        const scale = maxDim < MIN_SIZE ? MIN_SIZE / maxDim : Math.min(1.3, 4000 / maxDim);
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        canvas.width = w;
        canvas.height = h;
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        const imageData = ctx.getImageData(0, 0, w, h);
        const d = imageData.data;
        for (let i = 0; i < d.length; i += 4) {
          const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
          const adjusted = Math.min(255, Math.max(0, ((gray - 128) * 1.4) + 128));
          d[i] = d[i + 1] = d[i + 2] = adjusted;
        }
        ctx.putImageData(imageData, 0, 0);
        URL.revokeObjectURL(url);
        canvas.toBlob(blob => {
          if (blob) resolve(URL.createObjectURL(blob));
          else reject(new Error('Canvas export failed'));
        }, 'image/png');
      } catch (e) { URL.revokeObjectURL(url); resolve(url); }
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Image load failed')); };
    img.src = url;
  });
}

async function tryTesseract(file: File, onProgress?: (p: number) => void): Promise<{ text: string; engine: string }> {
  onProgress?.(5);
  const processedUrl = await preprocessForTesseract(file);
  onProgress?.(10);
  const worker = await getTesseractWorker(onProgress);
  onProgress?.(25);
  const { data: { text } } = await worker.recognize(processedUrl);
  URL.revokeObjectURL(processedUrl);
  if (!text || !text.trim()) throw new Error('Tesseract: texto vazio');
  return { text, engine: 'Tesseract.js (offline)' };
}

// ==========================================
// TEXT CLEANUP
// ==========================================

function cleanupOCRText(text: string): string {
  let clean = text;
  clean = clean.split('\n').map(line => {
    const stripped = line.replace(/[\s.\-|_=+*#<>{}[\]\\/\(\)]/g, '');
    if (stripped.length === 0) return '';
    const alnumCount = (line.match(/[a-zA-ZÀ-ÿ0-9]/g) || []).length;
    if (alnumCount < line.length * 0.15 && line.length > 10) return '';
    return line;
  }).join('\n');
  clean = clean.replace(/[ \t]{4,}/g, '   ');
  clean = clean.replace(/^[|{}≠≈∞§±°†‡¤¦©®™]+$/gm, '');
  return clean.trim();
}

// ==========================================
// AI PARSER — Puter.js GPT-4o-mini (free)
// ==========================================

async function aiParseOCRText(rawText: string): Promise<Omit<OCRParsedResult, 'rawText' | 'engine'> | null> {
  const puter = (window as any).puter;
  if (!puter?.ai?.chat) return null;

  try {
    const prompt = AI_PARSE_PROMPT + rawText;
    const response = await puter.ai.chat(prompt, { model: 'gpt-4o-mini' });
    const text = typeof response === 'string' ? response : response?.message?.content || response?.text || String(response);

    let jsonStr = text.trim();
    const fenceMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenceMatch) jsonStr = fenceMatch[1].trim();

    const parsed = JSON.parse(jsonStr);
    return normalizeParsedResult(parsed, rawText);
  } catch (err) {
    console.warn('[OCR] AI parsing falhou:', err);
    return null;
  }
}

// ==========================================
// NORMALIZATION — Football rules
// ==========================================

function normalizeParsedResult(data: any, rawText?: string): Omit<OCRParsedResult, 'rawText' | 'engine'> {
  const homePlayers = normalizePlayersWithFootballRules(data.homePlayers, rawText);
  const awayPlayers = normalizePlayersWithFootballRules(data.awayPlayers, rawText);

  // Resolve duplicate names within each team using original AI names
  const homeRaws = new Map<number, string>();
  const awayRaws = new Map<number, string>();
  (data.homePlayers || []).forEach((p: any) => homeRaws.set(p.number, p.name || `Jogador ${p.number}`));
  (data.awayPlayers || []).forEach((p: any) => awayRaws.set(p.number, p.name || `Jogador ${p.number}`));
  resolveDuplicatesWithOriginalNames(homePlayers, homeRaws);
  resolveDuplicatesWithOriginalNames(awayPlayers, awayRaws);

  return {
    homeTeam: String(data.homeTeam || ''),
    awayTeam: String(data.awayTeam || ''),
    competition: String(data.competition || ''),
    category: String(data.category || ''),
    stadium: String(data.stadium || ''),
    referee: String(data.referee || ''),
    date: String(data.date || ''),
    time: String(data.time || ''),
    homeCoach: String(data.homeCoach || ''),
    awayCoach: String(data.awayCoach || ''),
    homePlayers,
    awayPlayers,
  };
}

// ==========================================
// NAME VALIDATION — Detect garbage names
// ==========================================

// Common Portuguese first names for validation
const COMMON_FIRST_NAMES = new Set([
  // Masculine
  'antonio','artur','arthur','bruno','carlos','cesar','césar','claudio','cláudio','cristiano',
  'daniel','danilo','davi','diego','diogo','douglas','eduardo','eli','elias','emerson','émerson',
  'fabricio','fabrício','felipe','fernando','francisco','gabriel','gelson','gilberto','gustavo',
  'heitor','henrique','igor','isac','isaque','ivan','jailton','jean','joao','joão','jonas','jorge',
  'josé','jose','joao','joão','julian','juliano','julio','júlio','kleber','kléber','lazaro','lázaro',
  'leandro','leonardo','lucas','luis','luís','luiz','marcelo','marcio','márcio','marcos','mateus',
  'matheus','mauricio','maurício','mauro','michael','miguel','murilo','nathan','nicolas','oscar',
  'pablo','paulo','pedro','rafael','renan','renato','ricardo','roberto','rodolfo','rodrigo',
  'samuel','sergio','sérgio','thales','thiago','tiago','vagner','victor','vinicius','vitor',
  'wanderson','wesley','willian','yan','yuri',
  // Feminine
  'alice','amanda','ana','beatriz','brenda','bruna','camila','carla','carolina','cintia',
  'clara','daniela','eduarda','elaine','eliana','fernanda','gabriela','giseli','heloisa',
  'isabela','jessica','julia','juliana','lara','laura','letícia','leticia','livia','livía',
  'lorena','luciana','luana','luisa','marcia','maria','marieli','marina','mayara','melissa',
  'natalia','nathalia','patricia','raissa','rebeca','renata','roberta','sabrina','sandra',
  'sofia','stephanie','talia','talita','tâmara','vanessa','veronica','vitória','vitoria',
  // Common nicknames
  'zé','ze','duda','dudu','dudu','lulinha','caio','kiko','neto','junior','jr','netinho',
  'guto','tiagao','kaka','kaká','didi','dede','dedê','pipi','fifi','juju','lulu',
]);

// Check if name looks like garbage OCR output
function isPlausibleName(name: string): { valid: boolean; reason?: string } {
  const n = name.trim();
  
  // Too short (less than 2 chars)
  if (n.length < 2) return { valid: false, reason: 'Nome muito curto' };
  
  // Too long (more than 30 chars — likely concatenated text)
  if (n.length > 30) return { valid: false, reason: 'Nome muito longo' };
  
  // Check for common OCR garbage patterns
  const garbagePatterns = [
    /^[BCDFGHJKLMNPQRSTVWXYZ]{3,}$/i,  // All consonants
    /^[AEIOU]{3,}$/i,                    // All vowels
    /^[WXQZ]+$/i,                        // Only weird letters
    /[^\wÀ-ÿ\s\-']/,                     // Weird symbols
    /^(MAN|WIT|ORO|SES|NWS|ISE|ISES)$/i, // Known garbage from user report
  ];
  
  for (const pattern of garbagePatterns) {
    if (pattern.test(n)) {
      return { valid: false, reason: 'Padrão de lixo OCR detectado' };
    }
  }
  
  // Check if it's a known first name or reasonable nickname
  const words = n.toLowerCase().split(/[\s\-]+/);
  const firstWord = words[0];
  
  // If first word is a known name, it's probably valid
  if (COMMON_FIRST_NAMES.has(firstWord)) {
    return { valid: true };
  }
  
  // If it has 2-3 words and each is reasonable length, probably valid
  if (words.length >= 2 && words.length <= 4) {
    const allReasonable = words.every(w => w.length >= 2 && w.length <= 15);
    if (allReasonable) return { valid: true };
  }
  
  // If mostly consonants without vowels, probably garbage
  const vowels = (n.match(/[aeiouà-ÿ]/gi) || []).length;
  const consonants = (n.match(/[bcdfghjklmnpqrstvwxyz]/gi) || []).length;
  if (consonants > 0 && vowels / consonants < 0.2) {
    return { valid: false, reason: 'Poucas vogais — provável erro OCR' };
  }
  
  return { valid: true };
}

// Try to recover a valid name from garbage using reference text
function tryRecoverName(garbage: string, referenceText: string): string | null {
  // Try to find a similar name in the reference text
  const refWords = referenceText.split(/[\s\n,;]+/);
  
  // Look for words that start with similar letters
  const firstChar = garbage.charAt(0).toUpperCase();
  const candidates = refWords.filter(w => 
    w.length >= 3 && 
    w.length <= 20 &&
    w.charAt(0).toUpperCase() === firstChar &&
    /[a-zA-ZÀ-ÿ]/.test(w)
  );
  
  // Return the first plausible candidate
  for (const candidate of candidates) {
    const { valid } = isPlausibleName(candidate);
    if (valid) return candidate;
  }
  
  return null;
}

const PREPOSITIONS = /^(?:da|de|do|das|dos|di|du|del|della|van|von|le|la|el|al|bin|ben|e|y)\s/i;
const COMPOUND_FIRST_NAMES: Record<string, string[]> = {
  'jean': ['carlos', 'paulo', 'lucas', 'pierre', 'philipe'],
  'luiz': ['fernando', 'carlos', 'gustavo', 'felipe', 'henrique'],
  'anderson': ['lopes', 'carlos', 'silva', 'souza'],
  'joão': ['pedro', 'paulo', 'lucas', 'marcos', 'vitor', 'gabriel', 'miguel', 'carlos'],
  'marcos': ['antonio', 'vinicius', 'felipe', 'gabriel', 'aurelio'],
  'carlos': ['eduardo', 'alberto', 'henrique', 'augusto'],
  'jose': ['carlos', 'eduardo', 'maria', 'antonio'],
  'josé': ['carlos', 'eduardo', 'maria', 'antonio', 'roberto', 'paulo'],
  'pedro': ['henrique', 'lucas', 'paulo', 'gabriel', 'miguel'],
  'luis': ['fernando', 'carlos', 'gustavo', 'felipe', 'henrique'],
  'rafael': ['silva', 'santos', 'costa', 'almeida'],
  'felipe': ['gabriel', 'augusto', 'santos'],
  'gustavo': ['henrique', 'silva', 'santos'],
  'zé': ['roberto', 'carlos', 'eduardo', 'maria', 'luis', 'paulo', 'marcos', 'pedro', 'rafael', 'vitor', 'do', 'da'],
  'danilo': ['silva', 'santos', 'oliveira', 'costa'],
  'bruno': ['henrique', 'silva', 'santos', 'costa', 'gomes'],
  'diego': ['souza', 'santos', 'silva', 'costa', 'oliveira'],
  'matheus': ['henrique', 'silva', 'santos', 'costa', 'cunha'],
  'mateus': ['henrique', 'silva', 'santos', 'costa'],
  'gabriel': ['silva', 'santos', 'jesus', 'barbosa', 'oliveira'],
  'vinicius': ['silva', 'santos', 'junior', 'oliveira'],
  'willian': ['silva', 'santos', 'oliveira'],
  'leandro': ['silva', 'santos', 'costa', 'pereira'],
};

function isCompoundFirstName(first: string, second: string): boolean {
  const lower = first.toLowerCase();
  const compounds = COMPOUND_FIRST_NAMES[lower];
  if (compounds && compounds.includes(second.toLowerCase())) return true;
  return false;
}

function shortenName(fullName: string): string {
  let name = fullName.trim();
  
  // 1. Extract nickname in parentheses: "João Pedro (Jota)" → "Jota"
  const parenMatch = name.match(/\(([^)]+)\)/);
  if (parenMatch) {
    const nick = parenMatch[1].trim();
    if (nick.length >= 2 && nick.length <= 20) return nick;
  }
  name = name.replace(/\s*\([^)]+\)/g, '').trim();

  // 2. Remove starter markers: "João T", "Carlos *", "Pedro •"
  name = name.replace(/\s*[T\*\.\-–—•►]+$/, '').replace(/^\s*[\*\.\-–—•►]+\s*/, '').trim();

  // 3. Remove garbage chars
  name = name.replace(/[|{}\[\]\\]/g, '').replace(/\s+/g, ' ').trim();
  
  if (!name || name.length < 2) return name;

  // 4. Remove prepositions in the middle: "Pedro de Almeida Costa" → "Pedro Almeida Costa"
  const parts = name.split(/\s+/);
  const withoutPreps: string[] = [];
  for (let i = 0; i < parts.length; i++) {
    if (PREPOSITIONS.test(parts[i]) && i > 0 && i < parts.length - 1) continue;
    withoutPreps.push(parts[i]);
  }
  name = withoutPreps.join(' ');

  // 5. If only 1 word, return as-is
  const words = name.split(/\s+/);
  if (words.length <= 1) return name;

  // 6. Check if first two words form a compound name: "Jean Carlos" → keep both
  if (words.length >= 2 && isCompoundFirstName(words[0], words[1])) {
    return words[0] + ' ' + words[1];
  }

  // 7. Default: first name only
  return words[0];
}

function normalizePlayersWithFootballRules(players: any, rawText?: string): OCRParsedPlayer[] {
  if (!Array.isArray(players) || players.length === 0) return [];

  // First pass: extract raw names before shortening, to use for disambiguation
  const rawNames = new Map<number, string>();
  const fullText = rawText || '';
  
  const cleaned = players
    .filter((p: any) => p && typeof p.number === 'number' && p.number >= 1 && p.number <= 99)
    .map((p: any) => {
      const rawName = String(p.name || `Jogador ${p.number}`).trim();
      rawNames.set(p.number, rawName);
      
      // Smart shortening: if AI already provided a short name (apelido), preserve it
      const wordCount = rawName.split(/\s+/).length;
      let name: string;
      
      if (wordCount <= 2 && rawName.length <= 20) {
        // Already a short name / apelido — validate first
        const { valid } = isPlausibleName(rawName);
        if (valid) {
          // Clean markers but preserve name
          name = rawName.replace(/[.*•►\-–—]/g, '').replace(/\s+/g, ' ').trim();
        } else {
          // Garbage detected — try to recover from full name if available
          const recovered = tryRecoverName(rawName, fullText);
          name = recovered || `Jogador ${p.number}`;
        }
      } else {
        // Long name (3+ words) — needs shortening
        name = shortenName(rawName);
      }
      
      // Final validation
      if (!name || name.length < 2) name = `Jogador ${p.number}`;
      
      // Double-check if the shortened name is garbage
      const { valid: finalValid } = isPlausibleName(name);
      if (!finalValid && fullText) {
        const recovered = tryRecoverName(name, fullText);
        if (recovered) name = recovered;
      }

      const position = normalizePosition(String(p.position || ''));
      return { number: p.number, name, position, isStarter: !!p.isStarter };
    })
    .sort((a: OCRParsedPlayer, b: OCRParsedPlayer) => a.number - b.number);

  // Resolve duplicate first names using original full names
  resolveDuplicatesWithOriginalNames(cleaned, rawNames);

  // If no starters marked, apply football rules: first 11 by number = starters
  const hasExplicitStarters = cleaned.some((p: OCRParsedPlayer) => p.isStarter === false);
  if (!hasExplicitStarters) {
    cleaned.forEach((p: OCRParsedPlayer, i: number) => {
      p.isStarter = i < 11;
    });
  } else {
    let starterCount = 0;
    cleaned.forEach((p: OCRParsedPlayer) => {
      if (p.isStarter) {
        starterCount++;
        if (starterCount > 11) p.isStarter = false;
      }
    });
    if (starterCount < 11 && cleaned.length > starterCount) {
      for (const p of cleaned) {
        if (starterCount >= 11) break;
        if (!p.isStarter) {
          p.isStarter = true;
          starterCount++;
        }
      }
    }
  }

  // Re-sort: starters first (by number), then reserves (by number)
  return cleaned.sort((a: OCRParsedPlayer, b: OCRParsedPlayer) => {
    if (a.isStarter !== b.isStarter) return a.isStarter ? -1 : 1;
    return a.number - b.number;
  });
}

function resolveDuplicatesWithOriginalNames(players: OCRParsedPlayer[], rawNames: Map<number, string>): void {
  // Group by current display name (lowercase)
  const nameMap = new Map<string, Array<{ player: OCRParsedPlayer; raw: string }>>();
  
  for (const p of players) {
    const key = p.name.toLowerCase();
    const raw = rawNames.get(p.number) || p.name;
    if (!nameMap.has(key)) nameMap.set(key, []);
    nameMap.get(key)!.push({ player: p, raw });
  }

  for (const [, group] of nameMap) {
    if (group.length <= 1) continue;
    
    // Multiple players with same shortened name — expand each to first + second word from raw
    const expandedNames = new Map<number, string>();
    
    for (const entry of group) {
      const raw = entry.raw;
      // Remove parens first for raw extraction
      const cleanRaw = raw.replace(/\s*\([^)]+\)/g, '').replace(/[|{}\[\]\\]/g, '').trim();
      const words = cleanRaw.split(/\s+/);
      
      // Filter prepositions
      const cleanWords: string[] = [];
      for (let i = 0; i < words.length; i++) {
        if (/^(da|de|do|das|dos|di|du|del|della|van|von|le|la|el|al|bin|ben|e|y)$/i.test(words[i]) && i > 0) continue;
        cleanWords.push(words[i]);
      }
      
      if (cleanWords.length >= 2) {
        // Use first + second name
        const expanded = cleanWords[0] + ' ' + cleanWords[1];
        expandedNames.set(entry.player.number, expanded);
      }
    }
    
    // Apply expanded names
    for (const entry of group) {
      const expanded = expandedNames.get(entry.player.number);
      if (expanded) entry.player.name = expanded;
    }
    
    // Check if still duplicates
    const finalNames = group.map(e => e.player.name.toLowerCase());
    const stillDuplicate = finalNames.some((n, i) => finalNames.indexOf(n) !== i);
    if (stillDuplicate) {
      // Last resort: append number
      group.forEach((entry) => {
        const sameNameCount = group.filter(e => e.player.name.toLowerCase() === entry.player.name.toLowerCase()).length;
        if (sameNameCount > 1) {
          entry.player.name = entry.player.name + ' #' + entry.player.number;
        }
      });
    }
  }
}

function normalizePosition(pos: string): string {
  const posMap: Record<string, string> = {
    'goleiro': 'GK', 'gol': 'GK', 'gk': 'GK',
    'zagueiro': 'ZAG', 'zag': 'ZAG', 'zagueiro central': 'ZAG', 'cb': 'ZAG',
    'lateral direito': 'LD', 'ld': 'LD', 'rb': 'LD', 'lateral': 'LD',
    'lateral esquerdo': 'LE', 'le': 'LE', 'lb': 'LE',
    'volante': 'VOL', 'vol': 'VOL', 'cdm': 'VOL', 'líbero': 'VOL', 'libero': 'VOL',
    'meia': 'MC', 'meia direita': 'MD', 'meia esquerda': 'ME',
    'mc': 'MC', 'md': 'MD', 'me': 'ME', 'mei': 'MEI', 'meia ofensiva': 'MEI', 'cam': 'MEI',
    'atacante': 'ATA', 'ata': 'ATA', 'cf': 'ATA', 'st': 'ATA', 'centroavante': 'ATA',
    'ponta direita': 'PD', 'pd': 'PD', 'rw': 'PD', 'ponta': 'PD',
    'ponta esquerda': 'PE', 'pe': 'PE', 'lw': 'PE',
  };
  const lower = pos.toLowerCase().trim();
  return posMap[lower] || (pos.length >= 2 && pos.length <= 4 ? pos.toUpperCase() : '');
}

function guessPositionByNumber(num: number): string {
  if (num === 1) return 'GK';
  if (num <= 4) return 'ZAG';
  if (num === 5 || num === 6) return 'VOL';
  if (num === 7) return 'PD';
  if (num === 8) return 'MC';
  if (num === 9) return 'ATA';
  if (num === 10) return 'MEI';
  if (num === 11) return 'PE';
  if (num === 12) return 'GK';
  if (num <= 15) return 'ZAG';
  if (num <= 18) return 'VOL';
  if (num <= 22) return 'MC';
  return 'ATA';
}

// ==========================================
// REGEX FALLBACK PARSER (improved)
// ==========================================

function regexParseOCRText(text: string): Omit<OCRParsedResult, 'rawText' | 'engine'> {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  let homeTeam = '';
  let awayTeam = '';
  let competition = '';
  let category = '';
  let stadium = '';
  let referee = '';
  let date = '';
  let time = '';
  let homeCoach = '';
  let awayCoach = '';

  const homePlayers: OCRParsedPlayer[] = [];
  const awayPlayers: OCRParsedPlayer[] = [];
  let currentTeam: 'home' | 'away' | null = null;
  let vsLineFound = false;

  for (const line of lines) {
    const lower = line.toLowerCase();
    if (/competi[çc][aã]o|campeonato|torneio/i.test(lower)) {
      const val = line.split(/[:\-–—]/).slice(1).join(':').trim();
      if (val) competition = val;
    }
    if (/categor(?:ia|y)|divis[ãa]o|s[eé]rie|sub[-\s]?\d/i.test(lower)) {
      const val = line.split(/[:\-–—]/).slice(1).join(':').trim();
      if (val) category = val;
    }
    if (/est[aá]dio|arena|local/i.test(lower)) {
      const val = line.split(/[:\-–—]/).slice(1).join(':').trim();
      if (val) stadium = val;
    }
    if (/[aá]rbitro|referee|arb[.\s]/i.test(lower)) {
      const val = line.split(/[:\-–—]/).slice(1).join(':').trim();
      if (val) referee = val;
    }
    if (/^(?:data|date|dia)[:\s]/i.test(lower) && !/database|nascimento/i.test(lower)) {
      const val = line.split(/[:\-–—]/).slice(1).join(':').trim();
      if (val && val.length > 2) date = val;
    }
    if (/^(?:hora|hor[aá]rio|time)[:\s]/i.test(lower)) {
      const val = line.split(/[:\-–—]/).slice(1).join(':').trim();
      if (val) time = val;
    }
    if (/t[eé]cnico|mister|coach|treinador/i.test(lower)) {
      const val = line.split(/[:\-–—]/).slice(1).join(':').trim();
      if (val) {
        if (/casa|mandante|home/i.test(lower)) homeCoach = val;
        else if (/fora|visitante|away/i.test(lower)) awayCoach = val;
        else if (!homeCoach) homeCoach = val;
        else awayCoach = val;
      }
    }
  }

  const columnSep = detectColumnSeparator(lines);
  if (columnSep) {
    const leftLines: string[] = [];
    const rightLines: string[] = [];
    for (const line of lines) {
      if (columnSep === '|') {
        const parts = line.split('|').map(p => p.trim()).filter(Boolean);
        if (parts.length >= 2) { leftLines.push(parts[0]); rightLines.push(parts[1]); }
        else leftLines.push(line);
      } else {
        const match = line.match(/^(.*?)\s{3,}(.*)$/);
        if (match && match[1].trim().length > 0 && match[2].trim().length > 0) {
          leftLines.push(match[1].trim());
          rightLines.push(match[2].trim());
        } else {
          leftLines.push(line);
        }
      }
    }
    const leftResult = parseSingleColumn(leftLines);
    homeTeam = leftResult.team || homeTeam;
    homePlayers.push(...leftResult.players);
    if (!homeCoach && leftResult.coach) homeCoach = leftResult.coach;

    const rightResult = parseSingleColumn(rightLines);
    awayTeam = rightResult.team || awayTeam;
    awayPlayers.push(...rightResult.players);
    if (!awayCoach && rightResult.coach) awayCoach = rightResult.coach;

    return normalizeFinalResult({
      homeTeam, awayTeam, competition, category, stadium, referee, date, time,
      homeCoach, awayCoach, homePlayers: dedup(homePlayers), awayPlayers: dedup(awayPlayers),
    });
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lower = line.toLowerCase();
    if (/competi[çc][aã]o|categor|est[aá]dio|[aá]rbitro|^(?:data|hora)[:\s]/i.test(lower)) continue;

    const vsMatch = line.match(/^(.+?)\s+[xX×]\s+(.+)$/) ||
                    line.match(/^(.+?)\s+vs\.?\s+(.+)$/i) ||
                    line.match(/^(.+?)\s+VERSUS\s+(.+)$/i);
    if (vsMatch && !vsLineFound) {
      homeTeam = cleanTeamName(vsMatch[1]);
      awayTeam = cleanTeamName(vsMatch[2]);
      vsLineFound = true;
      currentTeam = 'home';
      continue;
    }

    if (/titular|escalacao|escala[cç][aã]o|equipe|time\s*casa|mandante/i.test(lower)) { currentTeam = 'home'; continue; }
    if (/reserva|banco|time\s*fora|visitante/i.test(lower) && !/t[eé]cnico/i.test(lower)) { currentTeam = 'away'; continue; }
    if (/t[eé]cnico|mister|coach|treinador/i.test(lower)) continue;

    const player = extractPlayer(line);
    if (player) {
      if (currentTeam === 'away') awayPlayers.push(player);
      else homePlayers.push(player);
    }
  }

  if (homePlayers.length > 0 && awayPlayers.length === 0) {
    const half = Math.ceil(homePlayers.length / 2);
    awayPlayers.push(...homePlayers.splice(half));
  }

  return normalizeFinalResult({
    homeTeam, awayTeam, competition, category, stadium, referee, date, time,
    homeCoach, awayCoach, homePlayers: dedup(homePlayers), awayPlayers: dedup(awayPlayers),
  });
}

function normalizeFinalResult(data: Omit<OCRParsedResult, 'rawText' | 'engine'>): Omit<OCRParsedResult, 'rawText' | 'engine'> {
  const homePlayers = normalizePlayersWithFootballRules(data.homePlayers);
  const awayPlayers = normalizePlayersWithFootballRules(data.awayPlayers);
  
  // Resolve duplicate names within each team
  const homeRaws = new Map<number, string>();
  const awayRaws = new Map<number, string>();
  data.homePlayers.forEach((p: any) => homeRaws.set(p.number, p.name || `Jogador ${p.number}`));
  data.awayPlayers.forEach((p: any) => awayRaws.set(p.number, p.name || `Jogador ${p.number}`));
  resolveDuplicatesWithOriginalNames(homePlayers, homeRaws);
  resolveDuplicatesWithOriginalNames(awayPlayers, awayRaws);
  
  return { ...data, homePlayers, awayPlayers };
}

function detectColumnSeparator(lines: string[]): string | null {
  let pipeCount = 0;
  let multiSpaceCount = 0;
  for (const line of lines) {
    if (/\|/.test(line) && line.split('|').length >= 2) pipeCount++;
    if (/\S\s{5,}\S/.test(line)) multiSpaceCount++;
  }
  if (pipeCount > lines.length * 0.3) return '|';
  if (multiSpaceCount > lines.length * 0.4) return '  ';
  return null;
}

function parseSingleColumn(lines: string[]): { team: string; coach: string; players: OCRParsedPlayer[] } {
  let team = '';
  let coach = '';
  const players: OCRParsedPlayer[] = [];

  const apelidoColIdx = detectApelidoColumn(lines);

  for (const line of lines) {
    const lower = line.toLowerCase();
    const vsMatch = line.match(/^(.+?)\s+[xX×]\s+/) || line.match(/^(.+?)\s+vs\.?\s+/i);
    if (vsMatch) { team = cleanTeamName(vsMatch[1]); continue; }
    if (/t[eé]cnico|mister|coach|treinador/i.test(lower)) {
      const val = line.split(/[:\-–—]/).slice(1).join(':').trim();
      if (val) coach = val;
      continue;
    }
    if (/^(?:n[oº°]|#|n[uú]mero|nome|apelido|alcunha|posi[çc][aã]o|titular|reserva)[\s|]*$/i.test(lower)) continue;
    if (/^(?:n[oº°]|#)\s+(?:nome|apelido|completo)/i.test(lower)) continue;

    const player = apelidoColIdx >= 0
      ? extractPlayerWithApelido(line, apelidoColIdx)
      : extractPlayer(line);
    if (player) players.push(player);
  }
  return { team, coach, players };
}

function detectApelidoColumn(lines: string[]): number {
  for (const line of lines) {
    const lower = line.toLowerCase();
    if (/apelido|nome\s*(de\s*)guerra|alcunha|nome\s*curto|nick/i.test(lower)) {
      const parts = line.split(/[\s|]{2,}|\|/).map(p => p.trim()).filter(Boolean);
      for (let i = 0; i < parts.length; i++) {
        if (/apelido|nome\s*(de\s*)guerra|alcunha|nome\s*curto|nick/i.test(parts[i])) {
          return i;
        }
      }
      return parts.length - 1;
    }
  }
  return -1;
}

function extractPlayerWithApelido(line: string, apelidoIdx: number): OCRParsedPlayer | null {
  const parts = line.split(/\|/).map(p => p.trim()).filter(Boolean);
  if (parts.length < 2) {
    const spaceParts = line.split(/\s{3,}/).map(p => p.trim()).filter(Boolean);
    if (spaceParts.length >= 2) return extractApelidoFromParts(spaceParts, apelidoIdx);
    return extractPlayer(line);
  }
  return extractApelidoFromParts(parts, apelidoIdx);
}

function extractApelidoFromParts(parts: string[], apelidoIdx: number): OCRParsedPlayer | null {
  let num = 0;
  for (const part of parts) {
    const numMatch = part.match(/^#?\s*(\d{1,2})/);
    if (numMatch && isValidPlayerNum(numMatch[1])) { num = parseInt(numMatch[1]); break; }
  }
  if (!num) return null;

  const safeIdx = Math.min(apelidoIdx, parts.length - 1);
  let apelido = parts[safeIdx].replace(/^\d+\s*/, '').replace(/[.*•►\-–—]/g, '').trim();

  if (apelido.length < 2 || /^\d+$/.test(apelido)) {
    for (let i = parts.length - 1; i >= 0; i--) {
      const candidate = parts[i].replace(/^\d+\s*/, '').replace(/[.*•►\-–—]/g, '').trim();
      if (candidate.length >= 2 && /[a-zA-ZÀ-ÿ]/.test(candidate)) { apelido = candidate; break; }
    }
  }
  if (!apelido || apelido.length < 2) return null;

  return { number: num, name: apelido, position: guessPositionByNumber(num), isStarter: true };
}

function cleanTeamName(raw: string): string {
  return raw.replace(/^[^a-zA-ZÀ-ÿ0-9]+|[^a-zA-ZÀ-ÿ0-9]+$/g, '').replace(/\s+/g, ' ').trim();
}

function extractPlayer(line: string): OCRParsedPlayer | null {
  const starterMarker = /[\s]*(?:\(T\)|\[T\]|\bT\b|\*|•|►)\s*$/.test(line);
  const cleanLine = line.replace(/[\s]*(?:\(T\)|\[T\]|\bT\b|\*|•|►)\s*$/, '').trim();

  let m: RegExpMatchArray | null;
  m = cleanLine.match(/^#?\s*(\d{1,2})\s*[.\-–—:;\s]+(.+)$/);
  if (m && isValidPlayerNum(m[1])) return makePlayer(m[1], m[2], starterMarker);

  m = cleanLine.match(/^(\d{1,2})\s{2,}(.+)$/);
  if (m && isValidPlayerNum(m[1])) return makePlayer(m[1], m[2], starterMarker);

  m = cleanLine.match(/^(\d{1,2})\s+([A-ZÀ-ÿ][a-zà-ÿ]+(?:\s+[A-ZÀ-ÿ][a-zà-ÿ]+)*)/);
  if (m && isValidPlayerNum(m[1])) return makePlayer(m[1], m[2], starterMarker);

  m = cleanLine.match(/^(.+?)\s+#?\s*(\d{1,2})\s*$/);
  if (m && isValidPlayerNum(m[2])) return makePlayer(m[2], m[1], starterMarker);

  m = cleanLine.match(/^(?:GK|ZAG|LD|LE|VOL|MC|MD|ME|MEI|ATA|PD|PE)[.\-–—:\s]*(\d{1,2})\s+(.+)$/i);
  if (m && isValidPlayerNum(m[1])) return makePlayer(m[1], m[2], starterMarker);

  m = cleanLine.match(/^(\d{1,2})([A-ZÀ-ÿ][a-zà-ÿ]+)/);
  if (m && isValidPlayerNum(m[1])) return makePlayer(m[1], m[2], starterMarker);

  m = cleanLine.match(/^(\d{1,2})\s+(.{2,})$/);
  if (m && isValidPlayerNum(m[1])) {
    const nameRaw = m[2].replace(/[|{}\[\]\\]/g, '').trim();
    if (/[a-zA-ZÀ-ÿ]{2,}/.test(nameRaw)) return makePlayer(m[1], nameRaw, starterMarker);
  }

  if (cleanLine.length <= 25) {
    m = cleanLine.match(/(\d{1,2})/);
    if (m && isValidPlayerNum(m[1])) {
      const namePart = cleanLine.replace(/\d+/g, '').replace(/[#.\-–—:;|]/g, '').trim();
      if (namePart.length >= 2 && /[a-zA-ZÀ-ÿ]/.test(namePart)) {
        return makePlayer(m[1], namePart, starterMarker);
      }
    }
  }
  return null;
}

function isValidPlayerNum(s: string): boolean {
  const n = parseInt(s);
  return !isNaN(n) && n >= 1 && n <= 99;
}

function makePlayer(numStr: string, nameRaw: string, isStarter: boolean = true): OCRParsedPlayer | null {
  const num = parseInt(numStr);
  if (isNaN(num) || num < 1 || num > 99) return null;

  const cleanRaw = nameRaw
    .replace(/[|{}\[\]\\]/g, '')
    .replace(/\b(?:GK|ZAG|LD|LE|VOL|MC|MD|ME|MEI|ATA|PD|PE)\b[.\-–—:;\s]*/gi, '')
    .replace(/^[.\-–—:;\s]+|[.\-–—:;\s]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  const name = shortenName(cleanRaw) || `Jogador ${num}`;

  const posMatch = nameRaw.match(/\b(GK|ZAG|LD|LE|VOL|MC|MD|ME|MEI|ATA|PD|PE)\b/i);
  const position = posMatch ? posMatch[1].toUpperCase() : guessPositionByNumber(num);

  return { number: num, name, position, isStarter };
}

function dedup(arr: OCRParsedPlayer[]): OCRParsedPlayer[] {
  const seen = new Set<number>();
  return arr.filter(p => {
    if (seen.has(p.number)) return false;
    seen.add(p.number);
    return true;
  });
}

// ==========================================
// MAIN EXPORT — OCR + AI Parse
// ==========================================

export interface OCRProgressInfo {
  percent: number;
  engine: string;
  status: string;
}

export async function ocrImage(
  file: File,
  onProgress?: (info: OCRProgressInfo) => void
): Promise<{ result: OCRParsedResult } | { error: string }> {
  const puterLoaded = !!(window as any).puter?.ai?.img2txt;
  const puterAI = !!(window as any).puter?.ai?.chat;

  const engines: Array<{ name: string; fn: () => Promise<{ text: string; engine: string }> }> = [];

  if (puterLoaded) {
    engines.push(
      { name: 'Mistral OCR', fn: () => tryMistralOCR(file) },
      { name: 'AWS Textract', fn: () => tryTextractOCR(file) },
    );
  }
  engines.push(
    { name: 'OCR.space', fn: () => tryOCRSpace(file) },
    { name: 'Tesseract.js', fn: () => tryTesseract(file, p => onProgress?.({ percent: p, engine: 'Tesseract.js', status: 'Processando...' })) },
  );

  let rawText = '';
  let ocrEngine = '';
  let lastError = '';

  for (let i = 0; i < engines.length; i++) {
    const engine = engines[i];
    onProgress?.({ percent: 5 + i * 15, engine: engine.name, status: `OCR: ${engine.name}...` });
    try {
      const result = await engine.fn();
      rawText = cleanupOCRText(result.text);
      ocrEngine = result.engine;
      break;
    } catch (err) {
      lastError = err instanceof Error ? err.message : 'Erro desconhecido';
      console.warn(`[OCR] ${engine.name} falhou:`, lastError);
    }
  }

  if (!rawText) {
    return { error: `Todos os motores OCR falharam. Último erro: ${lastError}. Use "Digitação Rápida".` };
  }

  onProgress?.({ percent: 75, engine: ocrEngine, status: 'IA interpretando dados...' });

  let parsed: Omit<OCRParsedResult, 'rawText' | 'engine'>;

  if (puterAI) {
    try {
      const aiResult = await aiParseOCRText(rawText);
      if (aiResult && (aiResult.homePlayers.length > 0 || aiResult.awayPlayers.length > 0 || aiResult.homeTeam)) {
        parsed = aiResult;
        ocrEngine += ' + IA';
        onProgress?.({ percent: 100, engine: ocrEngine, status: 'Concluído com IA!' });
      } else {
        parsed = regexParseOCRText(rawText);
        onProgress?.({ percent: 100, engine: ocrEngine, status: 'Concluído (regex fallback)' });
      }
    } catch {
      parsed = regexParseOCRText(rawText);
      onProgress?.({ percent: 100, engine: ocrEngine, status: 'Concluído (regex)' });
    }
  } else {
    parsed = regexParseOCRText(rawText);
    onProgress?.({ percent: 100, engine: ocrEngine, status: 'Concluído (sem IA)' });
  }

  return { result: { rawText, engine: ocrEngine, ...parsed } };
}

export function parseSumulaText(text: string): Omit<OCRParsedResult, 'rawText' | 'engine'> {
  return regexParseOCRText(text);
}

export async function parseSumulaTextAI(text: string): Promise<Omit<OCRParsedResult, 'rawText' | 'engine'>> {
  const puterAI = !!(window as any).puter?.ai?.chat;
  if (puterAI) {
    try {
      const aiResult = await aiParseOCRText(text);
      if (aiResult && (aiResult.homePlayers.length > 0 || aiResult.awayPlayers.length > 0 || aiResult.homeTeam)) {
        return aiResult;
      }
    } catch {}
  }
  return regexParseOCRText(text);
}
