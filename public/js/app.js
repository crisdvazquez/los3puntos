import { CONFIG_LIGAS, obtenerEndpointsLiga, obtenerRutaLiga, obtenerLigaDesdeRuta } from './ligas.js';
import { 
    renderizarTabla, 
    renderizarPartidos, 
    renderizarSelectorFechas, 
    mostrarCargando, 
    actualizarHeaderLiga,
    actualizarControlesHome
} from './ui.js';

const LIVE_REFRESH_INTERVAL_MS = 60_000; // 1 minute

let ligaActual = 'HOME';
let fechaActualCache = null;
let listaRoundsCache = [];
let liveRefreshTimer = null;
let homeOffsetDias = 0;
let botonesLigas = [];
let selectorLigaMobile = null;

function obtenerTituloHome(offsetDias) {
    if (offsetDias === -1) return 'Ayer';
    if (offsetDias === 1) return 'Mañana';
    return 'Partidos de Hoy';
}

function hayPartidosEnVivo(eventos) {
    return Array.isArray(eventos) && eventos.some(e => e.strStatus === 'IN_PLAY');
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

function iniciarRefreshEnVivo() {
    detenerRefreshEnVivo();
    liveRefreshTimer = setInterval(() => {
        refrescarEnVivo();
    }, LIVE_REFRESH_INTERVAL_MS);
}

async function refrescarEnVivo() {
    if (ligaActual === 'HOME') {
        if (homeOffsetDias !== 0) return;
        try {
            const res = await fetch('/api/partidos/hoy?live=1');
            const data = await res.json();
            const eventos = data.events || [];
            renderizarPartidos(eventos, { agruparPorLiga: true, codigoLiga: 'ARG', mostrarFecha: false });
            actualizarRefreshEnVivo(eventos);
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

        try {
            const offsetQuery = homeOffsetDias !== 0 ? `?offset=${homeOffsetDias}` : '';
            const res = await fetch(`/api/partidos/hoy${offsetQuery}`);
            const data = await res.json();
            const eventos = data.events || [];
            // Pasamos 'ARG' para que las horas se formateen en horario Argentina en el home
            renderizarPartidos(eventos, { agruparPorLiga: true, codigoLiga: 'ARG', mostrarFecha: false });
            if (homeOffsetDias === 0) actualizarRefreshEnVivo(eventos);
        } catch (error) {
            console.error("Error al cargar partidos de hoy:", error);
        }
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
        actualizarRefreshEnVivo(eventos);

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
