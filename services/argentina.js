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

// Función para convertir hora UTC a Argentina (-3 horas)
function convertirHoraAArgentina(fechaUTC) {
    const date = new Date(fechaUTC);
    const argentinaTime = new Date(date.getTime() - (3 * 60 * 60 * 1000));
    const horas = String(argentinaTime.getUTCHours()).padStart(2, '0');
    const minutos = String(argentinaTime.getUTCMinutes()).padStart(2, '0');
    return `${horas}:${minutos}`;
}

// Función para obtener la fecha en Argentina
function obtenerFechaArgentina(fechaUTC) {
    const date = new Date(fechaUTC);
    const argentinaTime = new Date(date.getTime() - (3 * 60 * 60 * 1000));
    return argentinaTime.toISOString().split("T")[0];
}

async function obtenerPosiciones() {
    const cacheKey = `posiciones_arg_seguro_v9_${SEASON}`;
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

        // Log de diagnóstico: registrar nombres reales que devuelve la API
        console.log('ARG standings: total blocks from API=', listaBloques.length);
        listaBloques.forEach((b, i) => {
            const nombre = b.league?.name || '(sin nombre)';
            const grupos = (b.league?.standings || []).map((g, gi) => g[0]?.group || `grupo_${gi}`);
            console.log(`  bloque[${i}]: name="${nombre}" grupos=${JSON.stringify(grupos)}`);
        });

        // Filtro nivel 1: preferir bloques cuyo nombre contenga "clausura"
        const bloquesClausura = listaBloques.filter(b =>
            (b.league?.name || "").toLowerCase().includes("clausura")
        );
        if (bloquesClausura.length > 0) {
            listaBloques = bloquesClausura;
            console.log('ARG standings: filtro por "clausura" en nombre aplicado, bloques restantes=', listaBloques.length);
        } else if (listaBloques.length > 1) {
            // Si hay múltiples bloques y ninguno menciona clausura, quedarse solo con el primero (más reciente tras reverse)
            listaBloques = listaBloques.slice(0, 1);
            console.log('ARG standings: fallback a slice(0,1), bloques restantes=', listaBloques.length);
        }

        // Filtro nivel 2: dentro de cada bloque, excluir grupos que mencionen "apertura"
        // (cubre el caso en que la API devuelve un único bloque con los 4 grupos mezclados)
        listaBloques = listaBloques.map(bloqueObj => {
            const standings = bloqueObj.league?.standings || [];
            const filtrados = standings.filter(group => {
                if (!Array.isArray(group) || group.length === 0) return false;
                const groupName = (group[0]?.group || "").toLowerCase();
                return !groupName.includes("apertura");
            });
            if (filtrados.length < standings.length) {
                console.log('ARG standings: filtro nivel 2 eliminó', standings.length - filtrados.length, 'grupo(s) con "apertura"');
                return { ...bloqueObj, league: { ...bloqueObj.league, standings: filtrados } };
            }
            return bloqueObj;
        });

        // Filtro nivel 3: si después de los filtros anteriores aún quedan grupos de apertura
        // (por nombre del bloque), excluimos esos bloques enteros
        const bloquesApertura = listaBloques.filter(b =>
            (b.league?.name || "").toLowerCase().includes("apertura")
        );
        if (bloquesApertura.length > 0 && bloquesApertura.length < listaBloques.length) {
            listaBloques = listaBloques.filter(b =>
                !(b.league?.name || "").toLowerCase().includes("apertura")
            );
            console.log('ARG standings: filtro nivel 3 eliminó bloques de apertura, restantes=', listaBloques.length);
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

                // Normalizar a GRUPO A / GRUPO B para la vista
                let grupoLabel = cleanGroup;
                if (/ZONA\s*A$/i.test(cleanGroup)) grupoLabel = 'GRUPO A';
                else if (/ZONA\s*B$/i.test(cleanGroup)) grupoLabel = 'GRUPO B';

                const tituloSeccion = grupoLabel;

                const equipos = group.map(eq => ({
                    intRank: eq.rank,
                    strTeam: eq.team?.name || "Equipo",
                    strBadge: eq.team?.logo || "",
                    intPoints: eq.points || 0,
                    intPlayed: eq.all?.played || 0,
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
                    strTeam: tituloSeccion,
                    strBadge: "",
                    intPoints: "-",
                    intPlayed: "-",
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

            // Filtrar por bloque de torneo vigente (ej. CLAUSURA) y quedarse sólo con ese bloque
            try {
                // Agrupar fixtures por 'bloque' basado en la parte textual del round (antes del número)
                const bloquePorRound = {};
                allFixtures.forEach(f => {
                    const rawRound = f.league?.round || f.fixture?.round || "";
                    const match = rawRound.match(/^[^\d\-–—]+/);
                    const blockKeyMatch = match ? match[0].trim() : rawRound;
                    const blockKey = (blockKeyMatch || "UNK").toUpperCase();
                    bloquePorRound[blockKey] = bloquePorRound[blockKey] || [];
                    bloquePorRound[blockKey].push(f);
                });

                // Elegir el bloque con la fecha más reciente (asumimos que ese es el torneo vigente)
                let chosenBlockKey = Object.keys(bloquePorRound)[0] || "UNK";
                let latestDate = 0;
                Object.entries(bloquePorRound).forEach(([key, fixtures]) => {
                    const maxDate = Math.max(...fixtures.map(x => new Date(x.fixture?.date || 0).getTime()));
                    if (maxDate > latestDate) {
                        latestDate = maxDate;
                        chosenBlockKey = key;
                    }
                });

                if (chosenBlockKey && Object.keys(bloquePorRound).length > 1) {
                    allFixtures = bloquePorRound[chosenBlockKey] || allFixtures;
                    console.debug('Argentina: chosen tournament block=', chosenBlockKey, 'fixtures in block=', allFixtures.length);
                } else {
                    // Si no se pudo agrupar bien, dejamos allFixtures tal como vino
                    console.debug('Argentina: tournament block grouping not applied, blocks found=', Object.keys(bloquePorRound));
                }
            } catch (e) {
                console.debug('Argentina: error grouping fixtures by block', e.message);
                // no bloquear ejecución si falla la agrupación
            }

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

    // Mostrar todas las jornadas (desde la fecha 1)
    const roundsFinales = rounds;

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
            dateEvent: item.fixture?.date ? obtenerFechaArgentina(item.fixture.date) : "",
            strTime: item.fixture?.date ? convertirHoraAArgentina(item.fixture.date) : "00:00",
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
