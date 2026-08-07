// src/routes/standings.routes.js
const express = require('express');
const router = express.Router();
const standingsController = require('../controllers/standings.controller');

router.get('/posiciones/:liga', standingsController.getPosicionesPorLiga);

module.exports = router;