const express = require('express');
const router = express.Router();
const argentina = require('../services/argentina');
const europa = require('../services/footballData');

// --- RUTAS ARGENTINA ---
router.get('/arg/posiciones', async (req, res) => {
    const data = await argentina.obtenerPosiciones();
    res.json(data);
});

router.get('/arg/partidos', async (req, res) => {
    const data = await argentina.obtenerPartidos();
    res.json(data);
});

// Endpoint: Partidos de hoy (agregador simple — por ahora devuelve sólo Argentina)
router.get('/partidos/hoy', async (req, res) => {
    try {
        const dataArg = await argentina.obtenerPartidos();
        // devolver como { events: [...] } para mantener compatibilidad con el frontend
        return res.json({ events: dataArg.events || [] });
    } catch (error) {
        console.error('Error en /partidos/hoy:', error);
        return res.status(500).json({ events: [] });
    }
});

// --- RUTAS EUROPA ---
router.get('/posiciones', async (req, res) => {
    const { liga } = req.query;
    const data = await europa.obtenerPosicionesEuropa(liga);
    res.json(data);
});

router.get('/partidos', async (req, res) => {
    const { liga } = req.query;
    const data = await europa.obtenerPartidosEuropa(liga);
    res.json(data);
});

module.exports = router;
