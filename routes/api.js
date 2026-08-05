const express = require('express');
const router = express.Router();
const argentina = require('../services/argentina');
const europa = require('../services/footballData');

const NOMBRES_LIGAS = {
    ARG: 'Liga Profesional Argentina',
    COPA: 'Copa Argentina',
    PN: 'Primera Nacional',
    PBM: 'Primera B Metropolitana',
    PCM: 'Primera C Metropolitana',
    FAA: 'Argentino A',
    LIB: 'CONMEBOL Libertadores',
    SUD: 'CONMEBOL Sudamericana',
    PL: 'Premier League',
    PD: 'LaLiga',
    SA: 'Serie A',
    BL1: 'Bundesliga',
    FL1: 'Ligue 1',
    CL: 'Champions League',
    EL: 'Europa League',
    CONF: 'Conference League',
    URU: 'Primera División',
    PAR: 'Copa de Primera',
    COL: 'Liga BetPlay',
    MEX: 'Liga MX',
    MLS: 'MLS',
    BRA: 'Brasileirão',
    CHI: 'Primera División',
    POR: 'Primeira Liga'
};

const LOGOS_LIGAS = {
    ARG: 'https://media.api-sports.io/football/leagues/128.png',
    PL: 'https://media.api-sports.io/football/leagues/39.png',
    PD: 'https://media.api-sports.io/football/leagues/140.png',
    SA: 'https://media.api-sports.io/football/leagues/135.png',
    BL1: 'https://media.api-sports.io/football/leagues/78.png',
    FL1: 'https://media.api-sports.io/football/leagues/61.png',
    CL: 'https://media.api-sports.io/football/leagues/2.png',
    EL: 'https://media.api-sports.io/football/leagues/3.png',
    CONF: 'https://media.api-sports.io/football/leagues/848.png',
    PN: 'https://media.api-sports.io/football/leagues/129.png',
    LIB: 'https://media.api-sports.io/football/leagues/13.png',
    SUD: 'https://media.api-sports.io/football/leagues/11.png',
    COPA: 'https://media.api-sports.io/football/leagues/130.png',
    PBM: 'https://media.api-sports.io/football/leagues/131.png',
    PCM: 'https://media.api-sports.io/football/leagues/132.png',
    FAA: 'https://media.api-sports.io/football/leagues/133.png',
    URU: 'https://media.api-sports.io/football/leagues/268.png',
    PAR: 'https://media.api-sports.io/football/leagues/250.png',
    COL: 'https://media.api-sports.io/football/leagues/239.png',
    MEX: 'https://media.api-sports.io/football/leagues/262.png',
    CHI: 'https://media.api-sports.io/football/leagues/265.png',
    MLS: 'https://media.api-sports.io/football/leagues/253.png',
    BRA: 'https://media.api-sports.io/football/leagues/71.png',
    POR: 'https://media.api-sports.io/football/leagues/94.png'
};

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

// Endpoint: Partidos de HOY en todas las ligas monitoreadas
router.get('/partidos/hoy', async (req, res) => {
    try {
        const temporadaActual = obtenerTemporadaActual();
        const offsetDias = Number.parseInt(req.query.offset ?? '0', 10);
        const fechaObjetivo = req.query.date
            || (Number.isNaN(offsetDias) ? obtenerFechaArgentinaRelativa(0) : obtenerFechaArgentinaRelativa(offsetDias));
        const bypassCache = req.query.live === '1';

        if (bypassCache) {
            const eventosEnVivo = await europa.obtenerPartidosEnVivo();
            const ligasPorId = Object.entries(europa.LIGAS_MAP || {});
            const idAData = new Map(ligasPorId.map(([codigo, config]) => [config.id, { codigo, config }]));
            idAData.set(128, { codigo: 'ARG', config: { logo: LOGOS_LIGAS.ARG } });
            const eventosMonitoreados = eventosEnVivo
                .filter(evento => idAData.has(evento.league?.id))
                .map(evento => {
                    const liga = idAData.get(evento.league.id);
                    return {
                        ...evento,
                        strLeagueName: NOMBRES_LIGAS[liga.codigo],
                        strLeagueLogo: LOGOS_LIGAS[liga.codigo] || liga.config.logo || ''
                    };
                });
            return res.json({ events: eventosMonitoreados });
        }

        const ligasMonitoreadas = [
            { codigo: 'ARG', nombre: NOMBRES_LIGAS.ARG, fn: () => argentina.obtenerPartidos({ date: fechaObjetivo, bypassCache }) },
            { codigo: 'COPA', nombre: NOMBRES_LIGAS.COPA, fn: () => europa.obtenerPartidosEuropa('COPA', null, temporadaActual, bypassCache, fechaObjetivo) },
            { codigo: 'PN',  nombre: NOMBRES_LIGAS.PN,  fn: () => europa.obtenerPartidosEuropa('PN', null, temporadaActual, bypassCache, fechaObjetivo) },
            { codigo: 'PBM', nombre: NOMBRES_LIGAS.PBM, fn: () => europa.obtenerPartidosEuropa('PBM', null, temporadaActual, bypassCache, fechaObjetivo) },
            { codigo: 'PCM', nombre: NOMBRES_LIGAS.PCM, fn: () => europa.obtenerPartidosEuropa('PCM', null, temporadaActual, bypassCache, fechaObjetivo) },
            { codigo: 'FAA', nombre: NOMBRES_LIGAS.FAA, fn: () => europa.obtenerPartidosEuropa('FAA', null, temporadaActual, bypassCache, fechaObjetivo) },
            { codigo: 'LIB', nombre: NOMBRES_LIGAS.LIB, fn: () => europa.obtenerPartidosEuropa('LIB', null, temporadaActual, bypassCache, fechaObjetivo) },
            { codigo: 'SUD', nombre: NOMBRES_LIGAS.SUD, fn: () => europa.obtenerPartidosEuropa('SUD', null, temporadaActual, bypassCache, fechaObjetivo) },
            { codigo: 'PL',  nombre: NOMBRES_LIGAS.PL,  fn: () => europa.obtenerPartidosEuropa('PL', null, temporadaActual, bypassCache, fechaObjetivo) },
            { codigo: 'PD',  nombre: NOMBRES_LIGAS.PD,  fn: () => europa.obtenerPartidosEuropa('PD', null, temporadaActual, bypassCache, fechaObjetivo) },
            { codigo: 'SA',  nombre: NOMBRES_LIGAS.SA,  fn: () => europa.obtenerPartidosEuropa('SA', null, temporadaActual, bypassCache, fechaObjetivo) },
            { codigo: 'BL1', nombre: NOMBRES_LIGAS.BL1, fn: () => europa.obtenerPartidosEuropa('BL1', null, temporadaActual, bypassCache, fechaObjetivo) },
            { codigo: 'FL1', nombre: NOMBRES_LIGAS.FL1, fn: () => europa.obtenerPartidosEuropa('FL1', null, temporadaActual, bypassCache, fechaObjetivo) },
            { codigo: 'CL',  nombre: NOMBRES_LIGAS.CL,  fn: () => europa.obtenerPartidosEuropa('CL', null, temporadaActual, bypassCache, fechaObjetivo) },
            { codigo: 'EL',  nombre: NOMBRES_LIGAS.EL,  fn: () => europa.obtenerPartidosEuropa('EL', null, temporadaActual, bypassCache, fechaObjetivo) },
            { codigo: 'CONF',nombre: NOMBRES_LIGAS.CONF,fn: () => europa.obtenerPartidosEuropa('CONF', null, temporadaActual, bypassCache, fechaObjetivo) },
            { codigo: 'URU', nombre: NOMBRES_LIGAS.URU, fn: () => europa.obtenerPartidosEuropa('URU', null, temporadaActual, bypassCache, fechaObjetivo) },
            { codigo: 'PAR', nombre: NOMBRES_LIGAS.PAR, fn: () => europa.obtenerPartidosEuropa('PAR', null, temporadaActual, bypassCache, fechaObjetivo) },
            { codigo: 'COL', nombre: NOMBRES_LIGAS.COL, fn: () => europa.obtenerPartidosEuropa('COL', null, temporadaActual, bypassCache, fechaObjetivo) },
            { codigo: 'MEX', nombre: NOMBRES_LIGAS.MEX, fn: () => europa.obtenerPartidosEuropa('MEX', null, temporadaActual, bypassCache, fechaObjetivo) },
            { codigo: 'CHI', nombre: NOMBRES_LIGAS.CHI, fn: () => europa.obtenerPartidosEuropa('CHI', null, temporadaActual, bypassCache, fechaObjetivo) },
            { codigo: 'MLS', nombre: NOMBRES_LIGAS.MLS, fn: () => europa.obtenerPartidosEuropa('MLS', null, temporadaActual, bypassCache, fechaObjetivo) },
            { codigo: 'BRA', nombre: NOMBRES_LIGAS.BRA, fn: () => europa.obtenerPartidosEuropa('BRA', null, temporadaActual, bypassCache, fechaObjetivo) },
            { codigo: 'POR', nombre: NOMBRES_LIGAS.POR, fn: () => europa.obtenerPartidosEuropa('POR', null, temporadaActual, bypassCache, fechaObjetivo) }
        ];

        const resultados = await Promise.allSettled(
            ligasMonitoreadas.map(async liga => {
                const data = await liga.fn();
                const filtrados = data?.events?.filter(e => e.dateEvent === fechaObjetivo) || [];
                filtrados.forEach(p => {
                    p.strLeagueName = liga.nombre;
                    p.strLeagueLogo = LOGOS_LIGAS[liga.codigo] || '';
                });
                return filtrados;
            })
        );
        const partidosHoy = resultados
            .filter(resultado => resultado.status === 'fulfilled')
            .flatMap(resultado => resultado.value);

        res.set('Cache-Control', 'public, max-age=30, stale-while-revalidate=60');
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
            const data = await europa.obtenerPosicionesEuropa(liga, obtenerTemporadaActual());
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
        const temporadaActual = obtenerTemporadaActual();
        if (liga === 'ARG') {
            const data = await argentina.obtenerPartidos({ round, bypassCache });
            res.json(data);
        } else {
            const data = await europa.obtenerPartidosEuropa(liga, round, temporadaActual, bypassCache);
            res.json(data);
        }
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener partidos' });
    }
});

module.exports = router;
