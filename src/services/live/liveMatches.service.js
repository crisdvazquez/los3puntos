// src/services/live/liveMatches.service.js
const axios = require("axios");
const cache = require("../cache.service");

const API_KEY = process.env.API_FOOTBALL_KEY;

const api = axios.create({
    baseURL: "https://v3.football.api-sports.io",
    headers: { "x-apisports-key": API_KEY }
});

const ESTADOS_EN_VIVO = ["1H", "2H", "HT", "ET", "P"];
const CACHE_KEY = "live_matches_global";

function formatearMinutoFutbol(elapsed, statusShort, extra = null) {
    if (!elapsed) return null;
    if (statusShort === 'HT') return 'ET';
    if (extra) return `${elapsed}+${extra}'`;
    return `${elapsed}'`;
}

async function obtenerPartidosEnVivo(bypassCache = false) {
    if (!bypassCache && cache.has(CACHE_KEY)) {
        return cache.get(CACHE_KEY);
    }

    try {
        const { data } = await api.get('/fixtures?live=all');
        const partidos = (Array.isArray(data.response) ? data.response : [])
            .filter(item => ESTADOS_EN_VIVO.includes(item.fixture?.status?.short))
            .map(item => ({
                fixtureId: item.fixture?.id ?? null,
                fixture: item.fixture,
                league: item.league,
                teams: item.teams,
                goals: item.goals,
                dateEvent: item.fixture?.date
                    ? new Intl.DateTimeFormat('en-CA', {
                        timeZone: 'America/Argentina/Buenos_Aires'
                    }).format(new Date(item.fixture.date))
                    : "",
                strTime: item.fixture?.date ? item.fixture.date.split("T")[1].substring(0, 5) : "00:00",
                strHomeTeam: item.teams?.home?.name || "Local",
                strHomeTeamBadge: item.teams?.home?.logo || "",
                strAwayTeam: item.teams?.away?.name || "Visitante",
                strAwayTeamBadge: item.teams?.away?.logo || "",
                strStatus: "IN_PLAY",
                statusShort: item.fixture?.status?.short ?? null,
                intHomeScore: item.goals?.home ?? null,
                intAwayScore: item.goals?.away ?? null,
                intElapsed: item.fixture?.status?.elapsed ?? null,
                intExtra: item.fixture?.status?.extra ?? null,
                displayMinute: formatearMinutoFutbol(
                    item.fixture?.status?.elapsed,
                    item.fixture?.status?.short,
                    item.fixture?.status?.extra
                ),
                scorers: null
            }));

        cache.set(CACHE_KEY, partidos, cache.TTL.LIVE);
        return partidos;
    } catch (error) {
        return cache.get(CACHE_KEY) || [];
    }
}

module.exports = { obtenerPartidosEnVivo };