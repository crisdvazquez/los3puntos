const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.API_KEY;

app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// Endpoint de Partidos (acepta query param ?season=YYYY)
app.get('/api/partidos', async (req, res) => {
  try {
    if (!API_KEY) {
      return res.status(500).json({ error: 'Falta la API_KEY en .env' });
    }
    const liga = req.query.liga || 'PL';
    const season = req.query.season ? `&season=${req.query.season}` : '';

    const response = await fetch(`https://api.football-data.org/v4/competitions/${liga}/matches?limit=100${season}`, {
      headers: { 'X-Auth-Token': API_KEY, 'User-Agent': 'Mozilla/5.0' }
    });

    if (!response.ok) return res.status(response.status).json({ error: `Error API: ${response.status}` });
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Error al conectar con los partidos.' });
  }
});

// Endpoint de Posiciones (acepta query param ?season=YYYY)
app.get('/api/posiciones', async (req, res) => {
  try {
    if (!API_KEY) {
      return res.status(500).json({ error: 'Falta la API_KEY en .env' });
    }
    const liga = req.query.liga || 'PL';
    const season = req.query.season ? `?season=${req.query.season}` : '';

    const response = await fetch(`https://api.football-data.org/v4/competitions/${liga}/standings${season}`, {
      headers: { 'X-Auth-Token': API_KEY, 'User-Agent': 'Mozilla/5.0' }
    });

    if (!response.ok) return res.status(response.status).json({ error: `Error API: ${response.status}` });
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Error al conectar con las posiciones.' });
  }
});

// Endpoint de Equipos (fallback para tablas cuando el torneo aún no arrancó)
app.get('/api/equipos', async (req, res) => {
  try {
    if (!API_KEY) {
      return res.status(500).json({ error: 'Falta la API_KEY en .env' });
    }
    const liga = req.query.liga || 'PL';

    const response = await fetch(`https://api.football-data.org/v4/competitions/${liga}/teams`, {
      headers: { 'X-Auth-Token': API_KEY, 'User-Agent': 'Mozilla/5.0' }
    });

    if (!response.ok) return res.status(response.status).json({ error: `Error API: ${response.status}` });
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Error al conectar con los equipos.' });
  }
});

// TheSportsDB: fútbol argentino (sin tope diario, solo 30 req/min en la key free)
const SPORTSDB_KEY = '123'; // key pública gratuita de TheSportsDB (no es secreta)
const SPORTSDB_LIGA_ARG = '4406'; // idLeague de la Liga Profesional Argentina

app.get('/api/arg/posiciones', async (req, res) => {
  try {
    const season = req.query.season || '2026';
    const response = await fetch(`https://www.thesportsdb.com/api/v1/json/${SPORTSDB_KEY}/lookuptable.php?l=${SPORTSDB_LIGA_ARG}&s=${season}`);
    if (!response.ok) return res.status(response.status).json({ error: `Error API: ${response.status}` });
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Error al conectar con las posiciones de Argentina.' });
  }
});

app.get('/api/arg/partidos', async (req, res) => {
  try {
    const season = req.query.season || '2026';
    const response = await fetch(`https://www.thesportsdb.com/api/v1/json/${SPORTSDB_KEY}/eventsseason.php?id=${SPORTSDB_LIGA_ARG}&s=${season}`);
    if (!response.ok) return res.status(response.status).json({ error: `Error API: ${response.status}` });
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Error al conectar con los partidos de Argentina.' });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
});