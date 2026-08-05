require('dotenv').config();
const express = require('express');
const path = require('path');
const apiRouter = require('./routes/api');
const europa = require('./services/footballData');
const argentina = require('./services/argentina');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));
app.use('/api', apiRouter);

function obtenerTemporadaActual() {
    const ahora = new Date();
    return String(ahora.getUTCMonth() >= 6 ? ahora.getUTCFullYear() : ahora.getUTCFullYear() - 1);
}

app.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);

    // Pre-warm cache for the most common leagues in the background so the
    // first real visitor doesn't pay the cold-start cost.
    const season = obtenerTemporadaActual();
    const ligasPrioritarias = ['ARG', 'CL', 'EL', 'LIB', 'SUD', 'PL', 'PD', 'SA', 'BL1', 'FL1', 'CONF', 'COPA', 'PN'];
    Promise.allSettled([
        argentina.obtenerPartidos({}),
        argentina.obtenerPosiciones(),
        ...ligasPrioritarias.filter(l => l !== 'ARG').map(l => europa.obtenerPartidosEuropa(l, null, season)),
        ...ligasPrioritarias.filter(l => l !== 'ARG').map(l => europa.obtenerPosicionesEuropa(l, season))
    ]).then(() => {
        console.log('Cache warm-up completado.');
    }).catch(() => {});
});
