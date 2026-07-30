const BASE_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.protocol === 'file:')
  ? 'https://los3puntos.onrender.com/api'
  : '/api';

let partidosPorFecha = {};
let listaFechas = [];
let indiceFechaActual = 0;
let ligaActual = 'PL';
let temporadaActual = '2026'; // Año de inicio de la temporada

async function cargarTodo(liga, season = temporadaActual) {
  cargarPosiciones(liga, season);
  cargarPartidos(liga, season);
}

async function cargarPosiciones(liga, season) {
  const contenedor = document.getElementById('posiciones-container');
  contenedor.innerHTML = '<p class="loading">Cargando posiciones...</p>';

  if (liga === 'ARG') {
    await cargarPosicionesArgentina();
    return;
  }

  try {
    const res = await fetch(`${BASE_URL}/posiciones?liga=${liga}&season=${season}`);
    const data = await res.json();

    const tabla = data.standings?.[0]?.table;

    if (!tabla || tabla.length === 0) {
      // El torneo todavía no arrancó (o la API no tiene standings para esta temporada)
      await cargarPosicionesVacias(liga);
      return;
    }

    renderTablaPosiciones(tabla);

  } catch (err) {
    contenedor.innerHTML = '<p class="loading" style="font-size:0.85rem;">Tabla no disponible para esta temporada</p>';
  }
}

async function cargarPosicionesVacias(liga) {
  const contenedor = document.getElementById('posiciones-container');

  try {
    const res = await fetch(`${BASE_URL}/equipos?liga=${liga}`);
    const data = await res.json();
    const equipos = data.teams || [];

    if (equipos.length === 0) {
      contenedor.innerHTML = '<p class="loading" style="font-size:0.85rem;">Tabla no disponible por ahora</p>';
      return;
    }

    // Todos en 0, así que el orden es solo alfabético
    equipos.sort((a, b) =>
      (a.shortName || a.name).localeCompare(b.shortName || b.name)
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
    contenedor.innerHTML = '<p class="loading" style="font-size:0.85rem;">Tabla no disponible por ahora</p>';
  }
}

async function cargarPosicionesArgentina() {
  const contenedor = document.getElementById('posiciones-container');

  try {
    const res = await fetch(`${BASE_URL}/arg/posiciones?season=${temporadaActual}`);
    const data = await res.json();
    const tabla = data.table;

    if (!tabla || tabla.length === 0) {
      contenedor.innerHTML = '<p class="loading" style="font-size:0.85rem;">Tabla no disponible por ahora</p>';
      return;
    }

    const tablaAdaptada = tabla.map(row => ({
      position: row.intRank,
      team: { name: row.strTeam, shortName: row.strTeam, crest: row.strBadge },
      playedGames: row.intPlayed,
      goalDifference: row.intGoalDifference,
      points: row.intPoints
    }));

    renderTablaPosiciones(tablaAdaptada);

  } catch (err) {
    contenedor.innerHTML = '<p class="loading" style="font-size:0.85rem;">Tabla no disponible por ahora</p>';
  }
}

function renderTablaPosiciones(tabla) {
  const contenedor = document.getElementById('posiciones-container');

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
    const nombreEquipo = row.team.shortName || row.team.name;
    const escudo = row.team.crest
      ? `<img src="${row.team.crest}" class="table-crest" alt="">`
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

async function cargarPartidosArgentina() {
  const contenedor = document.getElementById('partidos');
  const selector = document.getElementById('select-jornada');
  const leagueHeader = document.getElementById('league-header');

  leagueHeader.innerHTML = `
    <div class="league-banner">
      <div class="league-header-top">
        <span class="league-logo-fallback">🇦🇷</span>
        <h2 class="league-title">Liga Profesional Argentina</h2>
      </div>
    </div>
  `;

  try {
    const res = await fetch(`${BASE_URL}/arg/partidos?season=${temporadaActual}`);
    const data = await res.json();

    if (!res.ok || !data.events || data.events.length === 0) {
      contenedor.innerHTML = '<p class="error">No se encontraron partidos para esta temporada.</p>';
      return;
    }

    partidosPorFecha = {};
    data.events.forEach(evento => {
      const numJornada = evento.intRound || 1;
      const clave = `Fecha ${numJornada}`;
      if (!partidosPorFecha[clave]) partidosPorFecha[clave] = [];
      partidosPorFecha[clave].push({
        utcDate: `${evento.dateEvent}T${evento.strTime || '00:00:00'}`,
        homeTeam: { name: evento.strHomeTeam, shortName: evento.strHomeTeam, crest: evento.strHomeTeamBadge || '' },
        awayTeam: { name: evento.strAwayTeam, shortName: evento.strAwayTeam, crest: evento.strAwayTeamBadge || '' }
      });
    });

    listaFechas = Object.keys(partidosPorFecha).sort((a, b) => {
      const numA = parseInt(a.replace('Fecha ', '')) || 0;
      const numB = parseInt(b.replace('Fecha ', '')) || 0;
      return numA - numB;
    });

    selector.innerHTML = '';
    listaFechas.forEach((jornada, index) => {
      const option = document.createElement('option');
      option.value = index;
      option.textContent = jornada;
      selector.appendChild(option);
    });

    selector.disabled = false;
    indiceFechaActual = 0;
    actualizarVistaFecha();

    selector.onchange = (e) => {
      indiceFechaActual = parseInt(e.target.value);
      actualizarVistaFecha();
    };

  } catch (err) {
    contenedor.innerHTML = '<p class="error">Error de conexión.</p>';
  }
}

async function cargarPartidos(liga, season) {
  const contenedor = document.getElementById('partidos');
  const selector = document.getElementById('select-jornada');
  const leagueHeader = document.getElementById('league-header');

  contenedor.innerHTML = '<p class="loading">Cargando partidos...</p>';
  selector.disabled = true;
  selector.innerHTML = '<option>Cargando...</option>';
  leagueHeader.innerHTML = '';

  if (liga === 'ARG') {
    await cargarPartidosArgentina();
    return;
  }

  try {
    const res = await fetch(`${BASE_URL}/partidos?liga=${liga}&season=${season}`);
    const data = await res.json();

    let logoLiga = data.competition?.emblem || '';
    const nombreLiga = data.competition?.name || 'Premier League';

    // Armar Banner con Selector de Temporada
    leagueHeader.innerHTML = `
      <div class="league-banner">
        <div class="league-header-top">
          ${logoLiga ? `<img src="${logoLiga}" alt="${nombreLiga}" class="league-logo">` : '<span class="league-logo-fallback">🏆</span>'}
          <h2 class="league-title">${nombreLiga}</h2>
        </div>
        <div class="season-picker">
          <span>Temporada: 2026/2027</span>
        </div>
      </div>
    `;

    if (!res.ok || !data.matches || data.matches.length === 0) {
      contenedor.innerHTML = `<p class="error">No se encontraron partidos para esta temporada.</p>`;
      return;
    }

    partidosPorFecha = {};
    data.matches.forEach(match => {
      const numJornada = match.matchday || 1;
      const clave = `Fecha ${numJornada}`;
      if (!partidosPorFecha[clave]) partidosPorFecha[clave] = [];
      partidosPorFecha[clave].push(match);
    });

    listaFechas = Object.keys(partidosPorFecha).sort((a, b) => {
      const numA = parseInt(a.replace('Fecha ', '')) || 0;
      const numB = parseInt(b.replace('Fecha ', '')) || 0;
      return numA - numB;
    });

    selector.innerHTML = '';
    listaFechas.forEach((jornada, index) => {
      const option = document.createElement('option');
      option.value = index;
      option.textContent = jornada;
      selector.appendChild(option);
    });

    selector.disabled = false;
    indiceFechaActual = 0;
    actualizarVistaFecha();

    selector.onchange = (e) => {
      indiceFechaActual = parseInt(e.target.value);
      actualizarVistaFecha();
    };

  } catch (err) {
    contenedor.innerHTML = '<p class="error">Error de conexión.</p>';
  }
}

function actualizarVistaFecha() {
  const selector = document.getElementById('select-jornada');
  const btnPrev = document.getElementById('btn-prev-fecha');
  const btnNext = document.getElementById('btn-next-fecha');

  selector.value = indiceFechaActual;
  btnPrev.disabled = (indiceFechaActual === 0);
  btnNext.disabled = (indiceFechaActual === listaFechas.length - 1);

  const fechaClave = listaFechas[indiceFechaActual];
  renderizarFechaUnica(fechaClave);
}

function renderizarFechaUnica(jornadaSeleccionada) {
  const contenedor = document.getElementById('partidos');
  const partidos = partidosPorFecha[jornadaSeleccionada] || [];

  contenedor.innerHTML = '';

  partidos.forEach(match => {
    const fechaObj = new Date(match.utcDate);

    const diaSemana = fechaObj.toLocaleDateString('es-AR', { weekday: 'short' }).replace('.', '').toUpperCase();
    const diaMes = fechaObj.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' });
    const hora24 = fechaObj.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false });

    const localNombre = match.homeTeam.shortName || match.homeTeam.name;
    const visitanteNombre = match.awayTeam.shortName || match.awayTeam.name;
    const escudoLocal = match.homeTeam.crest
      ? `<img src="${match.homeTeam.crest}" class="crest-compact" alt="">`
      : '<span class="crest-fallback">⚽</span>';
    const escudoVisitante = match.awayTeam.crest
      ? `<img src="${match.awayTeam.crest}" class="crest-compact" alt="">`
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

document.getElementById('btn-prev-fecha').addEventListener('click', () => {
  if (indiceFechaActual > 0) {
    indiceFechaActual--;
    actualizarVistaFecha();
  }
});

document.getElementById('btn-next-fecha').addEventListener('click', () => {
  if (indiceFechaActual < listaFechas.length - 1) {
    indiceFechaActual++;
    actualizarVistaFecha();
  }
});

document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    const target = e.currentTarget;
    target.classList.add('active');
    
    ligaActual = target.getAttribute('data-liga');
    cargarTodo(ligaActual, temporadaActual);
  });
});

cargarTodo(ligaActual, temporadaActual);