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

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
});