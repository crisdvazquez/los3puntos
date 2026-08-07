// src/utils/dateFormat.js
const TZ_ARGENTINA = 'America/Argentina/Buenos_Aires';

function obtenerTemporadaActual() {
    const ahora = new Date();
    return String(ahora.getUTCMonth() >= 6 ? ahora.getUTCFullYear() : ahora.getUTCFullYear() - 1);
}

function formatearFechaArgentina(fecha) {
    return new Intl.DateTimeFormat('en-CA', { timeZone: TZ_ARGENTINA }).format(fecha);
}

function obtenerFechaArgentinaRelativa(offsetDias = 0) {
    const ahora = new Date();
    const fechaBase = new Date(ahora.getTime() + (offsetDias * 24 * 60 * 60 * 1000));
    return formatearFechaArgentina(fechaBase);
}

function obtenerFechaArgentina(fechaUTC) {
    return new Intl.DateTimeFormat('en-CA', { timeZone: TZ_ARGENTINA }).format(new Date(fechaUTC));
}

function convertirHoraAArgentina(fechaUTC) {
    return new Date(fechaUTC).toLocaleTimeString('es-AR', {
        timeZone: TZ_ARGENTINA, hour: '2-digit', minute: '2-digit', hour12: false
    });
}

module.exports = {
    TZ_ARGENTINA,
    obtenerTemporadaActual,
    formatearFechaArgentina,
    obtenerFechaArgentinaRelativa,
    obtenerFechaArgentina,
    convertirHoraAArgentina
};