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
    'CL': { id: 2, logo: 'https://media.api-sports.io/football/leagues/2.png' },
    'EL': { id: 3, logo: 'https://media.api-sports.io/football/leagues/3.png' },
    'CONF': { id: 848, logo: 'https://media.api-sports.io/football/leagues/848.png' },
    'PN': { id: 129, logo: 'https://media.api-sports.io/football/leagues/129.png' },
    'LIB': { id: 13, logo: 'https://media.api-sports.io/football/leagues/13.png' },
    'SUD': { id: 11, logo: 'https://media.api-sports.io/football/leagues/11.png' },
    'COPA': { id: 130, logo: 'https://media.api-sports.io/football/leagues/130.png' }
};

/**
 * Convierte el minuto transcurrido al formato de fútbol argentino.
 * 1er tiempo: minuto real PT (máx 45 PT para tiempo extra)
 * 2do tiempo: (minuto - 45) ST (máx 45 ST para tiempo extra)
 */
function formatearMinutoFutbol(elapsed, statusShort) {
    if (!elapsed) return null;
    if (statusShort === '1H') {
        const min = Math.min(elapsed, 45);
        return `${min} PT`;
    }
    if (statusShort === '2H') {
        const min = Math.min(elapsed - 45, 45);
        return `${min > 0 ? min : elapsed} ST`;
    }
    if (statusShort === 'HT') return '45 PT';
    return `${elapsed}'`;
}

/**
 * Extrae los nombres de los goleadores de la lista de eventos de un fixture.
 * @param {Array} eventos - item.events de la API
 * @param {number} homeTeamId - ID del equipo local
 * @param {boolean} esLocal - true para goles del local, false para visitante
 */
function extraerGoleadores(eventos, homeTeamId, esLocal = true) {
    if (!Array.isArray(eventos) || !homeTeamId) return [];
    return eventos
        .filter(ev =>
            ev.type === 'Goal' &&
            ev.detail !== 'Missed Penalty' &&
            ((esLocal && ev.team?.id === homeTeamId) ||
             (!esLocal && ev.team?.id !== homeTeamId))
        )
        .map(ev => {
            const nombre = ev.player?.name || '';
            const minuto = ev.time?.elapsed ? `${ev.time.elapsed}'` : '';
            return minuto ? `${nombre} ${minuto}` : nombre;
        })
        .filter(Boolean);
}

async function obtenerPosicionesEuropa(codigoLiga, season = "2026") {
    const ligaConfig = LIGAS_MAP[codigoLiga] || LIGAS_MAP['PL'];
    const cacheKey = `pos_eu_${ligaConfig.id}_${season}`;
    if (cache.has(cacheKey)) return cache.get(cacheKey);

    try {
        const { data } = await api.get(`/standings?league=${ligaConfig.id}&season=${season}`);
        const standingsGroups = data.response?.[0]?.league?.standings || [];
        const table = [];

        standingsGroups.forEach(group => {
            if (!Array.isArray(group) || group.length === 0) return;

            const groupName = group[0]?.group;
            if (standingsGroups.length > 1 && groupName) {
                table.push({ isHeader: true, strTeam: groupName });
            }

            group.forEach(item => {
                table.push({
                    intRank: item.rank,
                    strTeam: item.team?.name || "Equipo",
                    strBadge: item.team?.logo || "",
                    intPoints: item.points || 0,
                    intPlayed: item.all?.played || 0,
                    intGoalsFor: item.all?.goals?.for || 0,
                    intGoalsAgainst: item.all?.goals?.against || 0,
                    intGoalDifference: item.goalsDiff || 0,
                    intWin: item.all?.win || 0,
                    intDraw: item.all?.draw || 0,
                    intLoss: item.all?.lose || 0
                });
            });
        });

        const resultado = { table, leagueLogo: ligaConfig.logo };
        cache.set(cacheKey, resultado, 3600);
        return resultado;
    } catch (error) {
        return { table: [], leagueLogo: ligaConfig.logo };
    }
}

async function obtenerPartidosEuropa(codigoLiga, roundParam = null, season = "2026", bypassCache = false, dateParam = null) {
    const ligaConfig = LIGAS_MAP[codigoLiga] || LIGAS_MAP['PL'];
    const cacheKey = `part_eu_all_${ligaConfig.id}_${season}`;
    
    let allFixtures = bypassCache ? null : cache.get(cacheKey);
    if (!allFixtures) {
        try {
            const { data } = await api.get(`/fixtures?league=${ligaConfig.id}&season=${season}`);
            allFixtures = data.response || [];

            // Debug: sample fixture info including fixture.date and status.elapsed when available
            try {
                console.debug('Europa: fixtures raw length=', Array.isArray(allFixtures) ? allFixtures.length : 'no-array');
                if (Array.isArray(allFixtures) && allFixtures.length > 0) {
                    const sample = allFixtures[0];
                    console.debug('Europa: sample fixture keys=', {
                        leagueRound: sample.league?.round,
                        fixtureRound: sample.fixture?.round,
                        status: sample.fixture?.status?.short,
                        elapsed: sample.fixture?.status?.elapsed,
                        fixtureDate: sample.fixture?.date
                    });
                }
            } catch (e) {
                console.debug('Europa: error mostrando sample fixture', e.message);
            }

            cache.set(cacheKey, allFixtures, 1800);
        } catch (error) {
            allFixtures = [];
        }
    }

    if (allFixtures.length === 0) return { rounds: [], currentRound: "", events: [] };

    // Extraer todas las jornadas únicas disponibles
    const roundsMap = {};
    allFixtures.forEach(f => {
        if (f.league?.round) roundsMap[f.league.round] = true;
    });
    const rounds = Object.keys(roundsMap);

    // Determinar la jornada actual por defecto (si hay en vivo, o la primera no jugada)
    let currentRound = roundParam;
    if (dateParam) {
        const partidosFecha = allFixtures.filter(f => f.fixture?.date && obtenerFechaArgentina(f.fixture.date) === dateParam);
        return { rounds, currentRound: dateParam, events: mapearEventos(partidosFecha, dateParam) };
    }
    if (!currentRound) {
        const enVivo = allFixtures.find(f => ["1H", "2H", "HT", "ET", "P"].includes(f.fixture?.status?.short));
        if (enVivo) {
            currentRound = enVivo.league.round;
        } else {
            const prox = allFixtures.find(f => f.fixture?.status?.short === "NS");
            currentRound = prox ? prox.league.round : rounds[0];
        }
    }

    const partidosJornada = allFixtures.filter(f => f.league?.round === currentRound);

    const events = mapearEventos(partidosJornada, currentRound);

    return {
        rounds,
        currentRound,
        events
    };
}

function mapearEventos(partidos, currentRound) {
    return partidos.map(item => {
        const statusShort = item.fixture?.status?.short;
        let statusMapped = "SCHEDULED";
        if (["1H", "2H", "HT", "ET", "P"].includes(statusShort)) statusMapped = "IN_PLAY";
        if (["FT", "AET", "PEN"].includes(statusShort)) statusMapped = "FINISHED";

        const elapsed = item.fixture?.status?.elapsed ?? null;
        const halfLabel = statusShort === '1H' ? 'PT' : (statusShort === '2H' ? 'ST' : null);
        const displayMinute = formatearMinutoFutbol(elapsed, statusShort);

        const homeTeamId = item.teams?.home?.id;
        const golesLocales = extraerGoleadores(item.events, homeTeamId);
        const golesVisitante = extraerGoleadores(item.events, homeTeamId, false);

        return {
            strRoundName: currentRound,
            dateEvent: item.fixture?.date ? obtenerFechaArgentina(item.fixture.date) : "",
            strTime: item.fixture?.date ? item.fixture.date.split("T")[1].substring(0, 5) : "00:00",
            fixtureUTC: item.fixture?.date || null,
            strHomeTeam: item.teams?.home?.name || "Local",
            strHomeTeamBadge: item.teams?.home?.logo || "",
            strAwayTeam: item.teams?.away?.name || "Visitante",
            strAwayTeamBadge: item.teams?.away?.logo || "",
            strStatus: statusMapped,
            statusShort: statusShort ?? null,
            statusLong: item.fixture?.status?.long || null,
            intHomeScore: item.goals?.home ?? null,
            intAwayScore: item.goals?.away ?? null,
            intElapsed: elapsed,
            elapsedLabel: halfLabel,
            displayMinute: displayMinute,
            golesLocales,
            golesVisitante
        };
    });
}

function obtenerFechaArgentina(fecha) {
    return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Argentina/Buenos_Aires',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).format(new Date(fecha));
}

module.exports = { obtenerPosicionesEuropa, obtenerPartidosEuropa };