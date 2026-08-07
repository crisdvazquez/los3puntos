// src/routes/matches.routes.js
const express = require('express');
const router = express.Router();
const matchesController = require('../controllers/matches.controller');

router.get('/partidos/hoy', matchesController.getPartidosHoy);
router.get('/partidos/hoy/live-scores', matchesController.getLiveScoresHoy);
router.get('/partidos/:liga', matchesController.getPartidosPorLiga);

module.exports = router;