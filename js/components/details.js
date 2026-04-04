/**
 * Módulo de Detalhes da Partida (La Liga Style)
 * Renderiza o card escuro com informações dinâmicas e ícones Lucide.
 */

export function renderMatchDetails(state, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const competition = state.competition || "Competição Não Definida";
  const date = state.matchDate || "Data Não Definida";
  const stadium = state.stadium || "Local Não Definido";

  container.innerHTML = `
    <div class="details-card">
      <h2 class="details-card__title">Detalhes</h2>
      <div class="details-list">
        <div class="details-list__item">
          <div class="details-list__icon"><i data-lucide="activity"></i></div>
          <span class="details-list__text">${competition}</span>
        </div>
        <div class="details-list__item">
          <div class="details-list__icon"><i data-lucide="clock"></i></div>
          <span class="details-list__text">${date}</span>
        </div>
        <div class="details-list__item">
          <div class="details-list__icon"><i data-lucide="map-pin"></i></div>
          <span class="details-list__text">${stadium}</span>
        </div>
      </div>
    </div>
  `;

  if (window.lucide) {
    window.lucide.createIcons({
      root: container,
      attrs: {
        class: "lucide-icon lucide-icon--red",
        stroke: "#ef4444",
        "stroke-width": 2.5
      }
    });
  }
}
