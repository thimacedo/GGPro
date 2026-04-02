export const TEAM_ABBREVIATIONS = {
  'flamengo': 'FLA',
  'corinthians': 'COR',
  'palmeiras': 'PAL',
  'são paulo': 'SAO',
  'sao paulo': 'SAO',
  'santos': 'SAN',
  'vasco da gama': 'VAS',
  'vasco': 'VAS',
  'fluminense': 'FLU',
  'botafogo': 'BOT',
  'grêmio': 'GRE',
  'gremio': 'GRE',
  'internacional': 'INT',
  'cruzeiro': 'CRU',
  'atlético mineiro': 'CAM',
  'atletico mineiro': 'CAM',
  'atlético-mg': 'CAM',
  'athletico paranaense': 'CAP',
  'athletico-pr': 'CAP',
  'athletico': 'CAP',
  'coritiba': 'CFC',
  'bahia': 'BAH',
  'vitória': 'VIT',
  'vitoria': 'VIT',
  'sport recife': 'SPT',
  'sport': 'SPT',
  'fortaleza': 'FOR',
  'ceará': 'CEA',
  'ceara': 'CEA',
  'goiás': 'GOI',
  'goias': 'GOI',
  'juventude': 'JUV',
  'bragantino': 'RBB',
  'red bull bragantino': 'RBB',
  'cuiabá': 'CUI',
  'cuiaba': 'CUI',
  'atlético goianiense': 'ACG',
  'criciúma': 'CRI',
  'criciuma': 'CRI'
};

export const hexToRgb = (hex) => {
  let c = hex.replace(/^#/, '');
  if (c.length === 3) c = c.split('').map(char => char + char).join('');
  const num = parseInt(c, 16);
  if(isNaN(num)) return { r: 0, g: 0, b: 0 };
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
};

export const getColorBrightness = (r, g, b) => {
  return (r * 299 + g * 587 + b * 114) / 1000;
};

export const ensureDistinctColors = (colorMain, colorOpponent) => {
  const c1 = hexToRgb(colorMain || '#000000');
  const c2 = hexToRgb(colorOpponent || '#ffffff');
  
  const distance = Math.sqrt(
    Math.pow(c1.r - c2.r, 2) + Math.pow(c1.g - c2.g, 2) + Math.pow(c1.b - c2.b, 2)
  );

  if (distance < 80) {
    const oppBrightness = getColorBrightness(c2.r, c2.g, c2.b);
    if (oppBrightness < 128) {
      return '#FFFFFF';
    } else {
      return '#1E293B';
    }
  }

  return colorMain;
};

export const generateDistinctShortName = (teamName, otherShortName) => {
  if (!teamName) return 'UND';
  const rawName = teamName.toLowerCase().trim();
  
  for (const [key, value] of Object.entries(TEAM_ABBREVIATIONS)) {
    if (rawName.includes(key)) {
      if (!otherShortName || value !== otherShortName) return value;
    }
  }

  const cleanName = rawName.replace(/[^a-z]/g, '').toUpperCase();
  let candidate = cleanName.substring(0, 3) || 'UND';

  if (candidate === otherShortName && cleanName.length > 3) {
    candidate = cleanName[0] + cleanName[1] + cleanName[cleanName.length > 3 ? 3 : 2];
    if (candidate === otherShortName && cleanName.length > 4) {
      candidate = cleanName[0] + cleanName[2] + cleanName[4];
    }
  }

  if (candidate === otherShortName) {
    candidate = candidate.substring(0, 2) + 'X';
  }

  return candidate.padEnd(3, 'X');
};

export const formatDuration = (ms) => {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

export const generateId = () => Math.random().toString(36).substr(2, 9);
