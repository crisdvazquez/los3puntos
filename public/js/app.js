import { CONFIG_LIGAS, obtenerEndpointsLiga } from './ligas.js';
import { renderizarTabla, renderizarPartidos, mostrarCargando, actualizarHeaderLiga } from './ui.js';

document.addEventListener('DOMContentLoaded', () => {
    const botonesLigas = document.querySelectorAll('.tab-btn');
    
    // Cargar liga por defecto al iniciar (Premier League)
    cargarLiga('PL');

    botonesLigas.forEach(boton => {
        boton.addEventListener('click', (e) => {
            // Actualizar estado visual de los botones
            botonesLigas.forEach(b => b.classList.remove('active'));
            e.currentTarget.classList.add('active');

            const codigoLiga = e.currentTarget.getAttribute('data-liga');
            cargarLiga(codigoLiga);
        });
    });
});

async function cargarLiga(codigoLiga) {
    mostrarCargando();
    const endpoints = obtenerEndpointsLiga(codigoLiga);

    try {
        // Pedimos posiciones y partidos en paralelo
        const [resPosiciones, resPartidos] = await Promise.all([
            fetch(endpoints.posiciones),
            fetch(endpoints.partidos)
        ]);

        const datosPosiciones = await resPosiciones.json();
        const datosPartidos = await resPartidos.json();

        // Obtener el nombre prolijo desde la configuración de ligas
        const nombreLiga = CONFIG_LIGAS[codigoLiga] ? CONFIG_LIGAS[codigoLiga].nombre : codigoLiga;
        
        // Intentar rescatar un logo representativo (ej: del primer equipo de la tabla)
        const logoLiga = datosPosiciones.table?.[0]?.strBadge || ""; 
        
        // Actualizamos el banner superior con el nombre y logo
        actualizarHeaderLiga(nombreLiga, logoLiga);

        // Renderizamos los datos en pantalla
        renderizarTabla(datosPosiciones.table || []);
        renderizarPartidos(datosPartidos.events || []);

    } catch (error) {
        console.error("Error al cargar la liga:", error);
        actualizarHeaderLiga("Error de carga", "");
    }
}