const UI = {
    standingsContainer: document.getElementById('standings-container'),
    matchesContainer: document.getElementById('matches-container'),
    leagueTitle: document.getElementById('league-title'),
    leagueLogo: document.getElementById('league-logo'),

    mostrarCargando() {
        if (this.standingsContainer) this.standingsContainer.innerHTML = '<p class="loading">Cargando tabla de posiciones...</p>';
        if (this.matchesContainer) this.matchesContainer.innerHTML = '<p class="loading">Cargando partidos...</p>';
    },

    mostrarErrorPosiciones(mensaje) {
        if (this.standingsContainer) {
            this.standingsContainer.innerHTML = `<p class="error">⚠️ ${mensaje}</p>`;
        }
    },

    mostrarErrorPartidos(mensaje) {
        if (this.matchesContainer) {
            this.matchesContainer.innerHTML = `<p class="error">⚠️ ${mensaje}</p>`;
        }
    },

    actualizarEncabezado(nombre, logo) {
        if (this.leagueTitle && nombre) this.leagueTitle.textContent = nombre;
        if (this.leagueLogo) {
            if (logo) {
                this.leagueLogo.src = logo;
                this.leagueLogo.style.display = 'inline-block';
            } else {
                this.leagueLogo.style.display = 'none';
            }
        }
    },

    renderizarTabla(filas) {
        if (!this.standingsContainer) return;

        if (!filas || filas.length === 0) {
            this.standingsContainer.innerHTML = '<p>No hay posiciones disponibles.</p>';
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
                        <td>${row.goalDiff}</td>
                        <td><strong>${row.points}</strong></td>
                    </tr>
                `;
            }
        });

        html += '</tbody></table>';
        this.standingsContainer.innerHTML = html;
    },

    renderizarPartidos(partidos, titulo) {
        if (!this.matchesContainer) return;

        let html = `<h3 class="jornada-title">${titulo}</h3>`;

        if (!partidos || partidos.length === 0) {
            html += '<p>No hay partidos programados.</p>';
            this.matchesContainer.innerHTML = html;
            return;
        }

        html += '<div class="matches-grid">';
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
                            <span>${match.homeTeam}</span>
                            <span class="score">${match.homeScore}</span>
                        </div>
                        <div class="vs">vs</div>
                        <div class="team away">
                            <span class="score">${match.awayScore}</span>
                            <span>${match.awayTeam}</span>
                            ${match.awayBadge ? `<img src="${match.awayBadge}" alt="" />` : ''}
                        </div>
                    </div>
                </div>
            `;
        });
        html += '</div>';

        this.matchesContainer.innerHTML = html;
    }
};