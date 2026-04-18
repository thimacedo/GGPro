/**
 * field.js — Componente: Campo SVG Drag & Drop
 * Renderiza jogadores no campo com drag suportando mouse e touch
 */

import state from '../state.js';

let _dragging = null;
let _dragStart = { x: 0, y: 0, cx: 0, cy: 0 };

export function render(fieldTeam, selectedPlayer) {
  const s = state.get();
  const team = fieldTeam === 'home' ? s.homeTeam : s.awayTeam;
  const players = team.players.filter(p => p.isStarter && !p.hasLeft);

  return `
    <div id="fieldContainer" style="
      position:relative;flex:1;min-height:300px;
      background:#0a1628;border-radius:16px;border:1px solid #1a2a3a;overflow:hidden;
    ">
      <svg id="fieldSVG" viewBox="0 0 680 440" preserveAspectRatio="xMidYMid meet" style="width:100%;height:100%;">
        <defs>
          <pattern id="grass" x="0" y="0" width="680" height="110" patternUnits="userSpaceOnUse">
            <rect width="680" height="110" fill="#1a7a35"/>
            <rect width="680" height="55" fill="#1a8a3a" y="55"/>
          </pattern>
        </defs>

        <!-- Field background -->
        <rect width="680" height="440" fill="url(#grass)"/>

        <!-- Lines -->
        <rect x="1" y="1" width="678" height="438" fill="none" stroke="rgba(255,255,255,0.6)" stroke-width="2.5" rx="3"/>
        <line x1="340" y1="0" x2="340" y2="440" stroke="rgba(255,255,255,0.6)" stroke-width="2"/>
        <circle cx="340" cy="220" r="50" fill="none" stroke="rgba(255,255,255,0.6)" stroke-width="2"/>
        <circle cx="340" cy="220" r="3" fill="rgba(255,255,255,0.6)"/>
        <rect x="210" y="0" width="260" height="65" fill="none" stroke="rgba(255,255,255,0.6)" stroke-width="2"/>
        <rect x="210" y="375" width="260" height="65" fill="none" stroke="rgba(255,255,255,0.6)" stroke-width="2"/>
        <rect x="290" y="0" width="100" height="20" fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.6)" stroke-width="1.5"/>
        <rect x="290" y="420" width="100" height="20" fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.6)" stroke-width="1.5"/>

        <!-- Players -->
        ${players.map(p => {
          const cx = (p.x / 100) * 680;
          const cy = (p.y / 100) * 440;
          const isSelected = selectedPlayer === p.id;
          return `
            <g class="player-node" data-id="${p.id}" data-team="${fieldTeam}" style="cursor:grab;">
              <circle cx="${cx}" cy="${cy}" r="18"
                fill="${team.color}" stroke="${isSelected ? '#ffd700' : team.color + '88'}"
                stroke-width="${isSelected ? 3 : 2}" opacity="0.95"/>
              <text x="${cx}" y="${cy + 1}" text-anchor="middle" dominant-baseline="middle"
                fill="#fff" font-size="10" font-weight="900">${p.number}</text>
              ${isSelected ? `<circle cx="${cx}" cy="${cy}" r="22" fill="none" stroke="#ffd700" stroke-width="2" opacity="0.5" stroke-dasharray="4 4"/>` : ''}
              ${p.stats.goals > 0 ? `<text x="${cx + 16}" y="${cy - 12}" font-size="11">${'⚽'.repeat(Math.min(p.stats.goals, 3))}</text>` : ''}
              ${p.stats.yellows > 0 ? `<text x="${cx + 16}" y="${cy}" font-size="10">${'🟨'.repeat(Math.min(p.stats.yellows, 2))}</text>` : ''}
              ${p.stats.reds > 0 ? `<text x="${cx + 16}" y="${cy + 12}" font-size="10">🟥</text>` : ''}
            </g>
          `;
        }).join('')}
      </svg>
    </div>
  `;
}

/**
 * Setup drag listeners — call after render
 */
export function setupDrag(onSelect) {
  const svg = document.getElementById('fieldSVG');
  if (!svg) return;

  function svgPoint(evt) {
    const pt = svg.createSVGPoint();
    const src = evt.touches ? evt.touches[0] : evt;
    pt.x = src.clientX;
    pt.y = src.clientY;
    return pt.matrixTransform(svg.getScreenCTM().inverse());
  }

  function onDown(e) {
    const target = e.target.closest('.player-node');
    if (!target) { onSelect?.(null); return; }
    e.preventDefault();
    _dragging = target;
    const id = target.dataset.id;
    onSelect?.(id);

    const circle = target.querySelector('circle');
    _dragStart.cx = parseFloat(circle.getAttribute('cx'));
    _dragStart.cy = parseFloat(circle.getAttribute('cy'));
    const pt = svgPoint(e);
    _dragStart.x = pt.x;
    _dragStart.y = pt.y;
  }

  function onMove(e) {
    if (!_dragging) return;
    e.preventDefault();
    const pt = svgPoint(e);
    const dx = pt.x - _dragStart.x;
    const dy = pt.y - _dragStart.y;
    const newX = Math.max(20, Math.min(660, _dragStart.cx + dx));
    const newY = Math.max(20, Math.min(420, _dragStart.cy + dy));

    // Update SVG elements
    const circles = _dragging.querySelectorAll('circle');
    const texts = _dragging.querySelectorAll('text');
    circles.forEach(c => c.setAttribute('cx', newX));
    circles.forEach(c => c.setAttribute('cy', newY));
    texts.forEach(t => { t.setAttribute('x', newX); t.setAttribute('y', newY + 1); });

    // Update state (throttled by move frequency)
    const teamId = _dragging.dataset.team;
    const playerId = _dragging.dataset.id;
    const teamKey = teamId === 'home' ? 'homeTeam' : 'awayTeam';
    state.set(prev => ({
      [teamKey]: {
        ...prev[teamKey],
        players: prev[teamKey].players.map(p =>
          p.id === playerId ? { ...p, x: (newX / 680) * 100, y: (newY / 440) * 100 } : p
        )
      }
    }));
  }

  function onUp() { _dragging = null; }

  svg.addEventListener('mousedown', onDown);
  svg.addEventListener('touchstart', onDown, { passive: false });
  document.addEventListener('mousemove', onMove);
  document.addEventListener('touchmove', onMove, { passive: false });
  document.addEventListener('mouseup', onUp);
  document.addEventListener('touchend', onUp);

  // Return cleanup
  return () => {
    svg.removeEventListener('mousedown', onDown);
    svg.removeEventListener('touchstart', onDown);
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('touchmove', onMove);
    document.removeEventListener('mouseup', onUp);
    document.removeEventListener('touchend', onUp);
  };
}
