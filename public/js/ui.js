export function mostrarCargando() {
    const tabla = document.getElementById('tabla-posiciones');
    const partidos = document.getElementById('partidos-container');
    if (tabla) tabla.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:20px;">Cargando...</td></tr>';
    if (partidos) partidos.innerHTML = '<p style="text-align:center; padding:20px;">Cargando fixture...</p>';
}

export function renderizarTabla(filas) {
    const tabla = document.getElementById('tabla-posiciones');
    if (!tabla) return;
    tabla.innerHTML = '';

    if (filas.length === 0) {
        tabla.innerHTML = '<tr><td colspan="5" style="text-align:center;">No hay posiciones disponibles</td></tr>';
        return;
    }

    filas.forEach(item => {
        const tr = document.createElement('tr');
        
        // Si es el separador de Zona A / Zona B de Argentina
        if (item.isHeader) {
            tr.innerHTML = `<td colspan="5" style="text-align:center; font-weight:bold; background-color: var(--border-color); color: var(--accent-color); padding:10px;">${item.strTeam}</td>`;
        } else {
            // Fila normal de equipo
            tr.innerHTML = `
                <td><strong>${item.intRank}</strong></td>
                <td style="text-align:left; display:flex; align-items:center; gap:10px;">
                    <img src="${item.strBadge}" style="width:20px; height:20px; object-fit:contain;" alt="">
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

    if (partidos.length === 0) {
        contenedor.innerHTML = '<p style="text-align:center;">No hay partidos cargados para esta fecha.</p>';
        return;
    }

    partidos.forEach(m => {
        const div = document.createElement('div');
        div.className = 'match-card';
        
        const gLocal = m.intHomeScore !== null ? m.intHomeScore : '-';
        const gVisit = m.intAwayScore !== null ? m.intAwayScore : '-';
        
        let statusHtml = `<span style="font-size:0.8rem; color:var(--text-muted);">${m.strTime}</span>`;
        if (m.strStatus === 'IN_PLAY') statusHtml = '<span class="badge-live" style="color:var(--live-color); font-weight:bold; font-size:0.8rem;">EN VIVO</span>';
        else if (m.strStatus === 'FINISHED') statusHtml = '<span style="font-size:0.8rem; color:var(--text-muted);">FIN</span>';

        div.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; width:100%;">
                <div style="display:flex; align-items:center; gap:8px; width:40%;">
                    <img src="${m.strHomeTeamBadge}" style="width:20px; height:20px; object-fit:contain;" alt="">
                    <span>${m.strHomeTeam}</span>
                </div>
                <div style="text-align:center;">
                    <div style="font-weight:bold; background-color:var(--card-bg); padding:4px 10px; border-radius:6px; margin-bottom:4px;">${gLocal} - ${gVisit}</div>
                    ${statusHtml}
                </div>
                <div style="display:flex; align-items:center; gap:8px; width:40%; justify-content:flex-end;">
                    <span>${m.strAwayTeam}</span>
                    <img src="${m.strAwayTeamBadge}" style="width:20px; height:20px; object-fit:contain;" alt="">
                </div>
            </div>
        `;
        contenedor.appendChild(div);
    });
}