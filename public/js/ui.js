export function mostrarCargando() {
    const tabla = document.getElementById('tabla-posiciones');
    const partidos = document.getElementById('partidos-container');
    if (tabla) tabla.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:20px; color:var(--text-muted);">Cargando posiciones...</td></tr>';
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
        tabla.innerHTML = '<tr><td colspan="5" style="text-align:center;">No hay posiciones disponibles</td></tr>';
        return;
    }

    filas.forEach(item => {
        const tr = document.createElement('tr');
        
        if (item.isHeader) {
            tr.innerHTML = `<td colspan="5" style="text-align:center; font-weight:bold; background-color: rgba(255,255,255,0.05); color: var(--accent-color); padding:8px;">${item.strTeam}</td>`;
        } else {
            tr.innerHTML = `
                <td><strong>${item.intRank}</strong></td>
                <td style="text-align:left; display:flex; align-items:center; gap:8px;">
                    <img src="${item.strBadge}" class="team-badge" alt="" onerror="this.style.display='none'">
                    <span>${item.strTeam}</span>
                </td>
                <td>${item.intPlayed}</td>
                <td>${item.intGoalDifference > 0 ? '+' + item.intGoalDifference : item.intGoalDifference}</td>
                <td><strong>${item.intPoints}</strong></td>
            `;
        }
        tabla.appendChild(tr);
    });
}

export function renderizarPartidos(partidos) {
    const contenedor = document.getElementById('partidos-container');
    if (!contenedor) return;
    contenedor.innerHTML = '';

    if (!partidos || partidos.length === 0) {
        contenedor.innerHTML = '<p style="text-align:center; color: var(--text-muted); padding:20px;">No hay partidos cargados para esta fecha.</p>';
        return;
    }

    partidos.forEach(m => {
        const card = document.createElement('div');
        card.className = 'match-card';
        
        // Formatear Fecha (ej. SAB 1/8) y hora
        let fechaFormateada = m.dateEvent || '';
        if (m.dateEvent) {
            const [year, month, day] = m.dateEvent.split('-');
            const dateObj = new Date(year, month - 1, day);
            const dias = ['DOM', 'LUN', 'MAR', 'MIE', 'JUE', 'VIE', 'SAB'];
            const diaSemana = dias[dateObj.getDay()];
            fechaFormateada = `${diaSemana} ${parseInt(day)}/${parseInt(month)}`;
        }

        const hora = m.strTime || '00:00';

        // Estado del partido o resultado
        let centroHtml = '';
        if (m.strStatus === 'IN_PLAY') {
            centroHtml = `
                <div class="score-box">${m.intHomeScore ?? 0} - ${m.intAwayScore ?? 0}</div>
                <div class="badge-live">EN VIVO</div>
            `;
        } else if (m.strStatus === 'FINISHED') {
            centroHtml = `
                <div class="score-box">${m.intHomeScore ?? 0} - ${m.intAwayScore ?? 0}</div>
                <div style="font-size:0.7rem; color:var(--text-muted);">FINAL</div>
            `;
        } else {
            centroHtml = `<span class="vs-text">VS</span>`;
        }

        card.innerHTML = `
            <div class="match-date-col">
                <div>${fechaFormateada}</div>
                <div style="font-weight:bold; color:var(--text-color);">${hora}</div>
            </div>
            <div class="match-teams-col">
                <div class="team-side">
                    <img src="${m.strHomeTeamBadge}" class="team-badge" alt="" onerror="this.style.display='none'">
                    <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${m.strHomeTeam}</span>
                </div>
                <div class="match-center">
                    ${centroHtml}
                </div>
                <div class="team-side away">
                    <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${m.strAwayTeam}</span>
                    <img src="${m.strAwayTeamBadge}" class="team-badge" alt="" onerror="this.style.display='none'">
                </div>
            </div>
        `;
        contenedor.appendChild(card);
    });
}