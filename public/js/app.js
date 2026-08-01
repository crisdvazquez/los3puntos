import { CONFIG_LIGAS, obtenerEndpointsLiga } from './ligas.js';
import { renderizarTabla, renderizarPartidos, mostrarCargando, actualizarHeaderLiga } from './ui.js';

document.addEventListener('DOMContentLoaded', () => {
    const botonesLigas = document.querySelectorAll('.tab-btn');
    
    // Cargar liga por defecto al iniciar (Premier League)
    cargarLiga('PL');

    botonesLigas.forEach(boton => {
        boton.addEventListener('click', (e) => {
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
        const [resPosiciones, resPartidos] = await Promise.all([
            fetch(endpoints.posiciones),
            fetch(endpoints.partidos)
        ]);

        const datosPosiciones = await resPosiciones.json();
        const datosPartidos = await resPartidos.json();

        const nombreLiga = CONFIG_LIGAS[codigoLiga] ? CONFIG_LIGAS[codigoLiga].nombre : codigoLiga;
        
        // Tomamos el logo oficial enviado por el backend
        const logoLiga = datosPosiciones.leagueLogo || ""; 
        
        actualizarHeaderLiga(nombreLiga, logoLiga);

        renderizarTabla(datosPosiciones.table || []);
        renderizarPartidos(datosPartidos.events || []);

    } catch (error) {
        console.error("Error al cargar la liga:", error);
        actualizarHeaderLiga("Error de carga", "");
    }
}