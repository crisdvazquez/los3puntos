const BASE_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.protocol === 'file:')
  ? 'https://los3puntos.onrender.com/api/partidos'
  : '/api/partidos';

let partidosPorFecha = {};
let ligaActual = 'PL';

// Logo oficial de la Premier League mediante CDN transparente sin bloqueos
const LOGO_PREMIER = 'https://assets.stickpng.com/images/58428defa6515b1fe0235339.png';

async function cargarPartidos(liga) {
  const contenedor = document.getElementById('partidos');
  const selector = document.getElementById('select-jornada');
  const leagueHeader = document.getElementById('league-header');

  contenedor.innerHTML = '<p class="loading">Cargando partidos...</p>';
  selector.disabled = true;
  selector.innerHTML = '<option>Cargando fechas...</option>';
  leagueHeader.innerHTML = '';

  if (liga === 'ARG') {
    contenedor.innerHTML = `
      <div style="text-align: center; padding: 30px; background: #1e293b; border-radius: 8px; border: 1px solid #334155;">
        <h3 style="color: #38bdf8; margin-top: 0;">🇦🇷 Liga Profesional Argentina</h3>
        <p style="color: #94a3b8; font-size: 0.95rem;">
          La API gratuita de Football-Data.org no incluye la liga argentina.
        </p>
      </div>
    `;
    selector.innerHTML = '<option>Sin datos</option>';
    return;
  }

  try {
    const res = await fetch(`${BASE_URL}?liga=${liga}`);
    const data = await res.json();

    if (!res.ok || !data.matches || data.matches.length === 0) {
      contenedor.innerHTML = `<p class="error">Error: ${data?.error || 'No se encontraron partidos'}</p>`;
      selector.innerHTML = '<option>Sin fechas</option>';
      return;
    }

    // Forzar el logo de la Premier League cuando la liga sea PL
    let logoLiga = data.competition?.emblem;
    if (liga === 'PL' || !logoLiga) {
      logoLiga = LOGO_PREMIER;
    }

    const nombreLiga = data.competition?.name || 'Premier League';

    leagueHeader.innerHTML = `
      <div class="league-banner">
        <img src="${logoLiga}" alt="${nombreLiga}" class="league-logo" onerror="this.src='${LOGO_PREMIER}'">
        <h2 class="league-title">${nombreLiga}</h2>
      </div>
    `;

    // Agrupar por jornada
    partidosPorFecha = {};
    data.matches.forEach(match => {
      const numJornada = match.matchday || 1;
      const clave = `Fecha ${numJornada}`;
      if (!partidosPorFecha[clave]) {
        partidosPorFecha[clave] = [];
      }
      partidosPorFecha[clave].push(match);
    });

    const listaFechas = Object.keys(partidosPorFecha).sort((a, b) => {
      const numA = parseInt(a.replace('Fecha ', '')) || 0;
      const numB = parseInt(b.replace('Fecha ', '')) || 0;
      return numA - numB;
    });

    selector.innerHTML = '';
    listaFechas.forEach(jornada => {
      const option = document.createElement('option');
      option.value = jornada;
      option.textContent = jornada;
      selector.appendChild(option);
    });

    selector.disabled = false;
    renderizarFechaUnica(listaFechas[0]);

    selector.onchange = (e) => {
      renderizarFechaUnica(e.target.value);
    };

  } catch (err) {
    console.error('Error al cargar datos:', err);
    contenedor.innerHTML = '<p class="error">Error de conexión al cargar los partidos.</p>';
    selector.innerHTML = '<option>Error</option>';
  }
}

function renderizarFechaUnica(jornadaSeleccionada) {
  const contenedor = document.getElementById('partidos');
  const partidos = partidosPorFecha[jornadaSeleccionada] || [];

  contenedor.innerHTML = `<h2 class="jornada-titulo">${jornadaSeleccionada}</h2>`;

  partidos.forEach(match => {
    const fechaObj = new Date(match.utcDate);
    const fechaFormateada = fechaObj.toLocaleDateString('es-AR', {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });

    const card = document.createElement('div');
    card.className = 'match-card';
    card.innerHTML = `
      <div class="match-header">
        <span class="match-date">${fechaFormateada} hs</span>
      </div>
      <div class="match-body">
        <div class="team home">
          <span>${match.homeTeam.shortName || match.homeTeam.name}</span>
          <img src="${match.homeTeam.crest}" alt="${match.homeTeam.name}" class="crest">
        </div>
        <span class="vs">VS</span>
        <div class="team away">
          <img src="${match.awayTeam.crest}" alt="${match.awayTeam.name}" class="crest">
          <span>${match.awayTeam.shortName || match.awayTeam.name}</span>
        </div>
      </div>
    `;
    contenedor.appendChild(card);
  });
}

document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    const target = e.currentTarget;
    target.classList.add('active');
    
    ligaActual = target.getAttribute('data-liga');
    cargarPartidos(ligaActual);
  });
});

cargarPartidos(ligaActual);