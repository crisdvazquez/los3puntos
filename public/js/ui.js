const UI = {
    posicionesContainer: document.getElementById('posiciones-container'),
    partidosContainer: document.getElementById('partidos'),
    leagueHeaderContainer: document.getElementById('league-header'),
    selectJornada: document.getElementById('select-jornada'),
    btnPrevFecha: document.getElementById('btn-prev-fecha'),
    btnNextFecha: document.getElementById('btn-next-fecha'),
    tabButtons: document.querySelectorAll('.tab-btn'),

    // Cambiar visualmente la solapa activa
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
            this.partidosContainer.innerHTML = '<p>No hay partidos para mostrar en esta jornada.</p>';
            return;
        }

        let html = '<div class="matches-grid">';
        partidos.forEach(match => {
            const estadoClase = match.status === 'IN_PLAY' ? 'live' : 'scheduled';

            html += `
                <div class="match-card ${estadoClase}">
                    <div class="match-header">
                        <span class="match-status">${match.timeOrStatus}</span>
                        ${match.date ? `<span class="match-date">${match.date}</span>` : ''}
                    </div>
                    <div class="match-body">
                        <div class="team home">
                            ${match.homeBadge ? `<img src="${match.homeBadge}" alt="" />` : ''}
                            <span class="team-name">${match.homeTeam}</span>
                            <span class="score">${match.homeScore}</span>
                        </div>
                        <div class="vs">vs</div>
                        <div class="team away">
                            <span class="score">${match.awayScore}</span>
                            <span class="team-name">${match.awayTeam}</span>
                            ${match.awayBadge ? `<img src="${match.awayBadge}" alt="" />` : ''}
                        </div>
                    </div>
                </div>
            `;
        });
        html += '</div>';

        this.partidosContainer.innerHTML = html;
    }
};