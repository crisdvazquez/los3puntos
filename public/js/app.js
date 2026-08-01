document.addEventListener('DOMContentLoaded', () => {
    let currentLeague = 'PL'; 
    let currentSeason = '2026';
    let partidosPorJornada = {};
    let jornadasOrdenadas = [];
    let indiceJornadaActual = 0;

    // Capturar botones de la solapa
    const tabButtons = document.querySelectorAll('.tab-btn');
    if (tabButtons && tabButtons.length > 0) {
        tabButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const targetBtn = e.currentTarget;
                const liga = targetBtn.getAttribute('data-liga') || 'PL';
                const season = targetBtn.getAttribute('data-season') || '2026';
                
                // Actualizar estilo de pestaña activa
                tabButtons.forEach(b => b.classList.remove('active'));
                targetBtn.classList.add('active');

                currentLeague = liga;
                currentSeason = season;
                cargarDatosLiga(currentLeague, currentSeason);
            });
        });
    }

    const selectJornada = document.getElementById('select-jornada');
    const btnPrevFecha = document.getElementById('btn-prev-fecha');
    const btnNextFecha = document.getElementById('btn-next-fecha');

    if (selectJornada) {
        selectJornada.addEventListener('change', (e) => {
            mostrarJornadaSeleccionada(e.target.value);
        });
    }

    if (btnPrevFecha) {
        btnPrevFecha.addEventListener('click', () => {
            if (indiceJornadaActual > 0) {
                indiceJornadaActual--;
                const jornada = jornadasOrdenadas[indiceJornadaActual];
                if (selectJornada) selectJornada.value = jornada;
                mostrarJornadaSeleccionada(jornada);
            }
        });
    }

    if (btnNextFecha) {
        btnNextFecha.addEventListener('click', () => {
            if (indiceJornadaActual < jornadasOrdenadas.length - 1) {
                indiceJornadaActual++;
                const jornada = jornadasOrdenadas[indiceJornadaActual];
                if (selectJornada) selectJornada.value = jornada;
                mostrarJornadaSeleccionada(jornada);
            }
        });
    }

    // Carga inicial
    cargarDatosLiga(currentLeague, currentSeason);

    async function cargarDatosLiga(liga, season) {
        if (typeof UI !== 'undefined' && UI.mostrarCargando) UI.mostrarCargando();

        await Promise.allSettled([
            cargarPosiciones(liga, season),
            cargarPartidos(liga, season)
        ]);
    }

    async function cargarPosiciones(liga, season) {
        try {
            const res = await fetch(`/api/posiciones?liga=${liga}&season=${season}`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();

            if (typeof UI !== 'undefined' && UI.actualizarHeaderLiga && data.competition) {
                UI.actualizarHeaderLiga(data.competition.name, data.competition.emblem);
            }

            const table = data.standings?.[0]?.table || [];
            if (table.length > 0) {
                const tablaFormateada = table.map(item => ({
                    rank: item.position,
                    teamName: item.team?.name || 'Equipo',
                    badge: item.team?.crest || '',
                    played: item.playedGames || 0,
                    goalDiff: item.goalDifference || 0,
                    points: item.points || 0
                }));

                if (typeof UI !== 'undefined' && UI.renderizarTabla) UI.renderizarTabla(tablaFormateada);
            } else {
                if (typeof UI !== 'undefined' && UI.mostrarErrorPosiciones) {
                    UI.mostrarErrorPosiciones('No hay posiciones disponibles.');
                }
            }
        } catch (err) {
            console.error('Error posiciones:', err);
        }
    }

    async function cargarPartidos(liga, season) {
        try {
            const res = await fetch(`/api/partidos?liga=${liga}&season=${season}`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();

            const matches = data.matches || [];
            procesarPartidos(matches);
        } catch (err) {
            console.error('Error partidos:', err);
        }
    }

    function procesarPartidos(matches) {
        partidosPorJornada = {};

        matches.forEach(item => {
            const numMatchday = item.matchday || 1;
            const nombreJornada = `Fecha ${numMatchday}`;

            if (!partidosPorJornada[nombreJornada]) {
                partidosPorJornada[nombreJornada] = [];
            }

            let timeOrStatus = '';
            if (item.status === 'IN_PLAY') {
                timeOrStatus = 'EN VIVO';
            } else if (item.status === 'FINISHED') {
                timeOrStatus = 'Fin';
            } else if (item.utcDate) {
                const dateObj = new Date(item.utcDate);
                timeOrStatus = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            } else {
                timeOrStatus = '-';
            }

            partidosPorJornada[nombreJornada].push({
                status: item.status,
                timeOrStatus: timeOrStatus,
                date: item.utcDate ? new Date(item.utcDate).toLocaleDateString() : '',
                homeTeam: item.homeTeam?.name || 'Local',
                homeBadge: item.homeTeam?.crest || '',
                homeScore: item.score?.fullTime?.home ?? '-',
                awayTeam: item.awayTeam?.name || 'Visitante',
                awayBadge: item.awayTeam?.crest || '',
                awayScore: item.score?.fullTime?.away ?? '-'
            });
        });

        jornadasOrdenadas = Object.keys(partidosPorJornada).sort((a, b) => {
            const numA = parseInt(a.replace(/\D/g, '')) || 0;
            const numB = parseInt(b.replace(/\D/g, '')) || 0;
            return numA - numB;
        });

        if (jornadasOrdenadas.length === 0) {
            if (typeof UI !== 'undefined' && UI.renderizarPartidos) UI.renderizarPartidos([]);
            return;
        }

        // Cargar primera fecha o la más cercana
        indiceJornadaActual = 0;
        const jornadaInicial = jornadasOrdenadas[0];

        actualizarControlesJornada(jornadasOrdenadas, jornadaInicial);
        mostrarJornadaSeleccionada(jornadaInicial);
    }

    function actualizarControlesJornada(jornadas, jornadaSeleccionada) {
        if (!selectJornada) return;
        selectJornada.innerHTML = '';
        jornadas.forEach(j => {
            const opt = document.createElement('option');
            opt.value = j;
            opt.textContent = j;
            if (j === jornadaSeleccionada) opt.selected = true;
            selectJornada.appendChild(opt);
        });
    }

    function mostrarJornadaSeleccionada(jornada) {
        indiceJornadaActual = jornadasOrdenadas.indexOf(jornada);
        if (indiceJornadaActual === -1) indiceJornadaActual = 0;

        const partidosAMostrar = partidosPorJornada[jornada] || [];
        if (typeof UI !== 'undefined' && UI.renderizarPartidos) {
            UI.renderizarPartidos(partidosAMostrar);
        }

        if (btnPrevFecha) btnPrevFecha.disabled = (indiceJornadaActual === 0);
        if (btnNextFecha) btnNextFecha.disabled = (indiceJornadaActual === jornadasOrdenadas.length - 1);
    }
});