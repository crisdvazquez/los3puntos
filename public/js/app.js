import { CONFIG_LIGAS, obtenerEndpointsLiga, obtenerRutaLiga, obtenerLigaDesdeRuta } from './ligas.js';
import { 
    renderizarTabla, 
    renderizarPartidos, 
    renderizarSelectorFechas, 
    mostrarCargando, 
    actualizarHeaderLiga,
    actualizarControlesHome,
    renderizarIndicadorCache
} from './ui.js';
import {
    leerCachePartidosHoy,
    guardarCachePartidosHoy,
    limpiarCachesVencidosPartidosHoy,
    formatearEdadCache,
    generarHashEventos,
    observarCachePartidosHoy
} from './cacheService.js';

const LIVE_REFRESH_INTERVAL_MS = 60_000; // 1 minute
const HOME_REFRESH_INTERVAL_MS = 60 * 60 * 1000;

let ligaActual = 'HOME';
let fechaActualCache = null;
let listaRoundsCache = [];
let liveRefreshTimer = null;
let homeRefreshTimer = null;
let homeOffsetDias = 0;
let botonesLigas = [];
let selectorLigaMobile = null;
let stopObservadorHomeCache = null;

function obtenerTituloHome(offsetDias) {
    if (offsetDias === -1) return 'Ayer';
    if (offsetDias === 1) return 'Mañana';
    return 'Partidos de Hoy';
}

function hayPartidosEnVivo(eventos) {
    return Array.isArray(eventos) && eventos.some(e => e.strStatus === 'IN_PLAY');
}

function obtenerDateKeyHome(offsetDias = homeOffsetDias) {
    const ahora = new Date();
    const fecha = new Date(ahora.getTime() + (offsetDias * 24 * 60 * 60 * 1000));
    return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Argentina/Buenos_Aires'
    }).format(fecha);
}

function mostrarMetaCache(payload, esVigente = true) {
    if (!payload?.timestamp) {
        renderizarIndicadorCache(null);
        return;
    }

    renderizarIndicadorCache({
        visible: true,
        texto: esVigente
            ? `Datos cacheados ${formatearEdadCache(payload.timestamp)}`
            : 'Actualizando partidos del día...'
    });
}

function actualizarRefreshEnVivo(eventos) {
    if (hayPartidosEnVivo(eventos)) {
        iniciarRefreshEnVivo();
    } else {
        detenerRefreshEnVivo();
    }
}

function detenerRefreshEnVivo() {
    if (liveRefreshTimer !== null) {
        clearInterval(liveRefreshTimer);
        liveRefreshTimer = null;
    }
}

function detenerRefreshHome() {
    if (homeRefreshTimer !== null) {
        clearInterval(homeRefreshTimer);
        homeRefreshTimer = null;
    }
}

function iniciarRefreshEnVivo() {
    detenerRefreshEnVivo();
    liveRefreshTimer = setInterval(() => {
        refrescarEnVivo();
    }, LIVE_REFRESH_INTERVAL_MS);
}

function iniciarRefreshHome() {
    detenerRefreshHome();
    homeRefreshTimer = setInterval(() => {
        if (ligaActual === 'HOME' && homeOffsetDias === 0) {
            actualizarPartidosHome({ background: true });
        }
    }, HOME_REFRESH_INTERVAL_MS);
}

function aplicarLiveScoresHome(liveEvents = []) {
    const container = document.getElementById('partidos-container');
    if (!container || !Array.isArray(liveEvents) || liveEvents.length === 0) return false;

    const liveMap = new Map(liveEvents.map(evento => [String(evento.fixtureId), evento]));
    let actualizado = false;

    container.querySelectorAll('.match-group-list .match-card').forEach(card => {
        const fixtureId = card.getAttribute('data-fixture-id');
        if (!fixtureId || !liveMap.has(fixtureId)) return;

        const live = liveMap.get(fixtureId);
        const scoreBox = card.querySelector('.score-box');
        const note = card.querySelector('.match-status-note');
        const badge = card.querySelector('.badge-live');
        if (scoreBox) scoreBox.textContent = `${live.homeScore ?? 0} - ${live.awayScore ?? 0}`;
        if (note) note.textContent = live.displayMinute || '';
        if (!badge && scoreBox?.parentElement) {
            scoreBox.parentElement.insertAdjacentHTML('afterbegin', '<div class="badge-live">EN VIVO</div>');
        }
        actualizado = true;
    });

    return actualizado;
}

async function refrescarEnVivo() {
    if (ligaActual === 'HOME') {
        if (homeOffsetDias !== 0) return;
        try {
            const res = await fetch('/api/partidos/hoy/live-scores');
            const data = await res.json();
            const eventos = data.events || [];
            const actualizado = aplicarLiveScoresHome(eventos);
            if (!actualizado) {
                await actualizarPartidosHome({ background: true });
            } else {
                actualizarRefreshEnVivo(eventos);
            }
        } catch (err) {
            // silently ignore refresh errors
        }
        return;
    }

    const endpoints = obtenerEndpointsLiga(ligaActual);
    try {
        const roundParam = fechaActualCache ? `&round=${encodeURIComponent(fechaActualCache)}` : '';
        const urlPartidos = `${endpoints.partidos}?live=1${roundParam}`;
        const res = await fetch(urlPartidos);
        const datosPartidos = await res.json();
        const eventos = datosPartidos.events || [];
        renderizarPartidos(eventos, { codigoLiga: ligaActual });
        actualizarRefreshEnVivo(eventos);
    } catch (err) {
        // silently ignore refresh errors
    }
}

document.addEventListener('DOMContentLoaded', () => {
    limpiarCachesVencidosPartidosHoy();
    botonesLigas = Array.from(document.querySelectorAll('.tab-btn'));
    selectorLigaMobile = document.getElementById('mobile-league-select');
    const homeTitleLink = document.getElementById('home-title-link');
    
    cargarSeccion(obtenerLigaDesdeRuta());

    botonesLigas.forEach(boton => {
        boton.addEventListener('click', (e) => {
            ligaActual = e.currentTarget.getAttribute('data-liga');
            navegarASeccion(ligaActual);
        });
    });
    selectorLigaMobile?.addEventListener('change', (e) => navegarASeccion(e.target.value));

    if (homeTitleLink) {
        homeTitleLink.addEventListener('click', (e) => {
            e.preventDefault();
            navegarASeccion('HOME');
        });
    }

    document.getElementById('btn-prev-round').addEventListener('click', () => {
        cambiarFechaRelativa(-1);
    });

    document.getElementById('btn-next-round').addEventListener('click', () => {
        cambiarFechaRelativa(1);
    });
});

function actualizarTabActiva(codigoLiga) {
    botonesLigas.forEach(boton => {
        boton.classList.toggle('active', boton.getAttribute('data-liga') === codigoLiga);
    });
    if (selectorLigaMobile) selectorLigaMobile.value = codigoLiga;
}

function navegarASeccion(codigoLiga) {
    ligaActual = codigoLiga;
    fechaActualCache = null;
    homeOffsetDias = 0;
    actualizarTabActiva(codigoLiga);
    window.history.pushState({}, '', codigoLiga === 'HOME' ? '/' : obtenerRutaLiga(codigoLiga));
    cargarSeccion(codigoLiga);
}

window.addEventListener('popstate', () => {
    const codigoLiga = obtenerLigaDesdeRuta();
    ligaActual = codigoLiga;
    fechaActualCache = null;
    homeOffsetDias = 0;
    actualizarTabActiva(codigoLiga);
    cargarSeccion(codigoLiga);
});

async function cargarSeccion(codigoLiga) {
    const contenidoDiv = document.getElementById('contenedor-principal');
    const seccionTablaWrapper = document.getElementById('seccion-tabla-wrapper');
    const fixtureControles = document.getElementById('fixture-controles-wrapper');
    const mainPanel = document.querySelector('.main-panel');

    detenerRefreshEnVivo();
    detenerRefreshHome();
    if (stopObservadorHomeCache) {
        stopObservadorHomeCache();
        stopObservadorHomeCache = null;
    }
    mainPanel?.classList.toggle('home-view', codigoLiga === 'HOME');

    if (codigoLiga === 'HOME') {
        contenidoDiv.classList.remove('liga-view');
        seccionTablaWrapper.classList.add('oculto');
        fixtureControles.classList.add('oculto');
        actualizarHeaderLiga(obtenerTituloHome(homeOffsetDias), "");
        actualizarControlesHome(homeOffsetDias, (nuevoOffset) => {
            if (nuevoOffset === homeOffsetDias) return;
            homeOffsetDias = nuevoOffset;
            cargarSeccion('HOME');
        });
        
        const partidosContainer = document.getElementById('partidos-container');
        if (partidosContainer) partidosContainer.innerHTML = '<p style="text-align:center; padding:20px; color:var(--text-muted);">Cargando partidos...</p>';

        stopObservadorHomeCache = observarCachePartidosHoy(obtenerDateKeyHome(), (cache) => {
            if (ligaActual !== 'HOME' || homeOffsetDias !== 0 || !cache?.events) return;
            renderizarPartidos(cache.events, { agruparPorLiga: true, codigoLiga: 'ARG', mostrarFecha: false });
            mostrarMetaCache(cache, !cache.isExpired);
        });

        await actualizarPartidosHome();
        return;
    }

    contenidoDiv.classList.add('liga-view');
    seccionTablaWrapper.classList.remove('oculto');
    fixtureControles.classList.remove('oculto');
    actualizarControlesHome(0, null);
    mostrarCargando();

    const endpoints = obtenerEndpointsLiga(codigoLiga);

    try {
        const [resPosiciones, resPartidos] = await Promise.all([
            fetch(endpoints.posiciones),
            fetch(endpoints.partidos)
        ]);

        const datosPosiciones = await resPosiciones.json();
        const datosPartidos = await resPartidos.json();

        const nombreLiga = CONFIG_LIGAS[codigoLiga] ? CONFIG_LIGAS[codigoLiga].nombre : codigoLiga;
        actualizarHeaderLiga(nombreLiga, datosPosiciones.leagueLogo || "");
        
        renderizarTabla(datosPosiciones.table || []);

        if (datosPartidos.rounds) {
            listaRoundsCache = datosPartidos.rounds;
            fechaActualCache = datosPartidos.currentRound;
            
            renderizarSelectorFechas(
                listaRoundsCache, 
                fechaActualCache, 
                (nuevaFecha) => {
                    fechaActualCache = nuevaFecha;
                    actualizarPartidosSolo(ligaActual, fechaActualCache);
                }
            );
        }

        const eventos = datosPartidos.events || [];
        // Pasamos codigoLiga para que ui.js formatee la hora apropiadamente (ARG -> timezone Argentina)
        renderizarPartidos(eventos, { codigoLiga });
        renderizarIndicadorCache(null);
        actualizarRefreshEnVivo(eventos);

    } catch (error) {
        console.error("Error al cargar la liga:", error);
        actualizarHeaderLiga("Error de carga", "");
}

async function actualizarPartidosHome({ background = false } = {}) {
    const dateKey = obtenerDateKeyHome();
    const cache = homeOffsetDias === 0 ? leerCachePartidosHoy(dateKey) : null;

    if (cache?.events?.length && !background) {
        renderizarPartidos(cache.events, { agruparPorLiga: true, codigoLiga: 'ARG', mostrarFecha: false });
        mostrarMetaCache(cache, !cache.isExpired);
        if (!cache.isExpired) {
            actualizarRefreshEnVivo(cache.events);
        }
    }

    try {
        const offsetQuery = homeOffsetDias !== 0 ? `?offset=${homeOffsetDias}` : '';
        const res = await fetch(`/api/partidos/hoy${offsetQuery}`);
        const data = await res.json();
        const eventos = data.events || [];

        if (homeOffsetDias === 0) {
            const nuevoHash = generarHashEventos(eventos);
            const cacheActualizado = (!cache || cache.hash !== nuevoHash)
                ? guardarCachePartidosHoy(eventos, dateKey)
                : guardarCachePartidosHoy(eventos, dateKey);
            renderizarPartidos(eventos, { agruparPorLiga: true, codigoLiga: 'ARG', mostrarFecha: false });
            mostrarMetaCache(cacheActualizado, true);
            actualizarRefreshEnVivo(eventos);
            iniciarRefreshHome();
        } else {
            renderizarPartidos(eventos, { agruparPorLiga: true, codigoLiga: 'ARG', mostrarFecha: false });
            renderizarIndicadorCache(null);
        }
    } catch (error) {
        if (!cache?.events?.length) {
            console.error("Error al cargar partidos de hoy:", error);
            renderizarIndicadorCache(null);
        }
    }
}

async function actualizarPartidosSolo(codigoLiga, roundEspecifico) {
    const partidosContainer = document.getElementById('partidos-container');
    if (partidosContainer) partidosContainer.innerHTML = '<p style="text-align:center; padding:15px; color:var(--text-muted);">Cambiando de fecha...</p>';

    detenerRefreshEnVivo();

    const endpoints = obtenerEndpointsLiga(codigoLiga);
    let urlPartidos = `${endpoints.partidos}?round=${encodeURIComponent(roundEspecifico)}`;

    try {
        const res = await fetch(urlPartidos);
        const datosPartidos = await res.json();
        const eventos = datosPartidos.events || [];
        renderizarPartidos(eventos, { codigoLiga });
        actualizarRefreshEnVivo(eventos);
    } catch (error) {
        console.error("Error al actualizar partidos:", error);
    }
}

function cambiarFechaRelativa(direccion) {
    if (!listaRoundsCache || listaRoundsCache.length === 0) return;
    
    const indexActual = listaRoundsCache.indexOf(fechaActualCache);
    if (indexActual === -1) return;

    const nuevoIndex = indexActual + direccion;
    if (nuevoIndex >= 0 && nuevoIndex < listaRoundsCache.length) {
        fechaActualCache = listaRoundsCache[nuevoIndex];
        
        const select = document.getElementById('select-round');
        if (select) select.value = fechaActualCache;

        actualizarPartidosSolo(ligaActual, fechaActualCache);
    }
}
