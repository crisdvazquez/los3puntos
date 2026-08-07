// src/controllers/standings.controller.js
const getLeagueAdapter = require("../services/leagues");
const { obtenerTemporadaActual } = require("../utils/dateFormat");

// GET /api/posiciones/:liga
exports.getPosicionesPorLiga = async (req, res) => {
    const liga = req.params.liga.toUpperCase();
    try {
        const adapter = getLeagueAdapter(liga);
        const data = liga === 'ARG'
            ? await adapter.getStandings()
            : await adapter.getStandings(obtenerTemporadaActual());

        res.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=600');
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener posiciones' });
    }
};