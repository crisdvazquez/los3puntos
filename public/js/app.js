const BASE_URL = '/api';

const estado = {
  partidosPorFecha: {},
  listaFechas: [],
  indiceFecha: 0,
  liga: "PL",
  temporada: "2026"
};

// ==========================================
// Carga Principal
// ==========================================

async function cargarTodo(liga, season = estado.temporada) {
  cargarPosiciones(liga, season);
  cargarPartidos(liga, season);
}

// ==========================================
// Posiciones
// ==========================================

async function cargarPosiciones(liga, season) {
  const contenedor = document.getElementById('posiciones-container');
  if (!contenedor) return;

  contenedor.innerHTML = '<p class="loading">Cargando posiciones...</p>';

  try {
    let tabla = [];

    if (liga === "ARG") {
      const res = await fetch(`${BASE_URL}/arg/posiciones?season=${season}`);
      const data = await res.json();

      if (!res.ok || !data.table || data.table.length === 0) {
        throw new Error("No hay tabla disponible para Argentina.");
      }

      tabla = adaptarTablaArgentina(data.table);

    } else {
      const res = await fetch(`${BASE_URL}/posiciones?liga=${liga}&season=${season}`);
      const data = await res.json();

      const standings = data.standings?.[0]?.table;

      if (!standings || standings.length === 0) {
        await cargarPosicionesVacias(liga);
        return;
      }

      tabla = adaptarTablaFootballData(standings);
    }

    renderTablaPosiciones(tabla);

  } catch (err) {
    console.error(err);
    contenedor.innerHTML = '<p class="loading" style="font-size:0.85rem;">Tabla no disponible para esta temporada</p>';
  }
}

async function cargarPosicionesVacias(liga) {
  const contenedor = document.getElementById('posiciones-container');
  if (!contenedor) return;

  try {
    const res = await fetch(`${BASE_URL}/equipos?liga=${liga}`);
    const data = await res.json();
    const equipos = data.teams || [];

    if (equipos.length === 0) {
      contenedor.innerHTML = '<p class="loading" style="font-size:0.85rem;">Tabla no disponible por ahora</p>';
      return;
    }

    equipos.sort((a, b) =>
      (a.shortName || a.name || "").localeCompare(b.shortName || b.name || "")
    );

    const tablaFicticia = equipos.map((team, index) => ({
      position: index + 1,
      team,
      playedGames: 0,
      goalDifference: 0,
      points: 0
    }));

    renderTablaPosiciones(tablaFicticia);

  } catch (err) {
    console.error(err);
    contenedor.innerHTML = '<p class="loading" style="font-size:0.85rem;">Tabla no disponible por ahora</p>';
  }
}

function renderTablaPosiciones(tabla) {
  const contenedor = document.getElementById('posiciones-container');
  if (!contenedor) return;

  let html = `
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th class="pos-col">#</th>
            <th>Equipo</th>
            <th class="num-col">PJ</th>
            <th class="num-col">DIF</th>
            <th class="pts-col">PTS</th>
          </tr>
        </thead>
        <tbody>
  `;

  tabla.forEach(row => {
    const nombreEquipo = row.team?.shortName || row.team?.name || "Equipo";
    const escudo = row.team?.crest
      ? `<img src="${row.team.crest}" class="table-crest" alt="${nombreEquipo}">`
      : '<span class="crest-fallback">⚽</span>';

    html += `
      <tr>
        <td class="pos-col">${row.position}</td>
        <td>
          <div class="team-col">
            ${escudo}
            <span>${nombreEquipo}</span>
          </div>
        </td>
        <td class="num-col">${row.playedGames}</td>
        <td class="num-col">${row.goalDifference}</td>
        <td class="pts-col">${row.points}</td>
      </tr>
    `;
  });

  html += '</tbody></table></div>';
  contenedor.innerHTML = html;
}

// ==========================================
// Partidos / Fixture
// ==========================================

async function cargarPartidos(liga, season) {
  const contenedor = document.getElementById('partidos');
  const selector = document.getElementById('select-jornada');
  const leagueHeader = document.getElementById('league-header');

  if (!contenedor || !selector) return;

  contenedor.innerHTML = '<p class="loading">Cargando partidos...</p>';
  selector.disabled = true;
  selector.innerHTML = '<option>Cargando...</option>';
  if (leagueHeader) leagueHeader.innerHTML = '';

  try {
    let partidos = [];

    if (liga === "ARG") {
      const res = await fetch(`${BASE_URL}/arg/partidos?season=${season}`);
      const data = await res.json();

      if (!res.ok || !data.events || data.events.length === 0) {
        contenedor.innerHTML = `<p class="error">No se encontraron partidos para la Liga Argentina.</p>`;
        selector.innerHTML = '<option>-</option>';
        return;
      }

      partidos = data.events.map(adaptarPartidoArgentina);

      if (typeof renderBannerLiga === "function") {
        renderBannerLiga({
          nombre: "Liga Profesional Argentina",
          logo: "",
          bandera: "🇦🇷",
          temporada: season
        });
      }

    } else {
      const res = await fetch(`${BASE_URL}/partidos?liga=${liga}&season=${season}`);
      const data = await res.json();

      if (!res.ok || !data.matches || data.matches.length === 0) {
        contenedor.innerHTML = `<p class="error">No se encontraron partidos para esta temporada.</p>`;
        selector.innerHTML = '<option>-</option>';
        return;
      }

      partidos = data.matches.map(adaptarPartidoFootballData);

      if (typeof renderBannerLiga === "function") {
        renderBannerLiga({
          nombre: data.competition?.name || 'Liga',
          logo: data.competition?.emblem || '',
          temporada: season
        });
      }
    }

    // Agrupar partidos por jornada
    estado.partidosPorFecha = {};
    partidos.forEach(match => {
      const numJornada = match.matchday || 1;
      const clave = `Fecha ${numJornada}`;
      if (!estado.partidosPorFecha[clave]) estado.partidosPorFecha[clave] = [];
      estado.partidosPorFecha[clave].push(match);
    });

    estado.listaFechas = Object.keys(estado.partidosPorFecha).sort((a, b) => {
      const numA = parseInt(a.replace('Fecha ', '')) || 0;
      const numB = parseInt(b.replace('Fecha ', '')) || 0;
      return numA - numB;
    });

    selector.innerHTML = '';
    estado.listaFechas.forEach((jornada, index) => {
      const option = document.createElement('option');
      option.value = index;
      option.textContent = jornada;
      selector.appendChild(option);
    });

    selector.disabled = false;
    estado.indiceFecha = 0;
    actualizarVistaFecha();

    selector.onchange = (e) => {
      estado.indiceFecha = parseInt(e.target.value);
      actualizarVistaFecha();
    };

  } catch (err) {
    console.error(err);
    contenedor.innerHTML = '<p class="error">Error al cargar los partidos.</p>';
  }
}

function actualizarVistaFecha() {
  const selector = document.getElementById('select-jornada');
  const btnPrev = document.getElementById('btn-prev-fecha');
  const btnNext = document.getElementById('btn-next-fecha');

  if (!selector) return;

  selector.value = estado.indiceFecha;
  if (btnPrev) btnPrev.disabled = (estado.indiceFecha === 0);
  if (btnNext) btnNext.disabled = (estado.indiceFecha === estado.listaFechas.length - 1);

  const fechaClave = estado.listaFechas[estado.indiceFecha];
  renderizarFechaUnica(fechaClave);
}

function renderizarFechaUnica(jornadaSeleccionada) {
  const contenedor = document.getElementById('partidos');
  if (!contenedor) return;

  const partidos = estado.partidosPorFecha[jornadaSeleccionada] || [];
  contenedor.innerHTML = '';

  if (partidos.length === 0) {
    contenedor.innerHTML = '<p class="loading">No hay partidos registrados en esta fecha.</p>';
    return;
  }

  partidos.forEach(match => {
    const fechaObj = new Date(match.utcDate);

    const diaSemana = isNaN(fechaObj) ? "S/D" : fechaObj.toLocaleDateString('es-AR', { weekday: 'short' }).replace('.', '').toUpperCase();
    const diaMes = isNaN(fechaObj) ? "" : fechaObj.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' });
    const hora24 = isNaN(fechaObj) ? "" : fechaObj.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false });

    const localNombre = match.homeTeam?.shortName || match.homeTeam?.name || "Local";
    const visitanteNombre = match.awayTeam?.shortName || match.awayTeam?.name || "Visitante";

    const escudoLocal = match.homeTeam?.crest
      ? `<img src="${match.homeTeam.crest}" class="crest-compact" alt="${localNombre}">`
      : '<span class="crest-fallback">⚽</span>';

    const escudoVisitante = match.awayTeam?.crest
      ? `<img src="${match.awayTeam.crest}" class="crest-compact" alt="${visitanteNombre}">`
      : '<span class="crest-fallback">⚽</span>';

    const card = document.createElement('div');
    card.className = 'match-card-compact';
    card.innerHTML = `
      <div class="match-time">${diaSemana} ${diaMes}<br>${hora24} hs</div>
      <div class="match-teams">
        <div class="team-compact home">
          <span>${localNombre}</span>
          ${escudoLocal}
        </div>
        <span class="vs-compact">vs</span>
        <div class="team-compact away">
          ${escudoVisitante}
          <span>${visitanteNombre}</span>
        </div>
      </div>
    `;
    contenedor.appendChild(card);
  });
}

// ==========================================
// Event Listeners e Inicialización
// ==========================================

const btnPrev = document.getElementById('btn-prev-fecha');
if (btnPrev) {
  btnPrev.addEventListener('click', () => {
    if (estado.indiceFecha > 0) {
      estado.indiceFecha--;
      actualizarVistaFecha();
    }
  });
}

const btnNext = document.getElementById('btn-next-fecha');
if (btnNext) {
  btnNext.addEventListener('click', () => {
    if (estado.indiceFecha < estado.listaFechas.length - 1) {
      estado.indiceFecha++;
      actualizarVistaFecha();
    }
  });
}

document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    const target = e.currentTarget;
    target.classList.add('active');

    estado.liga = target.getAttribute('data-liga');
    cargarTodo(estado.liga, estado.temporada);
  });
});

// Carga Inicial
cargarTodo(estado.liga, estado.temporada);