import { CONFIG_LIGAS, obtenerEndpointsLiga } from './ligas.js';
import { 
    renderizarTabla, 
    renderizarPartidos, 
    renderizarSelectorFechas, 
    mostrarCargando, 
    actualizarHeaderLiga 
} from './ui.js';

let ligaActual = 'HOME';
let fechaActualCache = null;
let listaRoundsCache = [];

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
            // Pasamos 'ARG' para que las horas se formateen en horario Argentina en el home
            renderizarPartidos(data.events || [], true, 'ARG');
        } catch (error) {
            console.error("Error al cargar partidos de hoy:", error);
            renderizarPartidos([]);
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

        // Pasamos codigoLiga para que ui.js formatee la hora apropiadamente (ARG -> timezone Argentina)
        renderizarPartidos(datosPartidos.events || [], false, codigoLiga);

    } catch (error) {
        console.error("Error al cargar la liga:", error);
        actualizarHeaderLiga("Error de carga", "");
    }
}

async function actualizarPartidosSolo(codigoLiga, roundEspecifico) {
    const partidosContainer = document.getElementById('partidos-container');
    if (partidosContainer) partidosContainer.innerHTML = '<p style="text-align:center; padding:15px; color:var(--text-muted);">Cambiando de fecha...</p>';

    const endpoints = obtenerEndpointsLiga(codigoLiga);
    let urlPartidos = `${endpoints.partidos}?round=${encodeURIComponent(roundEspecifico)}`;

    try {
        const res = await fetch(urlPartidos);
        const datosPartidos = await res.json();
        renderizarPartidos(datosPartidos.events || [], false, codigoLiga);
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
