require('dotenv').config();
const express = require('express');
const path = require('path');
const apiRouter = require('./src/routes');
const getLeagueAdapter = require('./src/services/leagues');
const { obtenerTemporadaActual } = require('./src/utils/dateFormat');
const liveMatchesPoller = require('./src/services/live/liveMatchesPoller');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));
app.use('/api', apiRouter);
app.get('/liga/:seccion/:liga', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);

    liveMatchesPoller.start();

    // Pre-warm cache for the most common leagues in the background so the
    // first real visitor doesn't pay the cold-start cost.
    const season = obtenerTemporadaActual();
    const ligasPrioritarias = ['ARG', 'CL', 'PL', 'PD', 'LIB', 'SUD'];
    Promise.allSettled(
        ligasPrioritarias.map(codigo => {
            const adapter = getLeagueAdapter(codigo);
            const fixturesPromise = codigo === 'ARG'
                ? adapter.getFixtures({})
                : adapter.getFixtures({ season });
            const standingsPromise = codigo === 'ARG'
                ? adapter.getStandings()
                : adapter.getStandings(season);
            return Promise.allSettled([fixturesPromise, standingsPromise]);
        })
    ).then(() => {
        console.log('Cache warm-up completado.');
    }).catch(() => {});
});