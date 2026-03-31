export const TEAM_ABBREVIATIONS: Record<string, string> = {
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

const hexToRgb = (hex: string) => {
  let c = hex.replace(/^#/, '');
  if (c.length === 3) c = c.split('').map(char => char + char).join('');
  const num = parseInt(c, 16);
  if(isNaN(num)) return { r: 0, g: 0, b: 0 };
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
};

const getColorBrightness = (r: number, g: number, b: number) => {
  return (r * 299 + g * 587 + b * 114) / 1000;
};

export const ensureDistinctColors = (colorMain: string, colorOpponent: string): string => {
  const c1 = hexToRgb(colorMain || '#000000');
  const c2 = hexToRgb(colorOpponent || '#ffffff');
  
  const distance = Math.sqrt(
    Math.pow(c1.r - c2.r, 2) + Math.pow(c1.g - c2.g, 2) + Math.pow(c1.b - c2.b, 2)
  );

  // If colors are too similar (less than ~80 RGB distance threshold)
  if (distance < 80) {
    const oppBrightness = getColorBrightness(c2.r, c2.g, c2.b);
    // If opponent is dark, choose a light fallback color, else a dark fallback
    if (oppBrightness < 128) {
      return '#FFFFFF'; // White
    } else {
      return '#1E293B'; // Slate 800 (Very Dark Blue)
    }
  }

  return colorMain;
};

export const generateDistinctShortName = (teamName: string, otherShortName?: string): string => {
  if (!teamName) return 'UND';
  const rawName = teamName.toLowerCase().trim();
  
  // Try to find exact or partial match in dictionary
  for (const [key, value] of Object.entries(TEAM_ABBREVIATIONS)) {
    if (rawName.includes(key)) {
      if (!otherShortName || value !== otherShortName) return value;
    }
  }

  // Fallback: take first 3 letters
  const cleanName = rawName.replace(/[^a-z]/g, '').toUpperCase();
  let candidate = cleanName.substring(0, 3) || 'UND';

  if (candidate === otherShortName && cleanName.length > 3) {
    // Conflict resolution: try alternative letters (1st, 2nd, and 4th)
    candidate = cleanName[0] + cleanName[1] + cleanName[3];
    if (candidate === otherShortName && cleanName.length > 4) {
      // 1st, 3rd, 5th
      candidate = cleanName[0] + cleanName[2] + cleanName[4];
    }
  }

  // Final fallback if even conflict resolution fails (rare edge case)
  if (candidate === otherShortName) {
    candidate = candidate.substring(0, 2) + 'X';
  }

  return candidate.padEnd(3, 'X');
};
