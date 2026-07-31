document.addEventListener('DOMContentLoaded', () => {
    let currentLeague = 'PL'; // O la que esté marcada por defecto en HTML

    // Configurar Listeners en las solapas
    if (UI.tabButtons && UI.tabButtons.length > 0) {
        UI.tabButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const targetBtn = e.currentTarget;
                const liga = targetBtn.getAttribute('data-liga');
                if (liga && liga !== currentLeague) {
                    currentLeague = liga;
                    UI.marcarTabActiva(currentLeague);
                    cargarLiga(currentLeague);
                }
            });
        });
    }

    // Carga inicial
    cargarLiga(currentLeague);

    async function cargarLiga(codigoLiga) {
        UI.mostrarCargando();

        const config = (typeof CONFIG_LIGAS !== 'undefined' && CONFIG_LIGAS[codigoLiga])
            ? CONFIG_LIGAS[codigoLiga]
            : { id: codigoLiga, nombre: 'Liga', tipo: codigoLiga === 'ARG' ? 'ARG' : 'EUR' };

        const endpoints = typeof obtenerEndpointsLiga === 'function'
            ? obtenerEndpointsLiga(codigoLiga)
            : {
                posiciones: codigoLiga === 'ARG' ? '/api/arg/posiciones' : `/api/posiciones?liga=${codigoLiga}`,
                partidos: codigoLiga === 'ARG' ? '/api/arg/partidos' : `/api/partidos?liga=${codigoLiga}`
              };

        UI.actualizarHeaderLiga(config.nombre, null);

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
            UI.renderizarTabla(tablaData);
        } catch (err) {
            console.error('Error Posiciones ARG:', err);
            UI.mostrarErrorPosiciones('No se pudieron cargar las posiciones de Argentina.');
        }
    }

    async function cargarPartidosARG(url) {
        try {
            const res = await fetch(url);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();

            const partidosData = adaptarPartidosArgentina(data.events || []);
            UI.renderizarPartidos(partidosData);
        } catch (err) {
            console.error('Error Partidos ARG:', err);
            UI.mostrarErrorPartidos('No se pudieron cargar los partidos de Argentina.');
        }
    }

    async function cargarPosicionesEUR(url) {
        try {
            const res = await fetch(url);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();

            if (data.competition) {
                UI.actualizarHeaderLiga(data.competition.name, data.competition.emblem);
            }

            const tablaOriginal = data.standings?.[0]?.table || [];
            const tablaData = adaptarTablaEuropa(tablaOriginal);
            UI.renderizarTabla(tablaData);
        } catch (err) {
            console.error('Error Posiciones EUR:', err);
            UI.mostrarErrorPosiciones('No se pudieron cargar las posiciones.');
        }
    }

    async function cargarPartidosEUR(url) {
        try {
            const res = await fetch(url);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();

            const partidosData = adaptarPartidosEuropa(data.matches || []);
            UI.renderizarPartidos(partidosData);
        } catch (err) {
            console.error('Error Partidos EUR:', err);
            UI.mostrarErrorPartidos('No se pudieron cargar los partidos.');
        }
    }
});