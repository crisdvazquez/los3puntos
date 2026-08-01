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
    const cacheKey = `posiciones_arg_forzado_absoluto_${SEASON}`;
    const cachedData = cache.get(cacheKey);
    
    if (cachedData) return cacheData;

    try {
        const { data } = await api.get(`/standings?league=${LEAGUE_ID}&season=${SEASON}`);
        const responseList = data.response || [];
        
        const tablaPlana = [];
        const gruposSeparados = {};

        // Limpiamos la caché interna de NodeCache para este request obligando a refrescar
        cache.del(cacheKey);

        // Si la API devuelve 2 elementos, el segundo es siempre el torneo actual (Clausura) y el primero el Apertura.
        // Los ordenamos explícitamente: [Clausura, Apertura]
        let bloquesAProcesar = [];
        
        if (responseList.length >= 2) {
            // Forzamos el orden manual: Elemento 1 (Clausura) primero, Elemento 0 (Apertura) después
            bloquesAProcesar = [
                { nombre: "TORNEO CLAUSURA", data: responseList[1] },
                { nombre: "TORNEO APERTURA", data: responseList[0] }
            ];
        } else if (responseList.length === 1) {
            bloquesAProcesar = [
                { nombre: "TORNEO CLAUSURA", data: responseList[0] }
            ];
        }

        bloquesAProcesar.forEach(bloque => {
            if (!bloque.data || !bloque.data.league || !bloque.data.league.standings) return;

            bloque.data.league.standings.forEach((group, idx) => {
                const rawGroupName = group[0]?.group || `Zona ${idx === 0 ? 'A' : 'B'}`;
                let cleanGroup = rawGroupName.replace(/Group/i, 'ZONA').toUpperCase();
                if (!cleanGroup.includes('ZONA')) cleanGroup = `ZONA ${cleanGroup}`;

                // Nombre limpio y único por sección
                const tituloSeccion = `${bloque.nombre} - ${cleanGroup}`;

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

        cache.set(cacheKey, resultado, 60); // Caché muy corta de 1 minuto para pruebas
        return resultado;

    } catch (error) {
        console.error("Error en obtenerPosiciones Argentina:", error.response?.data || error.message);
        return { table: [], standings: [], groups: {}, leagueLogo: "https://media.api-sports.io/football/leagues/128.png" };
    }
}

async function obtenerPartidos(params = {}) {
    const roundParam = params.round || null;
    const cacheKey = `partidos_arg_forzado_absoluto_${LEAGUE_ID}_${SEASON}`;

    let allFixtures = [];
    try {
        const { data } = await api.get(`/fixtures?league=${LEAGUE_ID}&season=${SEASON}`);
        allFixtures = data.response || [];
    } catch (error) {
        console.error("Error en obtenerPartidos Argentina:", error.response?.data || error.message);
        allFixtures = [];
    }

    if (allFixtures.length === 0) return { rounds: [], currentRound: "", events: [] };

    const roundsMap = {};
    allFixtures.forEach(f => {
        if (f.league?.round) roundsMap[f.league.round] = true;
    });

    let rounds = Object.keys(roundsMap).sort((a, b) => {
        const numA = parseInt((a.match(/\d+/) || [0])[0], 10);
        const numB = parseInt((b.match(/\d+/) || [0])[0], 10);
        return numA - numB;
    });

    let roundsClausura = rounds;
    if (rounds.length > 22) {
        roundsClausura = rounds.slice(17);
    }

    let currentRound = roundParam;
    if (!currentRound || !rounds.includes(currentRound)) {
        const enVivo = allFixtures.find(f => ["1H", "2H", "HT", "ET", "P"].includes(f.fixture?.status?.short));
        if (enVivo) {
            currentRound = enVivo.league.round;
        } else {
            const prox = allFixtures.find(f => f.fixture?.status?.short === "NS" && roundsClausura.includes(f.league.round));
            currentRound = prox ? prox.league.round : (roundsClausura[0] || rounds[0]);
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
        rounds: roundsClausura.length > 0 ? roundsClausura : rounds,
        currentRound,
        events
    };
}

module.exports = {
    obtenerPartidos,
    obtenerPosiciones
};