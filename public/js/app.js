document.addEventListener('DOMContentLoaded', () => {
    const leagueSelect = document.getElementById('league-select');
    let currentLeague = leagueSelect ? leagueSelect.value : 'ARG';

    if (leagueSelect) {
        leagueSelect.addEventListener('change', (e) => {
            currentLeague = e.target.value;
            cargarLiga(currentLeague);
        });
    }

    // Carga inicial
    cargarLiga(currentLeague);

    async function cargarLiga(codigoLiga) {
        if (typeof UI !== 'undefined' && UI.mostrarCargando) {
            UI.mostrarCargando();
        }

        const config = (typeof CONFIG_LIGAS !== 'undefined' && CONFIG_LIGAS[codigoLiga]) 
            ? CONFIG_LIGAS[codigoLiga] 
            : { id: codigoLiga, nombre: 'Liga', tipo: codigoLiga === 'ARG' ? 'ARG' : 'EUR' };

        const endpoints = typeof obtenerEndpointsLiga === 'function' 
            ? obtenerEndpointsLiga(codigoLiga) 
            : { 
                posiciones: codigoLiga === 'ARG' ? '/api/arg/posiciones' : `/api/posiciones?liga=${codigoLiga}`,
                partidos: codigoLiga === 'ARG' ? '/api/arg/partidos' : `/api/partidos?liga=${codigoLiga}`
              };

        if (typeof UI !== 'undefined' && UI.actualizarEncabezado) {
            UI.actualizarEncabezado(config.nombre, null);
        }

        if (config.tipo === 'ARG') {
            await Promise.allSettled([
                cargarPosicionesARG(endpoints.posiciones),
                cargarPartidosARG(endpoints.partidos)
            ]);
        } else {
            await Promise.allSettled([
                cargarPosicionesEUR(endpoints.posiciones),
                cargarPartidosEUR(endpoints.partidos)
            ]);
        }
    }

    async function cargarPosicionesARG(url) {
        try {
            const res = await fetch(url);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();

            const tablaData = adaptarTablaArgentina(data.table || []);
            if (typeof UI !== 'undefined' && UI.renderizarTabla) {
                UI.renderizarTabla(tablaData);
            }
        } catch (err) {
            console.error('Error Posiciones ARG:', err);
            if (typeof UI !== 'undefined' && UI.mostrarErrorPosiciones) {
                UI.mostrarErrorPosiciones('No se pudieron cargar las posiciones de Argentina.');
            }
        }
    }

    async function cargarPartidosARG(url) {
        try {
            const res = await fetch(url);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();

            const partidosData = adaptarPartidosArgentina(data.events || []);
            if (typeof UI !== 'undefined' && UI.renderizarPartidos) {
                UI.renderizarPartidos(partidosData, data.labelJornada || 'Partidos');
            }
        } catch (err) {
            console.error('Error Partidos ARG:', err);
            if (typeof UI !== 'undefined' && UI.mostrarErrorPartidos) {
                UI.mostrarErrorPartidos('No se pudieron cargar los partidos de Argentina.');
            }
        }
    }

    async function cargarPosicionesEUR(url) {
        try {
            const res = await fetch(url);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();

            if (data.competition && typeof UI !== 'undefined' && UI.actualizarEncabezado) {
                UI.actualizarEncabezado(data.competition.name, data.competition.emblem);
            }

            const tablaOriginal = data.standings?.[0]?.table || [];
            const tablaData = adaptarTablaEuropa(tablaOriginal);
            if (typeof UI !== 'undefined' && UI.renderizarTabla) {
                UI.renderizarTabla(tablaData);
            }
        } catch (err) {
            console.error('Error Posiciones EUR:', err);
            if (typeof UI !== 'undefined' && UI.mostrarErrorPosiciones) {
                UI.mostrarErrorPosiciones('No se pudieron cargar las posiciones.');
            }
        }
    }

    async function cargarPartidosEUR(url) {
        try {
            const res = await fetch(url);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();

            const partidosData = adaptarPartidosEuropa(data.matches || []);
            if (typeof UI !== 'undefined' && UI.renderizarPartidos) {
                UI.renderizarPartidos(partidosData, 'Partidos de la Jornada');
            }
        } catch (err) {
            console.error('Error Partidos EUR:', err);
            if (typeof UI !== 'undefined' && UI.mostrarErrorPartidos) {
                UI.mostrarErrorPartidos('No se pudieron cargar los partidos.');
            }
        }
    }
});