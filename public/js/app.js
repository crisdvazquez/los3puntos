import { CONFIG_LIGAS, obtenerEndpointsLiga } from './ligas.js';
import { 
    renderizarTabla, 
    renderizarPartidos, 
    renderizarSelectorFechas, 
    mostrarCargando, 
    actualizarHeaderLiga 
} from './ui.js';

let ligaActual = 'PL';
let fechaActualCache = null;
let listaRoundsCache = [];

document.addEventListener('DOMContentLoaded', () => {
    const botonesLigas = document.querySelectorAll('.tab-btn');
    
    // Cargar liga por defecto al iniciar
    cargarLiga(ligaActual);

    botonesLigas.forEach(boton => {
        boton.addEventListener('click', (e) => {
            botonesLigas.forEach(b => b.classList.remove('active'));
            e.currentTarget.classList.add('active');

            ligaActual = e.currentTarget.getAttribute('data-liga');
            fechaActualCache = null; // Reiniciar fecha al cambiar de liga
            cargarLiga(ligaActual);
        });
    });

    // Botones de Fecha Anterior / Siguiente
    document.getElementById('btn-prev-round').addEventListener('click', () => {
        cambiarFechaRelativa(-1);
    });

    document.getElementById('btn-next-round').addEventListener('click', () => {
        cambiarFechaRelativa(1);
    });
});

async function cargarLiga(codigoLiga, roundEspecifico = null) {
    mostrarCargando();
    const endpoints = obtenerEndpointsLiga(codigoLiga);

    // Si pasamos fecha específica, la agregamos al endpoint de partidos
    let urlPartidos = endpoints.partidos;
    if (roundEspecifico) {
        urlPartidos += `?round=${encodeURIComponent(roundEspecifico)}`;
    }

    try {
        const [resPosiciones, resPartidos] = await Promise.all([
            fetch(endpoints.posiciones),
            fetch(urlPartidos)
        ]);

        const datosPosiciones = await resPosiciones.json();
        const datosPartidos = await resPartidos.json();

        const nombreLiga = CONFIG_LIGAS[codigoLiga] ? CONFIG_LIGAS[codigoLiga].nombre : codigoLiga;
        const logoLiga = datosPosiciones.leagueLogo || "";
        
        actualizarHeaderLiga(nombreLiga, logoLiga);

        renderizarTabla(datosPosiciones.table || []);

        // Guardar estado de jornadas para las flechas
        if (datosPartidos.rounds) {
            listaRoundsCache = datosPartidos.rounds;
            fechaActualCache = datosPartidos.currentRound;
            
            renderizarSelectorFechas(
                listaRoundsCache, 
                fechaActualCache, 
                (nuevaFecha) => {
                    fechaActualCache = nuevaFecha;
                    cargarLiga(ligaActual, fechaActualCache);
                }
            );
        }

        renderizarPartidos(datosPartidos.events || []);

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
        cargarLiga(ligaActual, fechaActualCache);
    }
}