const BASE_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.protocol === 'file:')
  ? 'https://los3puntos.onrender.com/api/partidos'
  : '/api/partidos';

let partidosPorFecha = {};
let ligaActual = 'PL'; // Premier League por defecto

async function cargarPartidos(liga) {
  const contenedor = document.getElementById('partidos');
  const selector = document.getElementById('select-jornada');

  contenedor.innerHTML = '<p class="loading">Cargando partidos...</p>';
  selector.disabled = true;
  selector.innerHTML = '<option>Cargando fechas...</option>';

  try {
    // Enviamos el parámetro de la liga en la URL
    const res = await fetch(`${BASE_URL}?liga=${liga}`);
    const data = await res.json();

    if (!res.ok || !data.matches || data.matches.length === 0) {
      contenedor.innerHTML = `<p class="error">Error: ${data?.error || 'No se encontraron partidos'}</p>`;
      selector.innerHTML = '<option>Sin fechas</option>';
      return;
    }

    // 1. Agrupar partidos por jornada
    partidosPorFecha = {};
    data.matches.forEach(match => {
      const numJornada = match.matchday || 1;
      const clave = `Fecha ${numJornada}`;
      if (!partidosPorFecha[clave]) {
        partidosPorFecha[clave] = [];
      }
      partidosPorFecha[clave].push(match);
    });

    // 2. Ordenar fechas numéricamente
    const listaFechas = Object.keys(partidosPorFecha).sort((a, b) => {
      const numA = parseInt(a.replace('Fecha ', '')) || 0;
      const numB = parseInt(b.replace('Fecha ', '')) || 0;
      return numA - numB;
    });

    // 3. Llenar el selector desplegable
    selector.innerHTML = '';
    listaFechas.forEach(jornada => {
      const option = document.createElement('option');
      option.value = jornada;
      option.textContent = jornada;
      selector.appendChild(option);
    });

    selector.disabled = false;

    // 4. Renderizar la primera fecha de la nueva liga
    renderizarFechaUnica(listaFechas[0]);

    // Escuchar cambios en el selector de fechas
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

  if (partidos.length === 0) {
    contenedor.innerHTML += '<p class="error">No hay partidos registrados para esta fecha.</p>';
    return;
  }

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

// Configurar los clicks en los botones de las solapas
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    // Quitar estado activo de todos los botones
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    
    // Activar el botón cliqueado
    e.target.classList.add('active');
    
    // Cargar la nueva liga seleccionada
    ligaActual = e.target.getAttribute('data-liga');
    cargarPartidos(ligaActual);
  });
});

// Carga inicial
cargarPartidos(ligaActual);