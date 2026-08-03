import { CONFIG_LIGAS, obtenerEndpointsLiga } from './ligas.js';
import { 
    renderizarTabla, 
    renderizarPartidos, 
    renderizarSelectorFechas, 
    mostrarCargando, 
    actualizarHeaderLiga 
} from './ui.js';

const LIVE_REFRESH_INTERVAL_MS = 60_000; // 1 minute

let ligaActual = 'HOME';
let fechaActualCache = null;
let listaRoundsCache = [];
let liveRefreshTimer = null;

function hayPartidosEnVivo(eventos) {
    return Array.isArray(eventos) && eventos.some(e => e.strStatus === 'IN_PLAY');
}

function detenerRefreshEnVivo() {
    if (liveRefreshTimer !== null) {
        clearInterval(liveRefreshTimer);
        liveRefreshTimer = null;
    }
}

function iniciarRefreshEnVivo() {
    detenerRefreshEnVivo();
    liveRefreshTimer = setInterval(async () => {
        if (ligaActual === 'HOME') {
            await refrescarHome(false);
        } else {
            await refrescarPartidosLiga(ligaActual, fechaActualCache, false);
        }
    }, LIVE_REFRESH_INTERVAL_MS);
}

document.addEventListener('DOMContentLoaded', () => {
    const botonesLigas = document.querySelectorAll('.tab-btn');
    
    cargarSeccion('HOME');

    botonesLigas.forEach(boton => {
        boton.addEventListener('click', (e) => {
            botonesLigas.forEach(b => b.classList.remove('active'));
            e.currentTarget.classList.add('active');

            ligaActual = e.currentTarget.getAttribute('data-liga');
            fechaActualCache = null; 
            cargarSeccion(ligaActual);
        });
    });

    document.getElementById('btn-prev-round').addEventListener('click', () => {
        cambiarFechaRelativa(-1);
    });

    document.getElementById('btn-next-round').addEventListener('click', () => {
        cambiarFechaRelativa(1);
    });
});

async function refrescarHome(mostrarLoader = true) {
    const partidosContainer = document.getElementById('partidos-container');
    if (mostrarLoader && partidosContainer) {
        partidosContainer.innerHTML = '<p style="text-align:center; padding:20px; color:var(--text-muted);">Cargando partidos de hoy...</p>';
    }
    try {
        const res = await fetch('/api/partidos/hoy');
        const data = await res.json();
        const eventos = data.events || [];
        renderizarPartidos(eventos, { agruparPorLiga: true, codigoLiga: 'ARG' });
        if (hayPartidosEnVivo(eventos)) {
            if (liveRefreshTimer === null) iniciarRefreshEnVivo();
        } else {
            detenerRefreshEnVivo();
        }
    } catch (error) {
        console.error("Error al cargar partidos de hoy:", error);
        renderizarPartidos([], { agruparPorLiga: true, codigoLiga: 'ARG' });
        detenerRefreshEnVivo();
    }
}

async function refrescarPartidosLiga(codigoLiga, round, mostrarLoader = true) {
    const endpoints = obtenerEndpointsLiga(codigoLiga);
    let urlPartidos = endpoints.partidos;
    if (round) urlPartidos += `?round=${encodeURIComponent(round)}`;

    const partidosContainer = document.getElementById('partidos-container');
    if (mostrarLoader && partidosContainer) {
        partidosContainer.innerHTML = '<p style="text-align:center; padding:15px; color:var(--text-muted);">Cambiando de fecha...</p>';
    }

    try {
        const res = await fetch(urlPartidos);
        const datosPartidos = await res.json();
        const eventos = datosPartidos.events || [];
        renderizarPartidos(eventos, { codigoLiga });
        if (hayPartidosEnVivo(eventos)) {
            if (liveRefreshTimer === null) iniciarRefreshEnVivo();
        } else {
            detenerRefreshEnVivo();
        }
    } catch (error) {
        console.error("Error al actualizar partidos:", error);
        detenerRefreshEnVivo();
    }
}

async function cargarSeccion(codigoLiga) {
    detenerRefreshEnVivo();

    const contenidoDiv = document.getElementById('contenedor-principal');
    const seccionTablaWrapper = document.getElementById('seccion-tabla-wrapper');
    const fixtureControles = document.getElementById('fixture-controles-wrapper');

    if (codigoLiga === 'HOME') {
        contenidoDiv.classList.remove('liga-view');
        seccionTablaWrapper.classList.add('oculto');
        fixtureControles.classList.add('oculto');
        actualizarHeaderLiga("Partidos de Hoy", "");
        await refrescarHome(true);
        return;
    }

    contenidoDiv.classList.add('liga-view');
    seccionTablaWrapper.classList.remove('oculto');
    fixtureControles.classList.remove('oculto');
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
                    refrescarPartidosLiga(ligaActual, fechaActualCache, true);
                }
            );
        }

        const eventos = datosPartidos.events || [];
        renderizarPartidos(eventos, { codigoLiga });

        if (hayPartidosEnVivo(eventos)) {
            iniciarRefreshEnVivo();
        }

    } catch (error) {
        console.error("Error al cargar la liga:", error);
        actualizarHeaderLiga("Error de carga", "");
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

        refrescarPartidosLiga(ligaActual, fechaActualCache, true);
    }
}
