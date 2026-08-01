import { obtenerEndpointsLiga } from './ligas.js';
import { renderizarTabla, renderizarPartidos, mostrarCargando } from './ui.js';

document.addEventListener('DOMContentLoaded', () => {
    const botonesLigas = document.querySelectorAll('.tab-btn');
    
    // Cargar liga por defecto (ej: Premier League)
    cargarLiga('PL');

    botonesLigas.forEach(boton => {
        boton.addEventListener('click', (e) => {
            // Actualizar botones visualmente
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
        // Pedimos posiciones y partidos al mismo tiempo
        const [resPosiciones, resPartidos] = await Promise.all([
            fetch(endpoints.posiciones),
            fetch(endpoints.partidos)
        ]);

        const datosPosiciones = await resPosiciones.json();
        const datosPartidos = await resPartidos.json();

        renderizarTabla(datosPosiciones.table || []);
        renderizarPartidos(datosPartidos.events || []);

    } catch (error) {
        console.error("Error al cargar la liga:", error);
    }
}