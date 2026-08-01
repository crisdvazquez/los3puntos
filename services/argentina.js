const axios = require("axios");
const NodeCache = require("node-cache");

const API_KEY = process.env.API_FOOTBALL_KEY || "TU_API_KEY_AQUI";
const LEAGUE_ID = 128; 
const SEASON = "2026";

const cache = new NodeCache();

const api = axios.create({
    baseURL: "https://v3.football.api-sports.io",
    headers: {
        "x-apisports-key": API_KEY
    }
});

async function obtenerPosiciones() {
    const cacheKey = `posiciones_arg_orden_estricto_${SEASON}`;
    const cachedData = cache.get(cacheKey);
    
    if (cachedData) return cachedData;

    try {
        const { data } = await api.get(`/standings?league=${LEAGUE_ID}&season=${SEASON}`);
        const responseList = data.response || [];
        
        // Forzamos el ordenamiento: si hay 2 elementos (Apertura y Clausura), 
        // por lo general el más reciente o el segundo es el Clausura, o evaluamos por ID/Nombre.
        // Invertimos el array si es necesario para que el Clausura (último creado/activo) quede arriba.
        responseList.sort((a, b) => {
            const idA = a.league?.id || 0;
            const idB = b.league?.id || 0;
            // Si la API maneja múltiples stages, el índice mayor suele ser el torneo actual/más nuevo
            return idB - idA;
        });

        const tablaPlana = [];
        const gruposSeparados = {};

        responseList.forEach(leagueObj => {
            let leagueName = leagueObj.league?.name || "Liga Profesional";
            
            // Si el nombre genérico se repite, distinguimos visualmente
            const standingsRounds = leagueObj.league?.standings || [];

            standingsRounds.forEach((group, idx) => {
                const rawGroupName = group[0]?.group || `Zona ${idx === 0 ? 'A' : 'B'}`;
                let cleanGroup = rawGroupName.replace(/Group/i, 'ZONA').toUpperCase();
                if (!cleanGroup.includes('ZONA')) cleanGroup = `ZONA ${cleanGroup}`;

                const tituloSeccion = `${leagueName.toUpperCase()} - ${cleanGroup}`;

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
                    strTeam: `=== ${tituloSeccion} ===`,
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
                gruposSeparados[tituloSeccion] = equipos;
            });
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
        console.error("Error en obtenerPosiciones Argentina:", error.response?.data || error.message);
        return { table: [], standings: [], groups: {}, leagueLogo: "https://media.api-sports.io/football/leagues/128.png" };
    }
}

async function obtenerPartidos(params = {}) {
    const roundParam = params.round || null;
    const cacheKey = `partidos_arg_filtrado_activo_${LEAGUE_ID}_${SEASON}`;

    let allFixtures = cache.get(cacheKey);
    if (!allFixtures) {
        try {
            const { data } = await api.get(`/fixtures?league=${LEAGUE_ID}&season=${SEASON}`);
            const fixturesRaw = data.response || [];
            
            // Filtro clave: Nos quedamos únicamente con las rondas que tengan al menos un partido registrado,
            // descartando las fechas vacías o fantasmas que la API genera en blanco.
            allFixtures = fixturesRaw.filter(f => f.fixture && f.league?.round);

            cache.set(cacheKey, allFixtures, 1800);
        } catch (error) {
            console.error("Error en obtenerPartidos Argentina:", error.response?.data || error.message);
            allFixtures = [];
        }
    }

    if (allFixtures.length === 0) return { rounds: [], currentRound: "", events: [] };

    // Extraemos exclusivamente las rondas que contienen partidos reales
    const roundsMap = {};
    allFixtures.forEach(f => {
        if (f.league?.round) roundsMap[f.league.round] = true;
    });

    let rounds = Object.keys(roundsMap);

    let currentRound = roundParam;
    if (!currentRound || !rounds.includes(currentRound)) {
        // Buscamos un partido en vivo
        const enVivo = allFixtures.find(f => ["1H", "2H", "HT", "ET", "P"].includes(f.fixture?.status?.short));
        if (enVivo) {
            currentRound = enVivo.league.round;
        } else {
            // Buscamos el próximo partido programado (NS)
            const prox = allFixtures.find(f => f.fixture?.status?.short === "NS");
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