const express = require('express');
const router = express.Router();
const argentina = require('../services/argentina');
const europa = require('../services/footballData');

const NOMBRES_LIGAS = {
    ARG: 'Liga Profesional Argentina',
    COPA: 'Copa Argentina',
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
    CONF: 'Conference League'
};

// Devuelve la fecha actual en horario Argentina usando la zona canónica
function obtenerFechaArgentinaHoy() {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' }).format(new Date());
}

// Endpoint: Partidos de HOY en todas las ligas monitoreadas
router.get('/partidos/hoy', async (req, res) => {
    try {
        const hoyStr = obtenerFechaArgentinaHoy();
        const bypassCache = req.query.live === '1';

        const ligasMonitoreadas = [
            { codigo: 'ARG', nombre: NOMBRES_LIGAS.ARG, fn: () => argentina.obtenerPartidos({ bypassCache }) },
            { codigo: 'COPA', nombre: NOMBRES_LIGAS.COPA, fn: () => europa.obtenerPartidosEuropa('COPA', null, '2026', bypassCache) },
            { codigo: 'PN',  nombre: NOMBRES_LIGAS.PN,  fn: () => europa.obtenerPartidosEuropa('PN', null, '2026', bypassCache) },
            { codigo: 'LIB', nombre: NOMBRES_LIGAS.LIB, fn: () => europa.obtenerPartidosEuropa('LIB', null, '2026', bypassCache) },
            { codigo: 'SUD', nombre: NOMBRES_LIGAS.SUD, fn: () => europa.obtenerPartidosEuropa('SUD', null, '2026', bypassCache) },
            { codigo: 'PL',  nombre: NOMBRES_LIGAS.PL,  fn: () => europa.obtenerPartidosEuropa('PL', null, '2026', bypassCache) },
            { codigo: 'PD',  nombre: NOMBRES_LIGAS.PD,  fn: () => europa.obtenerPartidosEuropa('PD', null, '2026', bypassCache) },
            { codigo: 'SA',  nombre: NOMBRES_LIGAS.SA,  fn: () => europa.obtenerPartidosEuropa('SA', null, '2026', bypassCache) },
            { codigo: 'BL1', nombre: NOMBRES_LIGAS.BL1, fn: () => europa.obtenerPartidosEuropa('BL1', null, '2026', bypassCache) },
            { codigo: 'FL1', nombre: NOMBRES_LIGAS.FL1, fn: () => europa.obtenerPartidosEuropa('FL1', null, '2026', bypassCache) },
            { codigo: 'CL',  nombre: NOMBRES_LIGAS.CL,  fn: () => europa.obtenerPartidosEuropa('CL', null, '2026', bypassCache) },
            { codigo: 'EL',  nombre: NOMBRES_LIGAS.EL,  fn: () => europa.obtenerPartidosEuropa('EL', null, '2026', bypassCache) },
            { codigo: 'CONF',nombre: NOMBRES_LIGAS.CONF,fn: () => europa.obtenerPartidosEuropa('CONF', null, '2026', bypassCache) }
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
    const bypassCache = req.query.live === '1';

    try {
        if (liga === 'ARG') {
            const data = await argentina.obtenerPartidos({ round, bypassCache });
            res.json(data);
        } else {
            const data = await europa.obtenerPartidosEuropa(liga, round, '2026', bypassCache);
            res.json(data);
        }
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener partidos' });
    }
});

module.exports = router;
