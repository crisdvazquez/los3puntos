// src/routes/live.routes.js
const express = require('express');
const router = express.Router();
const liveEmitter = require('../services/live/liveEmitter');
const { obtenerPartidosEnVivo } = require('../services/live/liveMatches.service');

// GET /api/live/stream
router.get('/live/stream', async (req, res) => {
    res.set({
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
    });
    res.flushHeaders();

    const enviar = (partidos) => {
        res.write(`data: ${JSON.stringify({ events: partidos })}\n\n`);
    };

    // Snapshot inicial al conectar, para no esperar el próximo ciclo del poller
    const snapshotInicial = await obtenerPartidosEnVivo(true);
    enviar(snapshotInicial);

    liveEmitter.on('update', enviar);

    req.on('close', () => {
        liveEmitter.off('update', enviar);
    });
});

module.exports = router;