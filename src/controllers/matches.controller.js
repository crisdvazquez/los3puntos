// src/controllers/matches.controller.js
const getLeagueAdapter = require("../services/leagues");
const { obtenerPartidosEnVivo } = require("../services/live/liveMatches.service");
const { LIGAS_MAP } = require("../services/leagues/StandardLeagueAdapter");
const { NOMBRES_LIGAS, LOGOS_LIGAS } = require("../config/leagues.config");
const { obtenerTemporadaActual, obtenerFechaArgentinaRelativa } = require("../utils/dateFormat");

const LIGAS_MONITOREADAS = Object.keys(NOMBRES_LIGAS);

async function obtenerEventosHome(fechaObjetivo, bypassCache = false) {
    const resultados = await Promise.allSettled(
        LIGAS_MONITOREADAS.map(async codigo => {
            const adapter = getLeagueAdapter(codigo);
            const data = codigo === 'ARG'
                ? await adapter.getFixtures({ date: fechaObjetivo, bypassCache })
                : await adapter.getFixtures({ date: fechaObjetivo, bypassCache, season: obtenerTemporadaActual() });

            const filtrados = data?.events?.filter(e => e.dateEvent === fechaObjetivo) || [];
            filtrados.forEach(p => {
                p.strLeagueName = NOMBRES_LIGAS[codigo];
                p.strLeagueLogo = LOGOS_LIGAS[codigo] || '';
            });
            return filtrados;
        })
    );

    return resultados
        .filter(resultado => resultado.status === 'fulfilled')
        .flatMap(resultado => resultado.value);
}

// GET /api/partidos/hoy
exports.getPartidosHoy = async (req, res) => {
    try {
        const offsetDias = Number.parseInt(req.query.offset ?? '0', 10);
        const fechaObjetivo = req.query.date
            || (Number.isNaN(offsetDias) ? obtenerFechaArgentinaRelativa(0) : obtenerFechaArgentinaRelativa(offsetDias));
        const bypassCache = req.query.live === '1';

        if (bypassCache) {
            const eventosEnVivo = await obtenerPartidosEnVivo();
            const idAData = new Map(Object.entries(LIGAS_MAP).map(([codigo, config]) => [config.id, { codigo, config }]));
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

        const partidosHoy = await obtenerEventosHome(fechaObjetivo, bypassCache);

        res.set('Cache-Control', 'public, max-age=30, stale-while-revalidate=60');
        res.json({ events: partidosHoy });
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener partidos de hoy' });
    }
};

// GET /api/partidos/hoy/live-scores
exports.getLiveScoresHoy = async (req, res) => {
    try {
        const fechaObjetivo = req.query.date || obtenerFechaArgentinaRelativa(0);
        const eventos = await obtenerEventosHome(fechaObjetivo, true);
        const liveScores = eventos
            .filter(evento => evento.strStatus === 'IN_PLAY')
            .map(evento => ({
                fixtureId: evento.fixtureId ?? null,
                homeTeam: evento.strHomeTeam,
                awayTeam: evento.strAwayTeam,
                homeScore: evento.intHomeScore,
                awayScore: evento.intAwayScore,
                elapsed: evento.intElapsed,
                extra: evento.intExtra ?? null,
                statusShort: evento.statusShort ?? null,
                displayMinute: evento.displayMinute ?? null,
                strLeagueName: evento.strLeagueName
            }));

        res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.json({ events: liveScores });
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener live scores de hoy' });
    }
};

// GET /api/partidos/:liga
exports.getPartidosPorLiga = async (req, res) => {
    const liga = req.params.liga.toUpperCase();
    const round = req.query.round || null;
    const bypassCache = req.query.live === '1';

    try {
        const adapter = getLeagueAdapter(liga);
        const data = liga === 'ARG'
            ? await adapter.getFixtures({ round, bypassCache })
            : await adapter.getFixtures({ round, bypassCache, season: obtenerTemporadaActual() });

        res.set('Cache-Control', 'public, max-age=30, stale-while-revalidate=60');
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener partidos' });
    }
};