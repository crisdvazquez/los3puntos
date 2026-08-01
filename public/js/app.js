document.addEventListener('DOMContentLoaded', () => {
    let currentLeague = 'PL'; 
    let currentSeason = '2026';
    let partidosPorJornada = {};
    let jornadasOrdenadas = [];
    let indiceJornadaActual = 0;

    // Escuchar cambios en las pestañas
    if (UI.tabButtons && UI.tabButtons.length > 0) {
        UI.tabButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const targetBtn = e.currentTarget;
                const liga = targetBtn.getAttribute('data-liga') || 'PL';
                const season = targetBtn.getAttribute('data-season') || '2026';
                
                if (liga !== currentLeague || season !== currentSeason) {
                    currentLeague = liga;
                    currentSeason = season;
                    UI.marcarTabActiva(currentLeague);
                    cargarDatosLiga(currentLeague, currentSeason);
                }
            });
        });
    }

    if (UI.selectJornada) {
        UI.selectJornada.addEventListener('change', (e) => {
            mostrarJornadaSeleccionada(e.target.value);
        });
    }

    if (UI.btnPrevFecha) {
        UI.btnPrevFecha.addEventListener('click', () => {
            if (indiceJornadaActual > 0) {
                indiceJornadaActual--;
                const jornada = jornadasOrdenadas[indiceJornadaActual];
                UI.selectJornada.value = jornada;
                mostrarJornadaSeleccionada(jornada);
            }
        });
    }

    if (UI.btnNextFecha) {
        UI.btnNextFecha.addEventListener('click', () => {
            if (indiceJornadaActual < jornadasOrdenadas.length - 1) {
                indiceJornadaActual++;
                const jornada = jornadasOrdenadas[indiceJornadaActual];
                UI.selectJornada.value = jornada;
                mostrarJornadaSeleccionada(jornada);
            }
        });
    }

    cargarDatosLiga(currentLeague, currentSeason);

    async function cargarDatosLiga(liga, season) {
        UI.mostrarCargando();

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

            if (data.competition) {
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

                UI.renderizarTabla(tablaFormateada);
            } else {
                UI.mostrarErrorPosiciones('No hay posiciones disponibles para esta liga/temporada.');
            }
        } catch (err) {
            console.error('Error posiciones:', err);
            UI.mostrarErrorPosiciones('Error al conectar con el servidor.');
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
            UI.mostrarErrorPartidos('Error al cargar partidos.');
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
            UI.renderizarPartidos([]);
            UI.actualizarControlesJornada([], null);
            return;
        }

        indiceJornadaActual = 0;
        const jornadaInicial = jornadasOrdenadas[0];

        UI.actualizarControlesJornada(jornadasOrdenadas, jornadaInicial);
        mostrarJornadaSeleccionada(jornadaInicial);
    }

    function mostrarJornadaSeleccionada(jornada) {
        indiceJornadaActual = jornadasOrdenadas.indexOf(jornada);
        if (indiceJornadaActual === -1) indiceJornadaActual = 0;

        const partidosAMostrar = partidosPorJornada[jornada] || [];
        UI.renderizarPartidos(partidosAMostrar);
        UI.actualizarEstadoBotonesNav(indiceJornadaActual, jornadasOrdenadas.length);
    }
});