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
        UI.mostrarCargando();
        
        const config = CONFIG_LIGAS[codigoLiga] || CONFIG_LIGAS['ARG'];
        const endpoints = obtenerEndpointsLiga(codigoLiga);

        // Actualizamos título por defecto mientras carga
        UI.actualizarEncabezado(config.nombre, null);

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

            const tablaData = adaptarTablaArgentina(data.table);
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

            const partidosData = adaptarPartidosArgentina(data.events);
            UI.renderizarPartidos(partidosData, data.labelJornada || 'Partidos');
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
                UI.actualizarEncabezado(data.competition.name, data.competition.emblem);
            }

            const tablaData = adaptarTablaEuropa(data.standings?.[0]?.table);
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

            const partidosData = adaptarPartidosEuropa(data.matches);
            UI.renderizarPartidos(partidosData, 'Partidos de la Jornada');
        } catch (err) {
            console.error('Error Partidos EUR:', err);
            UI.mostrarErrorPartidos('No se pudieron cargar los partidos.');
        }
    }
});