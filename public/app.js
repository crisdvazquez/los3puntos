async function cargarPartidos() {
  const contenedor = document.getElementById('partidos');
  try {
    const res = await fetch('/api/partidos');
    const data = await res.json();

    if (!res.ok || !data.matches) {
      contenedor.innerHTML = `<p style="color: #ef4444;">Error: ${data.error || 'No se pudieron cargar los datos'}</p>`;
      return;
    }

    contenedor.innerHTML = '';
    
    data.matches.forEach(match => {
      const card = document.createElement('div');
      card.className = 'match-card';
      card.innerHTML = `
        <div class="team">
          <img src="${match.homeTeam.crest}" alt="${match.homeTeam.name}" class="crest">
          <span>${match.homeTeam.shortName || match.homeTeam.name}</span>
        </div>
        <span class="vs">VS</span>
        <div class="team">
          <span>${match.awayTeam.shortName || match.awayTeam.name}</span>
          <img src="${match.awayTeam.crest}" alt="${match.awayTeam.name}" class="crest">
        </div>
      `;
      contenedor.appendChild(card);
    });

  } catch (err) {
    contenedor.innerHTML = '<p style="color: #ef4444;">Error de conexión con el servidor.</p>';
  }
}

cargarPartidos();