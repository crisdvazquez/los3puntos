// src/routes/index.js
const express = require('express');
const router = express.Router();

const matchesRoutes = require('./matches.routes');
const standingsRoutes = require('./standings.routes');
const liveRoutes = require('./live.routes');

router.use(matchesRoutes);
router.use(standingsRoutes);
router.use(liveRoutes);

module.exports = router;