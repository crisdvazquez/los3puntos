const express = require('express');
const axios = require('axios');
const NodeCache = require('node-cache');
require('dotenv').config();

const app = express();
const cache = new NodeCache({ stdTTL: 1800 }); // Caché de 30 minutos

app.use(express.static('public'));

// Instancia Axios para API-Football
const apiFootball = axios.create({
    baseURL: 'https://v3.football.api-sports.io',
    headers: {
        'x-apisports-key': process.env.API_FOOTBALL_KEY
    }
});

// MAPEO DE LIGAS A IDs OFICIALES DE API-FOOTBALL (v3)
const LIGAS_MAP = {
    'LPF': 128, // Liga Profesional Argentina / Torneo Clausura
    'PL': 39,   // Premier League
    'PD': 140,  // LaLiga
    'SA': 135,  // Serie A
    'BL1': 78,  // Bundesliga
    'FL1': 61,  // Ligue 1
    'CL': 2     // UEFA Champions League
};

// --- ENDPOINT POSICIONES ---
app.get('/api/posiciones', async (req, res) => {
    const { liga = "PL" } = req.query;
    const season = req.query.season || "2026";
    
    // Garantiza que LPF siempre tome el ID 128
    const leagueId = LIGAS_MAP[liga] || (parseInt(liga) ? parseInt(liga) : 39);

    const cacheKey = `posiciones_${liga}_${season}`;
    const cachedData = cache.get(cacheKey);

    if (cachedData) return res.json(cachedData);

    try {
        const { data } = await apiFootball.get(`/standings?league=${leagueId}&season=${season}`);

        const standingsGroup = data.response?.[0]?.league?.standings || [];
        const competitionName = data.response?.[0]?.league?.name || "Liga";
        const emblem = data.response?.[0]?.league?.logo || "";

        const rawTable = standingsGroup.flatMap(group => group);

        const table = rawTable.map(item => ({
            position: item.rank,
            team: {
                name: item.team?.name || "Equipo",
                shortName: item.team?.name || "Equipo",
                crest: item.team?.logo || ""
            },
            playedGames: item.all?.played || 0,
            goalDifference: item.goalsDiff || 0,
            points: item.points || 0,
            group: item.group || null
        }));

        const respuesta = {
            competition: { name: competitionName, emblem: emblem },
            standings: [{ table: table }]
        };

        if (table.length > 0) cache.set(cacheKey, respuesta, 3600);
        res.json(respuesta);

    } catch (error) {
        console.error(`Error en /api/posiciones (${liga}):`, error.response?.data || error.message);
        res.status(500).json({ error: "Error al obtener la tabla de posiciones" });
    }
});

// --- ENDPOINT PARTIDOS ---
app.get('/api/partidos', async (req, res) => {
    const { liga = "PL" } = req.query;
    const season = req.query.season || "2026";
    
    const leagueId = LIGAS_MAP[liga] || (parseInt(liga) ? parseInt(liga) : 39);

    const cacheKey = `partidos_${liga}_${season}`;
    const cachedData = cache.get(cacheKey);

    if (cachedData) return res.json(cachedData);

    try {
        const { data } = await apiFootball.get(`/fixtures?league=${leagueId}&season=${season}`);
        let fixtures = data.response || [];

        // Filtro específico si es Liga Argentina para aislar la etapa en curso
        if (liga === "LPF" || leagueId === 128) {
            const rondasDisponibles = [...new Set(fixtures.map(f => f.league?.round))];
            
            const rondaClausura = rondasDisponibles.find(r => 
                r && (r.toLowerCase().includes("clausura") || r.toLowerCase().includes("2nd phase") || r.toLowerCase().includes("second phase"))
            );

            if (rondaClausura) {
                fixtures = fixtures.filter(f => 
                    f.league?.round?.toLowerCase().includes("clausura") || 
                    f.league?.round?.toLowerCase().includes("2nd phase")
                );
            }
        }

        const competitionName = fixtures[0]?.league?.name || "Liga";
        const emblem = fixtures[0]?.league?.logo || "";

        const matches = fixtures.map(item => {
            const statusShort = item.fixture?.status?.short;
            let statusMapped = "SCHEDULED";
            if (["1H", "2H", "HT", "ET", "P"].includes(statusShort)) statusMapped = "IN_PLAY";
            if (["FT", "AET", "PEN"].includes(statusShort)) statusMapped = "FINISHED";

            const roundText = item.league?.round || "1";
            const matchdayMatch = roundText.match(/\d+/);
            const matchdayNum = matchdayMatch ? parseInt(matchdayMatch[0]) : 1;

            return {
                matchday: matchdayNum,
                utcDate: item.fixture?.date,
                status: statusMapped,
                homeTeam: {
                    name: item.teams?.home?.name || "Local",
                    shortName: item.teams?.home?.name || "Local",
                    crest: item.teams?.home?.logo || ""
                },
                awayTeam: {
                    name: item.teams?.away?.name || "Visitante",
                    shortName: item.teams?.away?.name || "Visitante",
                    crest: item.teams?.away?.logo || ""
                },
                score: {
                    fullTime: {
                        home: item.goals?.home ?? "-",
                        away: item.goals?.away ?? "-"
                    }
                }
            };
        });

        const respuesta = {
            competition: { name: competitionName, emblem: emblem },
            matches: matches
        };

        const hayEnVivo = matches.some(m => m.status === "IN_PLAY");
        const ttl = hayEnVivo ? 60 : 1800;

        if (matches.length > 0) cache.set(cacheKey, respuesta, ttl);
        res.json(respuesta);

    } catch (error) {
        console.error(`Error en /api/partidos (${liga}):`, error.response?.data || error.message);
        res.status(500).json({ error: "Error al obtener los partidos" });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor iniciado en http://localhost:${PORT}`);
});