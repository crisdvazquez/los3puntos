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

export function actualizarControlesHome(offsetDias = 0, onNavigate = null) {
    const ayerBtn = document.getElementById('btn-home-prev-day');
    const mananaBtn = document.getElementById('btn-home-next-day');
    const visible = typeof onNavigate === 'function';

    if (!visible) {
        [ayerBtn, mananaBtn].forEach(btn => {
            if (!btn) return;
            btn.hidden = true;
            btn.disabled = true;
        });
        return;
    }

    // When showing tomorrow (offset=1): hide mañana, rename ayer → hoy
    // When showing yesterday (offset=-1): hide ayer, rename mañana → hoy
    // When today (offset=0): show both with directional labels
    if (ayerBtn) {
        if (offsetDias === 1) {
            ayerBtn.hidden = false;
            ayerBtn.disabled = false;
            ayerBtn.textContent = '◀ HOY';
            ayerBtn.setAttribute('aria-label', 'Ver partidos de hoy');
            ayerBtn.onclick = () => onNavigate(0);
        } else if (offsetDias === -1) {
            ayerBtn.hidden = true;
            ayerBtn.disabled = true;
        } else {
            ayerBtn.hidden = false;
            ayerBtn.disabled = false;
            ayerBtn.textContent = '◀ AYER';
            ayerBtn.setAttribute('aria-label', 'Ver partidos de ayer');
            ayerBtn.onclick = () => onNavigate(-1);
        }
    }

    if (mananaBtn) {
        if (offsetDias === -1) {
            mananaBtn.hidden = false;
            mananaBtn.disabled = false;
            mananaBtn.textContent = 'HOY ▶';
            mananaBtn.setAttribute('aria-label', 'Ver partidos de hoy');
            mananaBtn.onclick = () => onNavigate(0);
        } else if (offsetDias === 1) {
            mananaBtn.hidden = true;
            mananaBtn.disabled = true;
        } else {
            mananaBtn.hidden = false;
            mananaBtn.disabled = false;
            mananaBtn.textContent = 'MAÑANA ▶';
            mananaBtn.setAttribute('aria-label', 'Ver partidos de mañana');
            mananaBtn.onclick = () => onNavigate(1);
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
        // "Regular Season - 5" → "Fecha 5"
        // "Clausura - 2" or "Clausura -3" → "Fecha 2"/"Fecha 3"
        let label = round.replace(/Regular Season\s*-\s*/i, 'Fecha ');
        label = label.replace(/^[^-–—\d]*[-–—]\s*/i, 'Fecha ');
        option.textContent = label;
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
        let minuteDisplay = m.displayMinute;
        if (!minuteDisplay) {
            if (m.statusShort === 'HT') minuteDisplay = 'ET';
            else if (m.intElapsed) minuteDisplay = `${m.intElapsed}'`;
            else minuteDisplay = m.statusLong || '';
        }
        centroHtml = `
            <div class="badge-live">EN VIVO</div>
            <div class="score-box">${escaparHtml(m.intHomeScore ?? 0)} - ${escaparHtml(m.intAwayScore ?? 0)}</div>
            <div class="match-status-note">${escaparHtml(minuteDisplay)}</div>
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

    // Render scorers grouped by team
    let scorersHtml = '';
    if (Array.isArray(m.scorers) && m.scorers.length > 0) {
        const homeGoals = [];
        const awayGoals = [];
        const unknownGoals = [];

        m.scorers.forEach(scorer => {
            if (scorer.team === m.strHomeTeam) {
                homeGoals.push(scorer);
            } else if (scorer.team === m.strAwayTeam) {
                awayGoals.push(scorer);
            } else {
                unknownGoals.push(scorer);
            }
        });

        unknownGoals.forEach((scorer, index) => {
            if (homeGoals.length <= awayGoals.length) {
                homeGoals.push(scorer);
            } else {
                awayGoals.push(scorer);
            }
        });

        const formatGoalMinute = (minute, extra) => {
            if (minute === null || minute === undefined) return '';
            if (extra && (minute === 45 || minute === 90)) return `${minute}+${extra}'`;
            return `${minute}'`;
        };
        const formatGoal = s => {
            const min = formatGoalMinute(s.minute, s.extra);
            const playerName = String(s.player || '?').trim().split(/\s+/).pop();
            return `<span class="scorer-item">${min ? '<span class="scorer-min">' + escaparHtml(min) + '</span> ' : ''}${escaparHtml(playerName)}</span>`;
        };
        if (homeGoals.length > 0 || awayGoals.length > 0) {
            scorersHtml = `
                <div class="match-scorers">
                    <div class="scorers-home">${homeGoals.map(formatGoal).join(' ')}</div>
                    <div class="scorers-away">${awayGoals.map(formatGoal).join(' ')}</div>
                </div>
            `;
        }
    }

    return `
        <article class="match-card${scorersHtml ? ' match-card--with-scorers' : ''}">
            <div class="match-date-col">
                <div class="match-date">${escaparHtml(fechaFormateada)}</div>
                <div class="match-time">${escaparHtml(hora)}</div>
                ${badgeLigaHtml}
            </div>
            <div class="match-body">
                <div class="match-teams-col">
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
                ${scorersHtml}
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

            const grupo = document.createElement('details');
            grupo.className = 'match-group';
            grupo.open = true;
            grupo.innerHTML = `
                <summary class="match-group-title">${escaparHtml(liga)}</summary>
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
