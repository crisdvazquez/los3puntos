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
    liveRefreshTimer = setInterval(() => {
        refrescarEnVivo();
    }, LIVE_REFRESH_INTERVAL_MS);
}

async function refrescarEnVivo() {
    if (ligaActual === 'HOME') {
        try {
            const res = await fetch('/api/partidos/hoy?live=1');
            const data = await res.json();
            const eventos = data.events || [];
            renderizarPartidos(eventos, { agruparPorLiga: true, codigoLiga: 'ARG' });
            if (!hayPartidosEnVivo(eventos)) {
                detenerRefreshEnVivo();
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
        if (!hayPartidosEnVivo(eventos)) {
            detenerRefreshEnVivo();
        }
    } catch (err) {
        // silently ignore refresh errors
    }
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

async function cargarSeccion(codigoLiga) {
    const contenidoDiv = document.getElementById('contenedor-principal');
    const seccionTablaWrapper = document.getElementById('seccion-tabla-wrapper');
    const fixtureControles = document.getElementById('fixture-controles-wrapper');

    detenerRefreshEnVivo();

    if (codigoLiga === 'HOME') {
        contenidoDiv.classList.remove('liga-view');
        seccionTablaWrapper.classList.add('oculto');
        fixtureControles.classList.add('oculto');
        actualizarHeaderLiga("Partidos de Hoy", "");
        
        const partidosContainer = document.getElementById('partidos-container');
        if (partidosContainer) partidosContainer.innerHTML = '<p style="text-align:center; padding:20px; color:var(--text-muted);">Cargando partidos de hoy...</p>';

        try {
            const res = await fetch('/api/partidos/hoy');
            const data = await res.json();
            const eventos = data.events || [];
            // Pasamos 'ARG' para que las horas se formateen en horario Argentina en el home
            renderizarPartidos(eventos, { agruparPorLiga: true, codigoLiga: 'ARG' });
            if (hayPartidosEnVivo(eventos)) {
                iniciarRefreshEnVivo();
            }
        } catch (error) {
            console.error("Error al cargar partidos de hoy:", error);
            renderizarPartidos([], { agruparPorLiga: true, codigoLiga: 'ARG' });
        }
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
                    actualizarPartidosSolo(ligaActual, fechaActualCache);
                }
            );
        }

        const eventos = datosPartidos.events || [];
        // Pasamos codigoLiga para que ui.js formatee la hora apropiadamente (ARG -> timezone Argentina)
        renderizarPartidos(eventos, { codigoLiga });
        if (hayPartidosEnVivo(eventos)) {
            iniciarRefreshEnVivo();
        }

    } catch (error) {
        console.error("Error al cargar la liga:", error);
        actualizarHeaderLiga("Error de carga", "");
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
        if (hayPartidosEnVivo(eventos)) {
            iniciarRefreshEnVivo();
        }
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
