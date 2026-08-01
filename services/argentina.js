const axios = require("axios");
const NodeCache = require("node-cache");

const API_KEY = process.env.API_FOOTBALL_KEY || "TU_API_KEY_AQUI";
const LEAGUE_ID = 128; 

const cache = new NodeCache();

const api = axios.create({
    baseURL: "https://v3.football.api-sports.io",
    headers: {
        "x-apisports-key": API_KEY
    }
});

async function obtenerPosiciones(season = "2026") {
    const cacheKey = `posiciones_arg_clausura_${season}`;
    const cachedData = cache.get(cacheKey);
    
    if (cachedData) return cachedData;

    try {
        const { data } = await api.get(`/standings?league=${LEAGUE_ID}&season=${season}`);
        const responseList = data.response || [];
        
        let targetLeagueObj = responseList.find(r => r.league?.name && r.league.name.toLowerCase().includes("clausura")) || responseList[responseList.length - 1];
        const standingsRounds = targetLeagueObj?.league?.standings || [];

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
                intPoints: item.points || 0,
                intGoalsFor: item.all?.goals?.for || 0,
                intGoalsAgainst: item.all?.goals?.against || 0,
                intGoalDifference: item.goalsDiff || 0,
                intWin: item.all?.win || 0,
                intDraw: item.all?.draw || 0,
                intLoss: item.all?.lose || 0
            }));

            tablaPlana.push({
                intRank: "---",
                isHeader: true,
                strTeam: `=== ${groupName.toUpperCase()} ===`,
                strBadge: "",
                intPoints: "-",
                intGoalsFor: "-",
                intGoalsAgainst: "-",
                intGoalDifference: "-",
                intWin: "-",
                intDraw: "-",
                intLoss: "-"
            });

            tablaPlana.push(...equipos);
            gruposSeparados[groupName] = equipos;
        });

        const resultado = {
            table: tablaPlana,
            standings: tablaPlana,
            groups: gruposSeparados,
            leagueLogo: "https://media.api-sports.io/football/leagues/128.png"
        };

        cache.set(cacheKey, resultado, 3600);
        return resultado;

    } catch (error) {
        return { table: [], standings: [], groups: {}, leagueLogo: "https://media.api-sports.io/football/leagues/128.png" };
    }
}

async function obtenerPartidos(params = {}) {
    const season = params.season || "2026";
    const roundParam = params.round || null;
    const cacheKey = `partidos_arg_all_${LEAGUE_ID}_${season}`;

    let allFixtures = cache.get(cacheKey);
    if (!allFixtures) {
        try {
            const { data } = await api.get(`/fixtures?league=${LEAGUE_ID}&season=${season}`);
            allFixtures = data.response || [];
            cache.set(cacheKey, allFixtures, 1800);
        } catch (error) {
            allFixtures = [];
        }
    }

    if (allFixtures.length === 0) return { rounds: [], currentRound: "", events: [] };

    const roundsMap = {};
    allFixtures.forEach(f => {
        if (f.league?.round) roundsMap[f.league.round] = true;
    });
    let rounds = Object.keys(roundsMap);

    if (rounds.length > 20) {
        rounds = rounds.slice(-18);
    }

    let currentRound = roundParam;
    if (!currentRound || !rounds.includes(currentRound)) {
        const enVivo = allFixtures.find(f => ["1H", "2H", "HT", "ET", "P"].includes(f.fixture?.status?.short) && rounds.includes(f.league.round));
        if (enVivo) {
            currentRound = enVivo.league.round;
        } else {
            const prox = allFixtures.find(f => f.fixture?.status?.short === "NS" && rounds.includes(f.league.round));
            currentRound = prox ? prox.league.round : (rounds[rounds.length - 1] || rounds[0]);
        }
    }

    const partidosJornada = allFixtures.filter(f => f.league?.round === currentRound);

    const eventos = partidosJornada.map(item => {
        const statusShort = item.fixture?.status?.short;
        let statusMapped = "SCHEDULED";
        if (["1H", "2H", "HT", "ET", "P"].includes(statusShort)) statusMapped = "IN_PLAY";
        if (["FT", "AET", "PEN"].includes(statusShort)) statusMapped = "FINISHED";

        return {
            strRoundName: currentRound,
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

    return {
        rounds,
        currentRound,
        events
    };
}

module.exports = {
    obtenerPartidos,
    obtenerPosiciones
};