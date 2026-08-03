const ESCUDO_FALLBACK = "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='14' fill='%233a506b'/%3E%3Cpath d='M32 12l16 6v12c0 10.5-6.7 19.8-16 22-9.3-2.2-16-11.5-16-22V18l16-6z' fill='%236fffe9' fill-opacity='.35'/%3E%3C/svg%3E";

function escaparHtml(valor) {
    return String(valor ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function renderizarEscudo(src, nombreEquipo) {
    const escudoSrc = escaparHtml(src || ESCUDO_FALLBACK);
    const alt = escaparHtml(`Escudo de ${nombreEquipo || 'equipo'}`);

    return `
        <img
            src="${escudoSrc}"
            class="team-badge"
            alt="${alt}"
            data-fallback-src="${ESCUDO_FALLBACK}"
            onerror="this.onerror=null;this.src=this.dataset.fallbackSrc;"
        >
    `;
}

export function mostrarCargando() {
    const tabla = document.getElementById('tabla-posiciones');
    const partidos = document.getElementById('partidos-container');
    if (tabla) tabla.innerHTML = '<tr><td colspan="10" style="text-align:center; padding:20px; color:var(--text-muted);">Cargando posiciones...</td></tr>';
    if (partidos) partidos.innerHTML = '<p style="text-align:center; padding:20px; color:var(--text-muted);">Cargando partidos...</p>';
}

export function actualizarHeaderLiga(nombre, logo) {
    const titleElem = document.getElementById('league-title');
    const logoElem = document.getElementById('league-logo');
    if (titleElem) titleElem.textContent = nombre;
    if (logoElem) {
        if (logo) {
            logoElem.src = logo;
            logoElem.style.display = 'block';
        } else {
            logoElem.style.display = 'none';
        }
    }
}

export function renderizarTabla(filas) {
    const tabla = document.getElementById('tabla-posiciones');
    if (!tabla) return;
    tabla.innerHTML = '';

    if (!filas || filas.length === 0) {
        tabla.innerHTML = '<tr><td colspan="10" style="text-align:center;">No hay posiciones disponibles</td></tr>';
        return;
    }

    filas.forEach(item => {
        const tr = document.createElement('tr');
        
        if (item.isHeader) {
            tr.className = 'standings-group-row';
            tr.innerHTML = `<td colspan="10">${escaparHtml(item.strTeam)}</td>`;
        } else {
            const dgFormateado = item.intGoalDifference > 0 ? `+${item.intGoalDifference}` : item.intGoalDifference;
            tr.innerHTML = `
                <td class="standings-rank-cell">${escaparHtml(item.intRank)}</td>
                <td class="team-name-cell">
                    ${renderizarEscudo(item.strBadge, item.strTeam)}
                    <span class="team-name-text">${escaparHtml(item.strTeam)}</span>
                </td>
                <td class="standings-points-cell"><strong>${escaparHtml(item.intPoints)}</strong></td>
                <td>${escaparHtml(item.intPlayed)}</td>
                <td>${escaparHtml(item.intGoalsFor)}</td>
                <td>${escaparHtml(item.intGoalsAgainst)}</td>
                <td>${escaparHtml(dgFormateado)}</td>
                <td>${escaparHtml(item.intWin)}</td>
                <td>${escaparHtml(item.intDraw)}</td>
                <td>${escaparHtml(item.intLoss)}</td>
            `;
        }
        tabla.appendChild(tr);
    });
}

export function renderizarSelectorFechas(rounds, currentRound, onSelectRound) {
    const select = document.getElementById('select-round');
    if (!select) return;
    select.innerHTML = '';

    rounds.forEach(round => {
        const option = document.createElement('option');
        option.value = round;
        option.textContent = round.replace('Regular Season - ', 'Fecha ');
        if (round === currentRound) option.selected = true;
        select.appendChild(option);
    });

    select.onchange = (e) => onSelectRound(e.target.value);
}

function construirCardPartido(m, { mostrarLigaEnCard = false, codigoLiga = null } = {}) {
    let fechaFormateada = m.dateEvent || '';
    if (m.dateEvent) {
        const [year, month, day] = m.dateEvent.split('-');
        const dateObj = new Date(year, month - 1, day);
        const dias = ['DOM', 'LUN', 'MAR', 'MIE', 'JUE', 'VIE', 'SAB'];
        const diaSemana = dias[dateObj.getDay()];
        fechaFormateada = `${diaSemana} ${parseInt(day)}/${parseInt(month)}`;
    }

    const hora = m.fixtureUTC ? (
        (codigoLiga === 'ARG' || codigoLiga === 'PN')
            ? new Date(m.fixtureUTC).toLocaleTimeString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', hour: '2-digit', minute: '2-digit', hour12: false })
            : new Date(m.fixtureUTC).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
    ) : (m.strTime || '00:00');

    let centroHtml = '';
    if (m.strStatus === 'IN_PLAY') {
        const minuteDisplay = m.displayMinute || (m.intElapsed ? `${m.intElapsed}'` : '');
        centroHtml = `
            <div class="score-box">${escaparHtml(m.intHomeScore ?? 0)} - ${escaparHtml(m.intAwayScore ?? 0)}</div>
            <div class="badge-live">EN VIVO</div>
            <div class="match-status-note">${escaparHtml(minuteDisplay || (m.statusLong || ''))}</div>
        `;
    } else if (m.strStatus === 'FINISHED') {
        centroHtml = `
            <div class="score-box">${escaparHtml(m.intHomeScore ?? 0)} - ${escaparHtml(m.intAwayScore ?? 0)}</div>
            <div class="match-status-note">FINAL</div>
        `;
    } else {
        centroHtml = `<span class="vs-text">VS</span>`;
    }

    const badgeLigaHtml = (mostrarLigaEnCard && m.strLeagueName)
        ? `<div class="match-league-label">${escaparHtml(m.strLeagueName)}</div>`
        : '';

    const tieneGoles = (Array.isArray(m.golesLocales) && m.golesLocales.length > 0) ||
                       (Array.isArray(m.golesVisitante) && m.golesVisitante.length > 0);

    const golesLocalesHtml = Array.isArray(m.golesLocales) && m.golesLocales.length > 0
        ? m.golesLocales.map(g => `<span class="scorer-name">${escaparHtml(g)}</span>`).join('')
        : '';

    const golesVisitanteHtml = Array.isArray(m.golesVisitante) && m.golesVisitante.length > 0
        ? m.golesVisitante.map(g => `<span class="scorer-name">${escaparHtml(g)}</span>`).join('')
        : '';

    const golesRowHtml = tieneGoles ? `
        <div class="scorers-row">
            <div class="scorers-home">${golesLocalesHtml}</div>
            <div class="scorers-center">⚽</div>
            <div class="scorers-away">${golesVisitanteHtml}</div>
        </div>
    ` : '';

    return `
        <article class="match-card${tieneGoles ? ' match-card--with-scorers' : ''}">
            <div class="match-date-col">
                <div class="match-date">${escaparHtml(fechaFormateada)}</div>
                <div class="match-time">${escaparHtml(hora)}</div>
                ${badgeLigaHtml}
            </div>
            <div class="match-teams-col">
                <div class="match-teams-row">
                    <div class="team-home">
                        <span class="team-name">${escaparHtml(m.strHomeTeam)}</span>
                        ${renderizarEscudo(m.strHomeTeamBadge, m.strHomeTeam)}
                    </div>
                    <div class="match-center">
                        ${centroHtml}
                    </div>
                    <div class="team-away">
                        ${renderizarEscudo(m.strAwayTeamBadge, m.strAwayTeam)}
                        <span class="team-name">${escaparHtml(m.strAwayTeam)}</span>
                    </div>
                </div>
                ${golesRowHtml}
            </div>
        </article>
    `;
}

export function renderizarPartidos(partidos, { agruparPorLiga = false, mostrarLigaEnCard = false, codigoLiga = null } = {}) {
    const contenedor = document.getElementById('partidos-container');
    if (!contenedor) return;
    contenedor.innerHTML = '';

    if (!partidos || partidos.length === 0) {
        contenedor.innerHTML = '<p style="text-align:center; color: var(--text-muted); padding:20px;">No hay partidos programados.</p>';
        return;
    }

    if (agruparPorLiga) {
        const grupos = new Map();

        partidos.forEach(partido => {
            const liga = partido.strLeagueName || 'Otros';
            if (!grupos.has(liga)) grupos.set(liga, []);
            grupos.get(liga).push(partido);
        });

        grupos.forEach((listaPartidos, liga) => {
            if (!listaPartidos.length) return;

            const grupo = document.createElement('section');
            grupo.className = 'match-group';
            grupo.innerHTML = `
                <h3 class="match-group-title">${escaparHtml(liga)}</h3>
                <div class="match-group-list"></div>
            `;

            const lista = grupo.querySelector('.match-group-list');
            lista.innerHTML = listaPartidos.map(partido => construirCardPartido(partido, { codigoLiga, mostrarLigaEnCard })).join('');
            contenedor.appendChild(grupo);
        });
        return;
    }

    contenedor.innerHTML = partidos.map(partido => construirCardPartido(partido, { codigoLiga, mostrarLigaEnCard })).join('');
}
