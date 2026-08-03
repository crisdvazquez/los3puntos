const express = require('express');
const router = express.Router();
const argentina = require('../services/argentina');
const europa = require('../services/footballData');

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
            { codigo: 'ARG', nombre: 'Liga Profesional', fn: () => argentina.obtenerPartidos() },
            { codigo: 'PL',  nombre: 'Premier League',   fn: () => europa.obtenerPartidosEuropa('PL') },
            { codigo: 'PD',  nombre: 'LaLiga',           fn: () => europa.obtenerPartidosEuropa('PD') },
            { codigo: 'SA',  nombre: 'Serie A',          fn: () => europa.obtenerPartidosEuropa('SA') },
            { codigo: 'BL1', nombre: 'Bundesliga',       fn: () => europa.obtenerPartidosEuropa('BL1') },
            { codigo: 'FL1', nombre: 'Ligue 1',          fn: () => europa.obtenerPartidosEuropa('FL1') },
            { codigo: 'CL',  nombre: 'Champions League', fn: () => europa.obtenerPartidosEuropa('CL') }
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
