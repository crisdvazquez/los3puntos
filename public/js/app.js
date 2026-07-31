const BASE_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.protocol === 'file:')
  ? 'https://los3puntos.onrender.com/api'
  : '/api';

const estado = {
    partidosPorFecha: {},
    listaFechas: [],
    indiceFecha: 0,
    liga: "PL",
    temporada: "2026"
};

async function cargarTodo(liga, season = estado.temporada) {
  cargarPosiciones(liga, season);
  cargarPartidos(liga, season);
}

async function cargarPosiciones(liga, season) {
  const contenedor = document.getElementById('posiciones-container');
  contenedor.innerHTML = '<p class="loading">Cargando posiciones...</p>';

  try {
    let tabla = [];

if (liga === "ARG") {

    const res = await fetch(`${BASE_URL}/arg/posiciones?season=${season}`);
    const data = await res.json();

    if (!res.ok || !data.table) {
        throw new Error();
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

async function cargarPartidos(liga, season) {
  const contenedor = document.getElementById('partidos');
  const selector = document.getElementById('select-jornada');
  const leagueHeader = document.getElementById('league-header');

  contenedor.innerHTML = '<p class="loading">Cargando partidos...</p>';
  selector.disabled = true;
  selector.innerHTML = '<option>Cargando...</option>';
  leagueHeader.innerHTML = '';

  let partidos = [];
  let nombreLiga = "";
  let logoLiga = "";

if (liga === "ARG") {

    const res = await fetch(`${BASE_URL}/arg/partidos?season=${season}`);
    const data = await res.json();

    if (!res.ok || !data.events) {
        throw new Error("No se pudieron obtener los partidos.");
    }

    partidos = data.events.map(adaptarPartidoArgentina);

    renderBannerLiga({

    nombre: "Liga Profesional Argentina",

    logo: "",

    bandera: "🇦🇷",

    temporada: "2026"

    });

} else {

    const res = await fetch(`${BASE_URL}/partidos?liga=${liga}&season=${season}`);
    const data = await res.json();

    if (!res.ok || !data.matches) {
        throw new Error("No se pudieron obtener los partidos.");
    }

    partidos = data.matches.map(adaptarPartidoFootballData);

    nombreLiga = data.competition.name;
    logoLiga = data.competition.emblem;

}

  try {
    const res = await fetch(`${BASE_URL}/partidos?liga=${liga}&season=${season}`);
    const data = await res.json();

    let logoLiga = data.competition?.emblem || '';
    const nombreLiga = data.competition?.name || 'Premier League';

    renderBannerLiga({

    nombre: nombreLiga,

    logo: logoLiga,

    temporada: "2026/2027"

    });

    if (!res.ok || !data.matches || data.matches.length === 0) {
      contenedor.innerHTML = `<p class="error">No se encontraron partidos para esta temporada.</p>`;
      return;
    }

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
    contenedor.innerHTML = '<p class="error">Error de conexión.</p>';
  }
}

function actualizarVistaFecha() {
  const selector = document.getElementById('select-jornada');
  const btnPrev = document.getElementById('btn-prev-fecha');
  const btnNext = document.getElementById('btn-next-fecha');

  selector.value = estado.indiceFecha;
  btnPrev.disabled = (estado.indiceFecha === 0);
  btnNext.disabled = (estado.indiceFecha === estado.listaFechas.length - 1);

  const fechaClave = estado.listaFechas[estado.indiceFecha];
  renderizarFechaUnica(fechaClave);
}

function renderizarFechaUnica(jornadaSeleccionada) {
  const contenedor = document.getElementById('partidos');
  const partidos = estado.partidosPorFecha[jornadaSeleccionada] || [];

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
  if (estado.indiceFecha > 0) {
    estado.indiceFecha--;
    actualizarVistaFecha();
  }
});

document.getElementById('btn-next-fecha').addEventListener('click', () => {
  if (estado.indiceFecha < estado.listaFechas.length - 1) {
    estado.indiceFecha++;
    actualizarVistaFecha();
  }
});

document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    const target = e.currentTarget;
    target.classList.add('active');
    
    estado.liga = target.getAttribute('data-liga');
    cargarTodo(estado.liga, estado.temporada);
  });
});

cargarTodo(estado.liga, estado.temporada);