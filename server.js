const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.API_KEY;

app.use(cors());

// Servir archivos estáticos del frontend
app.use(express.static(path.join(__dirname, 'public')));

// Endpoint que consulta a la API de Football-Data
app.get('/api/partidos', async (req, res) => {
  try {
    if (!API_KEY) {
      return res.status(500).json({ error: 'Falta la API_KEY en el archivo .env' });
    }

    const response = await fetch('https://api.football-data.org/v4/competitions/PL/matches?limit=10', {
      headers: {
        'X-Auth-Token': API_KEY,
        'User-Agent': 'Mozilla/5.0'
      }
    });

    if (!response.ok) {
      return res.status(response.status).json({ 
        error: `La API respondió con estado ${response.status}` 
      });
    }

    const data = await response.json();
    res.json(data);

  } catch (error) {
    console.error('Error al consultar la API:', error.message);
    res.status(500).json({ error: 'Error al conectar con la API de fútbol.' });
  }
});

// Para cualquier otra ruta, servimos el index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});