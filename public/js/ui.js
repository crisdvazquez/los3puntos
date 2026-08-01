export function mostrarCargando() {
    const tabla = document.getElementById('tabla-posiciones');
    const partidos = document.getElementById('partidos-container');
    if (tabla) tabla.innerHTML = '<tr><td colspan="9" style="text-align:center; padding:20px; color:var(--text-muted);">Cargando posiciones...</td></tr>';
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
        tabla.innerHTML = '<tr><td colspan="9" style="text-align:center;">No hay posiciones disponibles</td></tr>';
        return;
    }

    filas.forEach(item => {
        const tr = document.createElement('tr');
        
        if (item.isHeader) {
            tr.innerHTML = `<td colspan="9" style="text-align:center; font-weight:bold; background-color: rgba(255,255,255,0.05); color: var(--accent-color); padding:6px;">${item.strTeam}</td>`;
        } else {
            const dgFormateado = item.intGoalDifference > 0 ? `+${item.intGoalDifference}` : item.intGoalDifference;
            tr.innerHTML = `
                <td>${item.intRank}</td>
                <td style="text-align:left; display:flex; align-items:center; gap:6px;">
                    <img src="${item.strBadge}" class="team-badge" alt="" onerror="this.style.display='none'">
                    <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:140px;">${item.strTeam}</span>
                </td>
                <td><strong style="color:var(--accent-color);">${item.intPoints}</strong></td>
                <td>${item.intGoalsFor}</td>
                <td>${item.intGoalsAgainst}</td>
                <td>${dgFormateado}</td>
                <td>${item.intWin}</td>
                <td>${item.intDraw}</td>
                <td>${item.intLoss}</td>
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

export function renderizarPartidos(partidos, mostrarLigaEnCard = false) {
    const contenedor = document.getElementById('partidos-container');
    if (!contenedor) return;
    contenedor.innerHTML = '';

    if (!partidos || partidos.length === 0) {
        contenedor.innerHTML = '<p style="text-align:center; color: var(--text-muted); padding:20px;">No hay partidos programados para hoy.</p>';
        return;
    }

    partidos.forEach(m => {
        const card = document.createElement('div');
        card.className = 'match-card';
        
        let fechaFormateada = m.dateEvent || '';
        if (m.dateEvent) {
            const [year, month, day] = m.dateEvent.split('-');
            const dateObj = new Date(year, month - 1, day);
            const dias = ['DOM', 'LUN', 'MAR', 'MIE', 'JUE', 'VIE', 'SAB'];
            const diaSemana = dias[dateObj.getDay()];
            fechaFormateada = `${diaSemana} ${parseInt(day)}/${parseInt(month)}`;
        }

        const hora = m.strTime || '00:00';

        let centroHtml = '';
        if (m.strStatus === 'IN_PLAY') {
            centroHtml = `
                <div class="score-box">${m.intHomeScore ?? 0} - ${m.intAwayScore ?? 0}</div>
                <div class="badge-live">EN VIVO</div>
            `;
        } else if (m.strStatus === 'FINISHED') {
            centroHtml = `
                <div class="score-box">${m.intHomeScore ?? 0} - ${m.intAwayScore ?? 0}</div>
                <div style="font-size:0.65rem; color:var(--text-muted);">FINAL</div>
            `;
        } else {
            centroHtml = `<span class="vs-text">VS</span>`;
        }

        // Si estamos en Home, mostramos el nombre de la liga arriba o al costado de la fecha
        let badgeLigaHtml = '';
        if (mostrarLigaEnCard && m.strLeagueName) {
            badgeLigaHtml = `<div style="font-size: 0.65rem; color: var(--accent-color); margin-top:2px;">${m.strLeagueName}</div>`;
        }

        // ORDEN EXACTO SOLICITADO: Nombre Local - Escudo Local - VS - Escudo Visitante - Nombre Visitante
        card.innerHTML = `
            <div class="match-date-col">
                <div>${fechaFormateada}</div>
                <div style="font-weight:bold; color:var(--text-color);">${hora}</div>
                ${badgeLigaHtml}
            </div>
            <div class="match-teams-col">
                <div class="team-home">
                    <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${m.strHomeTeam}</span>
                    <img src="${m.strHomeTeamBadge}" class="team-badge" alt="" onerror="this.style.display='none'">
                </div>
                <div class="match-center">
                    ${centroHtml}
                </div>
                <div class="team-away">
                    <img src="${m.strAwayTeamBadge}" class="team-badge" alt="" onerror="this.style.display='none'">
                    <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${m.strAwayTeam}</span>
                </div>
            </div>
        `;
        contenedor.appendChild(card);
    });
}