// src/services/leagues/StandardLeagueAdapter.js
const axios = require("axios");
const LeagueAdapter = require("./LeagueAdapter");
const cache = require("../cache.service");

const API_KEY = process.env.API_FOOTBALL_KEY;

const api = axios.create({
    baseURL: "https://v3.football.api-sports.io",
    headers: { "x-apisports-key": API_KEY }
});

const ESTADOS_EN_VIVO = ["1H", "2H", "HT", "ET", "P"];

function formatearMinutoFutbol(elapsed, statusShort, extra = null) {
    if (!elapsed) return null;
    if (statusShort === 'HT') return 'ET';
    if (extra) return `${elapsed}+${extra}'`;
    return `${elapsed}'`;
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

class StandardLeagueAdapter extends LeagueAdapter {
    constructor(leagueCode) {
        super();
        this.leagueCode = leagueCode;
        this.ligaConfig = LIGAS_MAP[leagueCode] || LIGAS_MAP['PL'];
    }

    async _obtenerEventosFixture(fixtureId, bypassCache = false) {
        if (!fixtureId) return [];
        const cacheKey = `events_${fixtureId}`;
        const cachedEvents = cache.get(cacheKey);
        if (!bypassCache && cachedEvents) return cachedEvents;

        try {
            const { data } = await api.get(`/fixtures/events?fixture=${fixtureId}`);
            const events = Array.isArray(data.response) ? data.response : [];
            if (events.length > 0 || !cachedEvents) cache.set(cacheKey, events, cache.TTL.EVENTS);
            return events;
        } catch (error) {
            return cachedEvents || [];
        }
    }

    async getStandings(season = "2026") {
        const cacheKey = `pos_eu_${this.ligaConfig.id}_${season}`;
        if (cache.has(cacheKey)) return cache.get(cacheKey);

        try {
            const { data } = await api.get(`/standings?league=${this.ligaConfig.id}&season=${season}`);
            const standingsGroups = data.response?.[0]?.league?.standings || [];
            const table = [];

            standingsGroups.forEach(group => {
                if (!Array.isArray(group) || group.length === 0) return;

                const groupName = group[0]?.group;
                if (standingsGroups.length > 1 && groupName) {
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

            const resultado = { table, leagueLogo: this.ligaConfig.logo };
            cache.set(cacheKey, resultado, cache.TTL.STANDINGS);
            return resultado;
        } catch (error) {
            return { table: [], leagueLogo: this.ligaConfig.logo };
        }
    }

    async getFixtures({ round = null, season = "2026", bypassCache = false, date = null } = {}) {
        const cacheKey = `part_eu_all_${this.ligaConfig.id}_${season}`;
        const posicionesKey = `pos_eu_${this.ligaConfig.id}_${season}`;

        if (bypassCache) {
            const cached = cache.get(cacheKey);
            if (cached) {
                const hadFinished = cached.some(f => ["FT", "AET", "PEN"].includes(f.fixture?.status?.short));
                if (hadFinished) {
                    cache.del(posicionesKey);
                }
            }
        }

        const cachedFixtures = cache.get(cacheKey);
        let allFixtures = cachedFixtures;
        if (bypassCache || !allFixtures) {
            try {
                const { data } = await api.get(`/fixtures?league=${this.ligaConfig.id}&season=${season}`);
                const freshFixtures = data.response || [];
                if (freshFixtures.length > 0) {
                    allFixtures = freshFixtures;
                    cache.set(cacheKey, allFixtures, cache.TTL.FIXTURES);
                }
            } catch (error) {
                allFixtures = cachedFixtures || [];
            }
        }

        if (!allFixtures || allFixtures.length === 0) return { rounds: [], currentRound: "", events: [] };

        const roundsMap = {};
        allFixtures.forEach(f => {
            if (f.league?.round) roundsMap[f.league.round] = true;
        });
        const rounds = Object.keys(roundsMap);

        let currentRound = round;
        if (!currentRound) {
            const enVivo = allFixtures.find(f => ESTADOS_EN_VIVO.includes(f.fixture?.status?.short));
            if (enVivo) {
                currentRound = enVivo.league.round;
            } else {
                const prox = allFixtures.find(f => f.fixture?.status?.short === "NS");
                currentRound = prox ? prox.league.round : rounds[0];
            }
        }

        const partidosJornada = date
            ? allFixtures.filter(f => f.fixture?.date && new Intl.DateTimeFormat('en-CA', {
                timeZone: 'America/Argentina/Buenos_Aires'
            }).format(new Date(f.fixture.date)) === date)
            : allFixtures.filter(f => f.league?.round === currentRound);

        const events = await Promise.all(
            partidosJornada.map(item => this.normalizeMatch(item, currentRound, bypassCache))
        );

        return { rounds, currentRound, events };
    }

    async normalizeMatch(item, currentRound = null, bypassCache = false) {
        const statusShort = item.fixture?.status?.short;
        let statusMapped = "SCHEDULED";
        if (ESTADOS_EN_VIVO.includes(statusShort)) statusMapped = "IN_PLAY";
        if (["FT", "AET", "PEN"].includes(statusShort)) statusMapped = "FINISHED";

        const elapsed = item.fixture?.status?.elapsed ?? null;
        const extra = item.fixture?.status?.extra ?? null;
        let displayMinute = null;
        if (statusShort === 'HT') {
            displayMinute = 'ET';
        } else if (elapsed !== null) {
            displayMinute = formatearMinutoFutbol(elapsed, statusShort, extra);
        }

        const rawEvents = Array.isArray(item.events)
            ? item.events
            : ['NS', 'TBD'].includes(statusShort)
                ? []
                : await this._obtenerEventosFixture(item.fixture?.id, bypassCache);
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
            fixtureId: item.fixture?.id ?? null,
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
            intExtra: extra,
            elapsedLabel: null,
            displayMinute: displayMinute,
            scorers: scorers.length > 0 ? scorers : null
        };
    }
}

module.exports = { StandardLeagueAdapter, LIGAS_MAP };