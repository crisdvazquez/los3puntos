const express = require('express');
const axios = require('axios');
const NodeCache = require('node-cache');
require('dotenv').config();

const app = express();
const cache = new NodeCache({ stdTTL: 1800 }); // Caché de 30 minutos

app.use(express.static('public'));

// Cliente Axios para API-Football
const apiFootball = axios.create({
    baseURL: 'https://v3.football.api-sports.io',
    headers: {
        'x-apisports-key': process.env.API_FOOTBALL_KEY
    }
});

// MAPEO EXPLICITO DE LIGAS (LPF = 128 es prioritario)
const LIGAS_MAP = {
    'LPF': 128, // Liga Profesional Argentina
    'PL': 39,   // Premier League
    'PD': 140,  // LaLiga
    'SA': 135,  // Serie A
    'BL1': 78,  // Bundesliga
    'FL1': 61,  // Ligue 1
    'CL': 2     // UEFA Champions League
};

// --- ENDPOINT POSICIONES ---
app.get('/api/posiciones', async (req, res) => {
    let { liga = "PL", season = "2026" } = req.query;
    
    // Si piden LPF o la clave es LPF, forzamos ID 128
    const isArgentina = (liga.toUpperCase() === "LPF" || liga === "128");
    const leagueId = isArgentina ? 128 : (LIGAS_MAP[liga] || 39);

    const cacheKey = `posiciones_${liga}_${season}`;
    const cachedData = cache.get(cacheKey);
    if (cachedData) return res.json(cachedData);

    try {
        let response = await apiFootball.get(`/standings?league=${leagueId}&season=${season}`);
        let data = response.data;

        // Fallback para Argentina: Si 2026 viene vacío, intenta traer la temporada 2025
        if (isArgentina && (!data.response || data.response.length === 0) && season === "2026") {
            const retry = await apiFootball.get(`/standings?league=${leagueId}&season=2025`);
            data = retry.data;
        }

        const standingsGroup = data.response?.[0]?.league?.standings || [];
        const competitionName = isArgentina ? "Liga Profesional Argentina" : (data.response?.[0]?.league?.name || "Liga");
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
            points: item.points || 0
        }));

        const respuesta = {
            competition: { name: competitionName, emblem: emblem },
            standings: [{ table: table }]
        };

        if (table.length > 0) cache.set(cacheKey, respuesta, 3600);
        res.json(respuesta);

    } catch (error) {
        console.error(`Error en /api/posiciones (${liga}):`, error.message);
        res.status(500).json({ error: "Error al obtener la tabla de posiciones" });
    }
});

// --- ENDPOINT PARTIDOS ---
app.get('/api/partidos', async (req, res) => {
    let { liga = "PL", season = "2026" } = req.query;

    const isArgentina = (liga.toUpperCase() === "LPF" || liga === "128");
    const leagueId = isArgentina ? 128 : (LIGAS_MAP[liga] || 39);

    const cacheKey = `partidos_${liga}_${season}`;
    const cachedData = cache.get(cacheKey);
    if (cachedData) return res.json(cachedData);

    try {
        let response = await apiFootball.get(`/fixtures?league=${leagueId}&season=${season}`);
        let data = response.data;

        // Fallback para Argentina: Si 2026 no tiene partidos cargados aún, prueba 2025
        if (isArgentina && (!data.response || data.response.length === 0) && season === "2026") {
            const retry = await apiFootball.get(`/fixtures?league=${leagueId}&season=2025`);
            data = retry.data;
        }

        let fixtures = data.response || [];

        // Filtro de fase para Argentina (Aísla Clausura / Fase 2 si existe)
        if (isArgentina && fixtures.length > 0) {
            const rondasDisponibles = [...new Set(fixtures.map(f => f.league?.round))];
            const rondaClausura = rondasDisponibles.find(r => 
                r && (r.toLowerCase().includes("clausura") || r.toLowerCase().includes("2nd phase"))
            );

            if (rondaClausura) {
                fixtures = fixtures.filter(f => 
                    f.league?.round?.toLowerCase().includes("clausura") || 
                    f.league?.round?.toLowerCase().includes("2nd phase")
                );
            }
        }

        const competitionName = isArgentina ? "Liga Profesional Argentina" : (fixtures[0]?.league?.name || "Liga");
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
                    crest: item.teams?.home?.logo || ""
                },
                awayTeam: {
                    name: item.teams?.away?.name || "Visitante",
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
        console.error(`Error en /api/partidos (${liga}):`, error.message);
        res.status(500).json({ error: "Error al obtener los partidos" });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor iniciado en puerto ${PORT}`);
});