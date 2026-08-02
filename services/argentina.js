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
    const cacheKey = `posiciones_arg_seguro_v7_${SEASON}`;
    const cachedData = cache.get(cacheKey);
    
    if (cachedData) return cachedData;

    try {
        const { data } = await api.get(`/standings?league=${LEAGUE_ID}&season=${SEASON}`);
        const responseList = data.response || [];
        
        const tablaPlana = [];
        const gruposSeparados = {};

        if (responseList.length === 0) {
            return { table: [], standings: [], groups: {}, leagueLogo: "https://media.api-sports.io/football/leagues/128.png" };
        }

        // Ordenamos de manera segura: si vienen dos bloques, invertimos para que el más nuevo quede arriba
        let listaBloques = [...responseList];
        if (listaBloques.length >= 2) {
            listaBloques.reverse(); // Pone el último bloque (Clausura/Actual) arriba y el primero abajo
        }

        listaBloques.forEach((leagueObj, index) => {
            const leagueData = leagueObj.league || {};
            const rawName = leagueData.name || (index === 0 ? "TORNEO CLAUSURA" : "TORNEO APERTURA");
            const standingsRounds = leagueData.standings || [];

            standingsRounds.forEach((group, idx) => {
                if (!Array.isArray(group) || group.length === 0) return;
                
                const rawGroupName = group[0]?.group || `Zona ${idx === 0 ? 'A' : 'B'}`;
                let cleanGroup = rawGroupName.replace(/Group/i, 'ZONA').toUpperCase();
                if (!cleanGroup.includes('ZONA')) cleanGroup = `ZONA ${cleanGroup}`;

                const tituloSeccion = `${rawName.toUpperCase()} - ${cleanGroup}`;

                const equipos = group.map(eq => ({
                    intRank: eq.rank,
                    strTeam: eq.team?.name || "Equipo",
                    strBadge: eq.team?.logo || "",
                    intPoints: eq.points || 0,
                    intGoalsFor: eq.all?.goals?.for || 0,
                    intGoalsAgainst: eq.all?.goals?.against || 0,
                    intGoalDifference: eq.goalsDiff || 0,
                    intWin: eq.all?.win || 0,
                    intDraw: eq.all?.draw || 0,
                    intLoss: eq.all?.lose || 0
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

        cache.set(cacheKey, resultado, 1800);
        return resultado;

    } catch (error) {
        console.error("Error en obtenerPosiciones Argentina:", error.response?.data || error.message);
        return { table: [], standings: [], groups: {}, leagueLogo: "https://media.api-sports.io/football/leagues/128.png" };
    }
}

async function obtenerPartidos(params = {}) {
    const roundParam = params.round || null;
    const cacheKey = `partidos_arg_seguro_v7_${LEAGUE_ID}_${SEASON}`;

    let allFixtures = cache.get(cacheKey);
    if (!allFixtures) {
        try {
            const { data } = await api.get(`/fixtures?league=${LEAGUE_ID}&season=${SEASON}`);
            allFixtures = data.response || [];

            // Logging para depuración: longitud y muestra del primer fixture
            try {
                console.debug('Argentina: fixtures raw length=', Array.isArray(allFixtures) ? allFixtures.length : 'no-array');
                if (Array.isArray(allFixtures) && allFixtures.length > 0) {
                    const sample = allFixtures[0];
                    console.debug('Argentina: sample fixture keys=', {
                        leagueRound: sample.league?.round,
                        fixtureRound: sample.fixture?.round,
                        status: sample.fixture?.status?.short
                    });
                }
            } catch (e) {
                // no bloquear ejecución por logging
                console.debug('Argentina: error mostrando sample fixture', e.message);
            }

            // Solo cachear si vinieron fixtures
            if (Array.isArray(allFixtures) && allFixtures.length > 0) {
                cache.set(cacheKey, allFixtures, 1800);
            }
        } catch (error) {
            console.error("Error en obtenerPartidos Argentina:", error.response?.data || error.message);
            allFixtures = [];
        }
    }

    if (!Array.isArray(allFixtures) || allFixtures.length === 0) {
        return { rounds: [], currentRound: "", events: [] };
    }

    const roundsMap = {};
    allFixtures.forEach(f => {
        const roundKey = f.league?.round || f.fixture?.round;
        if (roundKey) roundsMap[roundKey] = true;
    });

    let rounds = Object.keys(roundsMap).sort((a, b) => {
        const numA = parseInt((a.match(/\d+/) || [NaN])[0], 10);
        const numB = parseInt((b.match(/\d+/) || [NaN])[0], 10);
        if (isNaN(numA) || isNaN(numB)) return a.localeCompare(b);
        return numA - numB;
    });

    let roundsFinales = rounds;
    if (rounds.length > 22) {
        roundsFinales = rounds.slice(17); // Tomamos la segunda mitad de la temporada
    }

    let currentRound = roundParam;
    if (!currentRound || !roundsFinales.includes(currentRound)) {
        const enVivo = allFixtures.find(f => ["1H", "2H", "HT", "ET", "P"].includes(f.fixture?.status?.short));
        if (enVivo && roundsFinales.includes(enVivo.league?.round || enVivo.fixture?.round)) {
            currentRound = enVivo.league?.round || enVivo.fixture?.round;
        } else {
            const prox = allFixtures.find(f => f.fixture?.status?.short === "NS" && roundsFinales.includes(f.league?.round || f.fixture?.round));
            currentRound = prox ? (prox.league?.round || prox.fixture?.round) : (roundsFinales[0] || rounds[0]);
        }
    }

    const partidosJornada = allFixtures.filter(f => (f.league?.round || f.fixture?.round) === currentRound);

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

    // Debug final sobre selección de jornada
    console.debug('Argentina: rounds count=', rounds.length, 'roundsFinales count=', roundsFinales.length, 'currentRound=', currentRound);

    return {
        rounds: roundsFinales.length > 0 ? roundsFinales : rounds,
        currentRound,
        events: eventos
    };
}

module.exports = {
    obtenerPartidos,
    obtenerPosiciones
};
