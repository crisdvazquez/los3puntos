const axios = require("axios");
const NodeCache = require("node-cache");

const API_KEY = process.env.API_FOOTBALL_KEY;
const cache = new NodeCache();

const api = axios.create({
    baseURL: "https://v3.football.api-sports.io",
    headers: { "x-apisports-key": API_KEY }
});

const LIGAS_MAP = { 
    'PL': { id: 39, logo: 'https://media.api-sports.io/football/leagues/39.png' },
    'PD': { id: 140, logo: 'https://media.api-sports.io/football/leagues/140.png' },
    'SA': { id: 135, logo: 'https://media.api-sports.io/football/leagues/135.png' },
    'BL1': { id: 78, logo: 'https://media.api-sports.io/football/leagues/78.png' },
    'FL1': { id: 61, logo: 'https://media.api-sports.io/football/leagues/61.png' },
    'CL': { id: 2, logo: 'https://media.api-sports.io/football/leagues/2.png' }
};

async function obtenerPosicionesEuropa(codigoLiga, season = "2026") {
    const ligaConfig = LIGAS_MAP[codigoLiga] || LIGAS_MAP['PL'];
    const cacheKey = `pos_eu_${ligaConfig.id}_${season}`;
    if (cache.has(cacheKey)) return cache.get(cacheKey);

    try {
        const { data } = await api.get(`/standings?league=${ligaConfig.id}&season=${season}`);
        const standings = data.response?.[0]?.league?.standings?.[0] || [];
        
        const table = standings.map(item => ({
            intRank: item.rank,
            strTeam: item.team?.name || "Equipo",
            strBadge: item.team?.logo || "",
            intPlayed: item.all?.played || 0,
            intGoalDifference: item.goalsDiff || 0,
            intPoints: item.points || 0
        }));

        const resultado = { table, leagueLogo: ligaConfig.logo };
        cache.set(cacheKey, resultado, 3600);
        return resultado;
    } catch (error) {
        return { table: [], leagueLogo: ligaConfig.logo };
    }
}

async function obtenerPartidosEuropa(codigoLiga, season = "2026") {
    const ligaConfig = LIGAS_MAP[codigoLiga] || LIGAS_MAP['PL'];
    const cacheKey = `part_eu_${ligaConfig.id}_${season}`;
    if (cache.has(cacheKey)) return cache.get(cacheKey);

    try {
        const { data } = await api.get(`/fixtures?league=${ligaConfig.id}&season=${season}`);
        const fixtures = data.response || [];

        const enVivo = fixtures.filter(f => ["1H", "2H", "HT", "ET", "P"].includes(f.fixture?.status?.short));
        let roundActual = fixtures[0]?.league?.round || "Regular Season - 1";
        if (enVivo.length > 0) roundActual = enVivo[0].league?.round;
        else {
            const proximos = fixtures.find(f => f.fixture?.status?.short === "NS");
            if (proximos) roundActual = proximos.league?.round;
        }

        const partidosJornada = fixtures.filter(f => f.league?.round === roundActual);

        const events = partidosJornada.map(item => {
            const statusShort = item.fixture?.status?.short;
            let statusMapped = "SCHEDULED";
            if (["1H", "2H", "HT", "ET", "P"].includes(statusShort)) statusMapped = "IN_PLAY";
            if (["FT", "AET", "PEN"].includes(statusShort)) statusMapped = "FINISHED";

            return {
                strRoundName: roundActual,
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

        const resultado = { events };
        const ttl = events.some(e => e.strStatus === "IN_PLAY") ? 120 : 1800;
        cache.set(cacheKey, resultado, ttl);
        return resultado;
    } catch (error) {
        return { events: [] };
    }
}

module.exports = { obtenerPosicionesEuropa, obtenerPartidosEuropa };