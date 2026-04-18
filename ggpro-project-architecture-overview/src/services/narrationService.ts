interface NarrationContext {
  eventType: string;
  teamShort: string;
  playerName?: string;
  playerNumber?: number;
  minute?: number;
  homeShort: string;
  awayShort: string;
  homeScore: number;
  awayScore: number;
  playerOut?: string;
  playerIn?: string;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function fill(template: string, ctx: NarrationContext): string {
  const score = `${ctx.homeShort} ${ctx.homeScore} × ${ctx.awayScore} ${ctx.awayShort}`;
  const player = ctx.playerName
    ? `#${ctx.playerNumber} ${ctx.playerName}`
    : '';
  const minute = ctx.minute ? `${ctx.minute}'` : '';

  return template
    .replace(/\{team\}/g, ctx.teamShort)
    .replace(/\{player\}/g, player)
    .replace(/\{minute\}/g, minute)
    .replace(/\{score\}/g, score)
    .replace(/\{playerOut\}/g, ctx.playerOut || '')
    .replace(/\{playerIn\}/g, ctx.playerIn || '');
}

const GOAL_TEMPLATES = [
  "GOOOOL! {team}! {player} marca! {score}",
  "É GOL! {player} do {team} balança as redes! {score}",
  "GOLAÇO! {player} não perdoa! {score}",
  "GOOOL! O estádio explode! {player} para o {team}! {score}",
  "GOL! Que momento! {player} aparece pra definir! {score}",
  "GOOOOLAZO! {player} com um chute incrível! {score}",
  "GOOOL! {player} marca para o {team}! {score}",
  "GOL! Placar atualizado: {score}",
  "Não deu chance pro goleiro! {player} marca! {team}! {score}",
  "GOL DE PLACA! {player} faz o dele! {score}",
  "É GOL! {player} aparece na hora certa! {score}",
  "GOOOOL! {minute} {player} do {team} marca! {score}",
];

const YELLOW_TEMPLATES = [
  "Cartão amarelo! {player} do {team} é advertido!",
  "Amarelo para {player}! {team} recebe o cartão!",
  "O árbitro mostra o amarelo! {player} do {team}!",
  "Advertência! {player} do {team} vê o amarelo!",
  "Cartão amarelo para {player}! Cuidado, {team}!",
];

const RED_TEMPLATES = [
  "VERMELHO! {player} do {team} é expulso!",
  "Cartão vermelho! {player} deixa o campo! {team} fica com um a menos!",
  "EXPULSÃO! {player} do {team} é mandado para o chuveiro!",
  "Vermelho direto! {player} do {team}! O árbitro não teve dúvida!",
];

const FOUL_TEMPLATES = [
  "Falta! {player} do {team} comete a infração!",
  "Falta do {team}! {player} parou o contra-ataque!",
  "Arbitro marca falta! {player} do {team}!",
];

const CORNER_TEMPLATES = [
  "Escanteio para o {team}!",
  "Tiro de canto! {team} vai cobrar!",
  "Escanteio! Bola na área do {team}!",
];

const SHOT_TEMPLATES = [
  "Finalização! {player} do {team} arrisca!",
  "Chute de {player}! {team} busca o gol!",
  "Finaliza {player}! {team} chega com perigo!",
];

const SUB_TEMPLATES = [
  "Substituição no {team}! Sai {playerOut}, entra {playerIn}!",
  "Troca no {team}! {playerIn} entra no lugar de {playerOut}!",
  "Mudança no {team}! O técnico mexe: entra {playerIn}, sai {playerOut}!",
];

const SAVE_TEMPLATES = [
  "Defesa! O goleiro do {team} espalma!",
  "Que defesa! {team} se salva!",
  "O goleiro do {team} impede o gol!",
];

const OFFSIDE_TEMPLATES = [
  "Impedimento! {player} do {team} adiantado!",
  "Bandeirinha levanta! Impedimento do {team}!",
  "Lançamento longo, mas {player} do {team} estava impedido!",
];

const VAR_TEMPLATES = [
  "VAR! O árbitro vai conferir o lance!",
  "Revisão no VAR! O lance será analisado!",
  "O VAR é acionado! Vamos aguardar a decisão!",
];

const INJURY_TEMPLATES = [
  "Contusão! {player} do {team} precisa de atendimento!",
  "Jogador caído! {player} do {team} sente algo!",
  "Paralisação! {player} do {team} está no chão!",
];

const WOODWORK_TEMPLATES = [
  "NA TRAVE! {player} do {team} quase marca!",
  "Bola na barra! Que lance! {team} por pouco!",
  "Na trave! {player} quase faz o gol! {team} chega!",
];

const TEMPLATES: Record<string, string[]> = {
  GOAL: GOAL_TEMPLATES,
  YELLOW_CARD: YELLOW_TEMPLATES,
  RED_CARD: RED_TEMPLATES,
  FOUL: FOUL_TEMPLATES,
  CORNER: CORNER_TEMPLATES,
  SHOT: SHOT_TEMPLATES,
  SUBSTITUTION: SUB_TEMPLATES,
  SAVE: SAVE_TEMPLATES,
  OFFSIDE: OFFSIDE_TEMPLATES,
  VAR: VAR_TEMPLATES,
  INJURY: INJURY_TEMPLATES,
  WOODWORK: WOODWORK_TEMPLATES,
};

export function generateNarration(ctx: NarrationContext): string {
  const templates = TEMPLATES[ctx.eventType];
  if (!templates || templates.length === 0) return '';
  return fill(pick(templates), ctx);
}

export function hasNarrationTemplate(eventType: string): boolean {
  return eventType in TEMPLATES;
}
