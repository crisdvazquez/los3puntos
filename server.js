require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const NodeCache = require('node-cache');

const app = express();
const PORT = process.env.PORT || 3000;

// Caché en memoria para optimizar tus peticiones a la API
const cache = new NodeCache();
const API_KEY = process.env.API_FOOTBALL_KEY;

console.log("=================================");
console.log("Clave API leída:", API_KEY ? "OK (Cargada correctamente)" : "ERROR - Indefinida/Revisar .env");
console.log("=================================");

const apiFootball = axios.create({
    baseURL: "https://v3.football.api-sports.io",
    headers: {
        "x-apisports-key": API_KEY
    }
});

// Mapeo de ligas a IDs oficiales de API-Football
const LIGAS_MAP = {
    "ARG": 128, // Liga Profesional Argentina
    "PL": 39,   // Premier League
    "PD": 140,  // LaLiga
    "SA": 135,  // Serie A
    "BL1": 78,  // Bundesliga
    "FL1": 61,  // Ligue 1
    "CL": 2,    // UEFA Champions League
    "LIB": 13   // Copa Libertadores
};

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Endpoint para purgar el caché cuando quieras probar datos frescos
app.get('/api/limpiar-cache', (req, res) => {
    cache.flushAll();
    console.log("🧹 Caché borrado completamente");
    res.send("Caché borrado con éxito.");
});

// ==========================================
// 1. ENDPOINTS LIGA ARGENTINA (Temporada 2026 en vivo)
// ==========================================

app.get('/api/arg/posiciones', async (req, res) => {
    const season = "2026";
    const cacheKey = `posiciones_ARG_${season}`;
    const cachedData = cache.get(cacheKey);

    if (cachedData) return res.json(cachedData);

    try {
        const leagueId = LIGAS_MAP["ARG"];
        const { data } = await apiFootball.get(`/standings?league=${leagueId}&season=${season}`);
        const standingsRounds = data.response?.[0]?.league?.standings || [];

        const tablaPlana = [];
        const gruposSeparados = {};

        standingsRounds.forEach((group, idx) => {
            const rawName = group[0]?.group || `Zona ${idx === 0 ? 'A' : 'B'}`;
            let groupName = rawName.replace(/Group A/i, 'ZONA A')
                                   .replace(/Group B/i, 'ZONA B')
                                   .replace(/Group/i, 'ZONA');

            const equipos = group.map(item => ({
                intRank: item.rank,
                strTeam: item.team?.name || "Equipo",
                strBadge: item.team?.logo || "",
                intPlayed: item.all?.played || 0,
                intGoalDifference: item.goalsDiff || 0,
                intPoints: item.points || 0
            }));

            tablaPlana.push({
                intRank: "---",
                isHeader: true,
                strTeam: `=== ${groupName.toUpperCase()} ===`,
                strBadge: "",
                intPlayed: "-",
                intGoalDifference: "-",
                intPoints: "-"
            });

            tablaPlana.push(...equipos);
            gruposSeparados[groupName] = equipos;
        });

        const respuesta = { table: tablaPlana, groups: gruposSeparados };

        if (tablaPlana.length > 0) cache.set(cacheKey, respuesta, 3600);
        res.json(respuesta);

    } catch (error) {
        console.error("Error en /api/arg/posiciones:", error.response?.data || error.message);
        res.status(500).json({ error: "Error al obtener posiciones de Argentina" });
    }
});

app.get('/api/arg/partidos', async (req, res) => {
    const season = "2026";
    const cacheKey = `partidos_ARG_${season}`;
    const cachedData = cache.get(cacheKey);

    if (cachedData) return res.json(cachedData);

    try {
        const leagueId = LIGAS_MAP["ARG"];
        const { data } = await apiFootball.get(`/fixtures?league=${leagueId}&season=${season}`);
        const fixtures = data.response || [];

        if (fixtures.length === 0) {
            return res.json({ currentWeek: "1", labelJornada: "Fecha 1", events: [] });
        }

        const enVivo = fixtures.filter(f => ["1H", "2H", "HT", "ET", "P"].includes(f.fixture?.status?.short));
        
        let roundActual = fixtures[0]?.league?.round || "Regular Season - 1";
        if (enVivo.length > 0) {
            roundActual = enVivo[0].league?.round;
        } else {
            const proximos = fixtures.find(f => f.fixture?.status?.short === "NS");
            if (proximos) roundActual = proximos.league?.round;
        }

        const numeroFecha = roundActual.match(/\d+/) ? roundActual.match(/\d+/)[0] : "1";
        const labelFecha = `Fecha ${numeroFecha}`;

        const partidosJornada = fixtures.filter(f => f.league?.round === roundActual);

        const eventos = partidosJornada.map(item => {
            const statusShort = item.fixture?.status?.short;
            let statusMapped = "SCHEDULED";
            if (["1H", "2H", "HT", "ET", "P"].includes(statusShort)) statusMapped = "IN_PLAY";
            if (["FT", "AET", "PEN"].includes(statusShort)) statusMapped = "FINISHED";

            return {
                intRound: String(numeroFecha),
                strRoundName: labelFecha,
                dateEvent: item.fixture?.date ? item.fixture.date.split("T")[0] : "",
                strTime: item.fixture?.date ? item.fixture.date.split("T")[1].substring(0, 5) : "00:00",
                strHomeTeam: item.teams?.home?.name || "Local",
                strHomeTeamBadge: item.teams?.home?.logo || "",
                strAwayTeam: item.teams?.away?.name || "Visitante",
                strAwayTeamBadge: item.teams?.away?.logo || "",
                strStatus: statusMapped,
                intHomeScore: item.goals?.home ?? null,
                intAwayScore: item.goals?.away ?? null
            };
        });

        const respuesta = {
            currentWeek: String(numeroFecha),
            labelJornada: labelFecha,
            events: eventos
        };

        const hayEnVivo = eventos.some(e => e.strStatus === "IN_PLAY");
        const ttl = hayEnVivo ? 60 : 1800; // En vivo actualiza cada 60s

        if (eventos.length > 0) cache.set(cacheKey, respuesta, ttl);
        res.json(respuesta);

    } catch (error) {
        console.error("Error en /api/arg/partidos:", error.response?.data || error.message);
        res.status(500).json({ error: "Error al obtener partidos de Argentina" });
    }
});

// ==========================================
// 2. ENDPOINTS LIGAS EUROPEAS (Temporada 2025/2026 en vivo)
// ==========================================

app.get('/api/posiciones', async (req, res) => {
    const { liga = "PL" } = req.query;
    // Si no viene season en la consulta, usará 2026 por defecto
    const season = req.query.season || "2026"; 
    
    const cacheKey = `posiciones_${liga}_${season}`;
    const cachedData = cache.get(cacheKey);

    if (cachedData) return res.json(cachedData);

    try {
        const leagueId = LIGAS_MAP[liga] || 39;
        const { data } = await apiFootball.get(`/standings?league=${leagueId}&season=${season}`);

        const standings = data.response?.[0]?.league?.standings || [];
        const competitionName = data.response?.[0]?.league?.name || "Liga";
        const emblem = data.response?.[0]?.league?.logo || "";

        const table = (standings[0] || []).map(item => ({
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
        console.error(`Error en /api/posiciones (${liga}):`, error.response?.data || error.message);
        res.status(500).json({ error: "Error al obtener la tabla de posiciones" });
    }
});

app.get('/api/partidos', async (req, res) => {
    const { liga = "PL" } = req.query;
    const season = req.query.season || "2026";

    const cacheKey = `partidos_${liga}_${season}`;
    const cachedData = cache.get(cacheKey);

    if (cachedData) return res.json(cachedData);

    try {
        const leagueId = LIGAS_MAP[liga] || 39;
        const { data } = await apiFootball.get(`/fixtures?league=${leagueId}&season=${season}`);

        const fixtures = data.response || [];
        const competitionName = fixtures[0]?.league?.name || "Liga";
        const emblem = fixtures[0]?.league?.logo || "";

        const matches = fixtures.map(item => {
            const statusShort = item.fixture?.status?.short;
            let statusMapped = "SCHEDULED";
            if (["1H", "2H", "HT", "ET", "P"].includes(statusShort)) statusMapped = "IN_PLAY";
            if (["FT", "AET", "PEN"].includes(statusShort)) statusMapped = "FINISHED";

            const roundText = item.league?.round || "1";
            const matchdayNum = roundText.match(/\d+/) ? parseInt(roundText.match(/\d+/)[0]) : 1;

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

app.listen(PORT, () => {
    console.log(`🚀 Servidor listo en http://localhost:${PORT}`);
    console.log(`⚽ Modo Pro Activo: Argentina (2026) y Europa (2025/2026) en tiempo real.`);
});