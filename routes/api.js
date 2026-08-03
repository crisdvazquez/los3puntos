const express = require('express');
const router = express.Router();
const argentina = require('../services/argentina');
const europa = require('../services/footballData');

const NOMBRES_LIGAS = {
    ARG: 'Liga Profesional',
    CA: 'Copa Argentina',
    PN: 'Primera Nacional',
    LIB: 'CONMEBOL Libertadores',
    SUD: 'CONMEBOL Sudamericana',
    PL: 'Premier League',
    PD: 'LaLiga',
    SA: 'Serie A',
    BL1: 'Bundesliga',
    FL1: 'Ligue 1',
    CL: 'Champions League',
    EL: 'Europa League',
    UECL: 'Conference League'
};

// Devuelve la fecha actual en horario Argentina (UTC-3)
function obtenerFechaArgentinaHoy() {
    const ahora = new Date();
    const argentinaTime = new Date(ahora.getTime() - (3 * 60 * 60 * 1000));
    return argentinaTime.toISOString().split('T')[0];
}

// Endpoint: Partidos de HOY en todas las ligas monitoreadas
router.get('/partidos/hoy', async (req, res) => {
    try {
        const hoyStr = obtenerFechaArgentinaHoy();

        const ligasMonitoreadas = [
            { codigo: 'ARG', nombre: NOMBRES_LIGAS.ARG, fn: () => argentina.obtenerPartidos() },
            { codigo: 'CA',  nombre: NOMBRES_LIGAS.CA,  fn: () => europa.obtenerPartidosEuropa('CA') },
            { codigo: 'PN',  nombre: NOMBRES_LIGAS.PN,  fn: () => europa.obtenerPartidosEuropa('PN') },
            { codigo: 'LIB', nombre: NOMBRES_LIGAS.LIB, fn: () => europa.obtenerPartidosEuropa('LIB') },
            { codigo: 'SUD', nombre: NOMBRES_LIGAS.SUD, fn: () => europa.obtenerPartidosEuropa('SUD') },
            { codigo: 'PL',  nombre: NOMBRES_LIGAS.PL,  fn: () => europa.obtenerPartidosEuropa('PL') },
            { codigo: 'PD',  nombre: NOMBRES_LIGAS.PD,  fn: () => europa.obtenerPartidosEuropa('PD') },
            { codigo: 'SA',  nombre: NOMBRES_LIGAS.SA,  fn: () => europa.obtenerPartidosEuropa('SA') },
            { codigo: 'BL1', nombre: NOMBRES_LIGAS.BL1, fn: () => europa.obtenerPartidosEuropa('BL1') },
            { codigo: 'FL1', nombre: NOMBRES_LIGAS.FL1, fn: () => europa.obtenerPartidosEuropa('FL1') },
            { codigo: 'CL',  nombre: NOMBRES_LIGAS.CL,  fn: () => europa.obtenerPartidosEuropa('CL') },
            { codigo: 'EL',  nombre: NOMBRES_LIGAS.EL,  fn: () => europa.obtenerPartidosEuropa('EL') },
            { codigo: 'UECL',nombre: NOMBRES_LIGAS.UECL,fn: () => europa.obtenerPartidosEuropa('UECL') }
        ];

        let partidosHoy = [];

        for (const liga of ligasMonitoreadas) {
            try {
                const data = await liga.fn();
                if (data && data.events) {
                    const filtrados = data.events.filter(e => e.dateEvent === hoyStr);
                    filtrados.forEach(p => { p.strLeagueName = liga.nombre; });
                    partidosHoy.push(...filtrados);
                }
            } catch (err) {
                // Una liga fallida no debe interrumpir las demás
            }
        }

        res.json({ events: partidosHoy });
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener partidos de hoy' });
    }
});

// Endpoint unificado: Tabla de posiciones por liga
router.get('/posiciones/:liga', async (req, res) => {
    const liga = req.params.liga.toUpperCase();
    try {
        if (liga === 'ARG') {
            const data = await argentina.obtenerPosiciones();
            res.json(data);
        } else {
            const data = await europa.obtenerPosicionesEuropa(liga);
            res.json(data);
        }
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener posiciones' });
    }
});

// Endpoint unificado: Fixture/Partidos por liga
router.get('/partidos/:liga', async (req, res) => {
    const liga = req.params.liga.toUpperCase();
    const round = req.query.round || null;

    try {
        if (liga === 'ARG') {
            const data = await argentina.obtenerPartidos({ round });
            res.json(data);
        } else {
            const data = await europa.obtenerPartidosEuropa(liga, round);
            res.json(data);
        }
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener partidos' });
    }
});

module.exports = router;
