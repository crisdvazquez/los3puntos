const UI = {
    posicionesContainer: document.getElementById('posiciones-container'),
    partidosContainer: document.getElementById('partidos'),
    leagueHeaderContainer: document.getElementById('league-header'),
    selectJornada: document.getElementById('select-jornada'),
    btnPrevFecha: document.getElementById('btn-prev-fecha'),
    btnNextFecha: document.getElementById('btn-next-fecha'),
    tabButtons: document.querySelectorAll('.tab-btn'),

    marcarTabActiva(codigoLiga) {
        this.tabButtons.forEach(btn => {
            if (btn.getAttribute('data-liga') === codigoLiga) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    },

    mostrarCargando() {
        if (this.posicionesContainer) {
            this.posicionesContainer.innerHTML = '<div class="loading">Cargando posiciones...</div>';
        }
        if (this.partidosContainer) {
            this.partidosContainer.innerHTML = '<div class="loading">Cargando partidos...</div>';
        }
    },

    mostrarErrorPosiciones(mensaje) {
        if (this.posicionesContainer) {
            this.posicionesContainer.innerHTML = `<p class="error">⚠️ ${mensaje}</p>`;
        }
    },

    mostrarErrorPartidos(mensaje) {
        if (this.partidosContainer) {
            this.partidosContainer.innerHTML = `<p class="error">⚠️ ${mensaje}</p>`;
        }
    },

    actualizarHeaderLiga(nombre, logo) {
        if (!this.leagueHeaderContainer) return;
        let html = `<h2>${nombre}</h2>`;
        if (logo) {
            html = `<div class="league-banner"><img src="${logo}" alt="${nombre}" class="league-logo-img"> <h2>${nombre}</h2></div>`;
        }
        this.leagueHeaderContainer.innerHTML = html;
    },

    actualizarControlesJornada(jornadas, jornadaSeleccionada) {
        if (!this.selectJornada) return;

        if (!jornadas || jornadas.length === 0) {
            this.selectJornada.innerHTML = '<option>Sin Fechas</option>';
            this.selectJornada.disabled = true;
            return;
        }

        let html = '';
        jornadas.forEach(j => {
            const selected = j === jornadaSeleccionada ? 'selected' : '';
            html += `<option value="${j}" ${selected}>${j}</option>`;
        });

        this.selectJornada.innerHTML = html;
        this.selectJornada.disabled = false;
    },

    actualizarEstadoBotonesNav(indice, total) {
        if (this.btnPrevFecha) {
            this.btnPrevFecha.disabled = indice <= 0;
        }
        if (this.btnNextFecha) {
            this.btnNextFecha.disabled = indice >= total - 1;
        }
    },

    renderizarTabla(filas) {
        if (!this.posicionesContainer) return;

        if (!filas || filas.length === 0) {
            this.posicionesContainer.innerHTML = '<p>No hay posiciones disponibles para esta liga.</p>';
            return;
        }

        let html = `
            <table class="standings-table">
                <thead>
                    <tr>
                        <th>Pos</th>
                        <th>Equipo</th>
                        <th>PJ</th>
                        <th>DG</th>
                        <th>Pts</th>
                    </tr>
                </thead>
                <tbody>
        `;

        filas.forEach(row => {
            if (row.isHeader) {
                html += `<tr class="group-header"><td colspan="5"><strong>${row.strTeam}</strong></td></tr>`;
            } else {
                html += `
                    <tr>
                        <td>${row.rank}</td>
                        <td class="team-cell">
                            ${row.badge ? `<img src="${row.badge}" alt="" class="team-badge" />` : ''}
                            <span>${row.teamName}</span>
                        </td>
                        <td>${row.played}</td>
                        <td>${row.goalDiff > 0 ? '+' + row.goalDiff : row.goalDiff}</td>
                        <td><strong>${row.points}</strong></td>
                    </tr>
                `;
            }
        });

        html += '</tbody></table>';
        this.posicionesContainer.innerHTML = html;
    },

    renderizarPartidos(partidos) {
        if (!this.partidosContainer) return;

        if (!partidos || partidos.length === 0) {
        this.partidosContainer.innerHTML = '<p>No hay partidos para mostrar en esta fecha.</p>';
        return;
        }

        let html = '<div class="matches-grid">';
        partidos.forEach(match => {
        const esEnVivo = match.status === 'IN_PLAY';
        const estadoClase = esEnVivo ? 'live' : 'scheduled';
        const tieneGoles = match.homeScore !== '-' && match.homeScore !== null;

        html += `
            <div class="match-card ${estadoClase}">
                <div class="match-header">
                    <span class="match-status">${match.timeOrStatus}</span>
                    ${match.date ? `<span class="match-date">${match.date}</span>` : ''}
                </div>
                <div class="match-body">
                    <!-- LOCAL: Nombre + Escudo -->
                    <div class="team home">
                        <span class="team-name">${match.homeTeam}</span>
                        ${match.homeBadge ? `<img src="${match.homeBadge}" class="team-logo" alt="" />` : ''}
                    </div>

                    <!-- CENTRO: Marcador o VS -->
                    <div class="match-center">
                        <span class="score">${match.homeScore}</span>
                        <span class="vs-text">-</span>
                        <span class="score">${match.awayScore}</span>
                    </div>

                    <!-- VISITANTE: Escudo + Nombre -->
                    <div class="team away">
                        ${match.awayBadge ? `<img src="${match.awayBadge}" class="team-logo" alt="" />` : ''}
                        <span class="team-name">${match.awayTeam}</span>
                    </div>
                </div>
            </div>
        `;
        });
    html += '</div>';

    this.partidosContainer.innerHTML = html;
    }
};