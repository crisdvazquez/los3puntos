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