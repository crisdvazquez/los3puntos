const axios = require("axios");
const NodeCache = require("node-cache");

const API_KEY = process.env.API_FOOTBALL_KEY;
const cache = new NodeCache();

function formatearMinutoFutbol(elapsed, statusShort) {
    if (!elapsed) return null;
    if (statusShort === 'HT') return 'ET';
    return `${elapsed}'`;
}

const api = axios.create({
    baseURL: "https://v3.football.api-sports.io",
    headers: { "x-apisports-key": API_KEY }
});

async function obtenerEventosFixture(fixtureId, bypassCache = false) {
    if (!fixtureId) return [];
    const cacheKey = `events_${fixtureId}`;
    if (!bypassCache && cache.has(cacheKey)) return cache.get(cacheKey);

    try {
        const { data } = await api.get(`/fixtures/events?fixture=${fixtureId}`);
        const events = Array.isArray(data.response) ? data.response : [];
        cache.set(cacheKey, events, 300);
        return events;
    } catch (error) {
        return [];
    }
}

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
    'COPA': { id: 130, logo: 'https://media.api-sports.io/football/leagues/130.png' },
    'PBM': { id: 131, logo: 'https://media.api-sports.io/football/leagues/131.png' },
    'PCM': { id: 132, logo: 'https://media.api-sports.io/football/leagues/132.png' },
    'FAA': { id: 133, logo: 'https://media.api-sports.io/football/leagues/133.png' },
    'URU': { id: 268, logo: 'https://media.api-sports.io/football/leagues/268.png' },
    'PAR': { id: 250, logo: 'https://media.api-sports.io/football/leagues/250.png' },
    'COL': { id: 239, logo: 'https://media.api-sports.io/football/leagues/239.png' },
    'MEX': { id: 262, logo: 'https://media.api-sports.io/football/leagues/262.png' },
    'CHI': { id: 265, logo: 'https://media.api-sports.io/football/leagues/265.png' },
    'MLS': { id: 253, logo: 'https://media.api-sports.io/football/leagues/253.png' },
    'BRA': { id: 71, logo: 'https://media.api-sports.io/football/leagues/71.png' },
    'POR': { id: 94, logo: 'https://media.api-sports.io/football/leagues/94.png' }
};

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
                // Normalize group name: "Group 1" → "GRUPO A", "Group 2" → "GRUPO B", etc.
                const numMatch = groupName.match(/\d+/);
                const normalizedName = numMatch
                    ? `GRUPO ${String.fromCharCode(64 + parseInt(numMatch[0], 10))}`
                    : groupName.toUpperCase();
                table.push({ isHeader: true, strTeam: normalizedName });
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
        cache.set(cacheKey, resultado, 14400);
        return resultado;
    } catch (error) {
        return { table: [], leagueLogo: ligaConfig.logo };
    }
}

async function obtenerPartidosEuropa(codigoLiga, roundParam = null, season = "2026", bypassCache = false, dateParam = null) {
    const ligaConfig = LIGAS_MAP[codigoLiga] || LIGAS_MAP['PL'];
    const cacheKey = `part_eu_all_${ligaConfig.id}_${season}`;
    const posicionesKey = `pos_eu_${ligaConfig.id}_${season}`;

    // On a live bypass, check if the cached fixtures have any newly-finished matches.
    // If so, also invalidate the standings cache so the table refreshes.
    if (bypassCache) {
        const cached = cache.get(cacheKey);
        if (cached) {
            const hadFinished = cached.some(f => ["FT", "AET", "PEN"].includes(f.fixture?.status?.short));
            if (hadFinished) {
                cache.del(posicionesKey);
            }
        }
    }

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

            cache.set(cacheKey, allFixtures, 14400);
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
    if (!currentRound) {
        const enVivo = allFixtures.find(f => ["1H", "2H", "HT", "ET", "P"].includes(f.fixture?.status?.short));
        if (enVivo) {
            currentRound = enVivo.league.round;
        } else {
            const prox = allFixtures.find(f => f.fixture?.status?.short === "NS");
            currentRound = prox ? prox.league.round : rounds[0];
        }
    }

    const partidosJornada = dateParam
        ? allFixtures.filter(f => f.fixture?.date && new Intl.DateTimeFormat('en-CA', {
            timeZone: 'America/Argentina/Buenos_Aires'
        }).format(new Date(f.fixture.date)) === dateParam)
        : allFixtures.filter(f => f.league?.round === currentRound);

    const events = await Promise.all(partidosJornada.map(async item => {
        const statusShort = item.fixture?.status?.short;
        let statusMapped = "SCHEDULED";
        if (["1H", "2H", "HT", "ET", "P"].includes(statusShort)) statusMapped = "IN_PLAY";
        if (["FT", "AET", "PEN"].includes(statusShort)) statusMapped = "FINISHED";

        const elapsed = item.fixture?.status?.elapsed ?? null;
        const halfLabel = null;
        let displayMinute = null;
        if (statusShort === 'HT') {
            displayMinute = 'ET';
        } else if (elapsed !== null) {
            displayMinute = formatearMinutoFutbol(elapsed, statusShort);
        }

        // Normalizar goleadores desde item.events
        const rawEvents = Array.isArray(item.events)
            ? item.events
            : ['NS', 'TBD'].includes(statusShort)
                ? []
                : await obtenerEventosFixture(item.fixture?.id, bypassCache);
        const scorers = rawEvents
            .filter(ev => ev.type === 'Goal' && ev.detail !== 'Missed Penalty')
            .map(ev => ({
                team: ev.team?.name || null,
                player: ev.player?.name || null,
                minute: ev.time?.elapsed ?? null,
                extra: ev.time?.extra ?? null,
                detail: ev.detail || null
            }));

        return {
            strRoundName: currentRound,
            dateEvent: item.fixture?.date ? new Intl.DateTimeFormat('en-CA', {
                timeZone: 'America/Argentina/Buenos_Aires'
            }).format(new Date(item.fixture.date)) : "",
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
            scorers: scorers.length > 0 ? scorers : null
        };
    }));

    return {
        rounds,
        currentRound,
        events
    };
}

module.exports = { obtenerPosicionesEuropa, obtenerPartidosEuropa };