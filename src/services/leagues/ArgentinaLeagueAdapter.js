// src/services/leagues/ArgentinaLeagueAdapter.js
const axios = require("axios");
const LeagueAdapter = require("./LeagueAdapter");
const cache = require("../cache.service");
const { obtenerFechaArgentina, convertirHoraAArgentina } = require("../../utils/dateFormat");

const API_KEY = process.env.API_FOOTBALL_KEY;
const LEAGUE_ID = 128;
const LEAGUE_LOGO = "https://media.api-sports.io/football/leagues/128.png";

const api = axios.create({
    baseURL: "https://v3.football.api-sports.io",
    headers: { "x-apisports-key": API_KEY }
});

function formatearMinutoFutbol(elapsed, statusShort, extra = null) {
    if (!elapsed) return null;
    if (statusShort === 'HT') return 'ET';
    if (extra) return `${elapsed}+${extra}'`;
    return `${elapsed}'`;
}

class ArgentinaLeagueAdapter extends LeagueAdapter {
    constructor(season = "2026") {
        super();
        this.season = season;
    }

    async _obtenerEventosFixture(fixtureId, bypassCache = false) {
        if (!fixtureId) return [];
        const cacheKey = `events_arg_${fixtureId}`;
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

    async getStandings() {
        const cacheKey = `posiciones_arg_seguro_v9_${this.season}`;
        const cachedData = cache.get(cacheKey);
        if (cachedData) return cachedData;

        try {
            const { data } = await api.get(`/standings?league=${LEAGUE_ID}&season=${this.season}`);
            const responseList = data.response || [];
            if (responseList.length === 0) {
                return { table: [], standings: [], groups: {}, leagueLogo: LEAGUE_LOGO };
            }

            const tablaPlana = [];
            const gruposSeparados = {};

            let listaBloques = [...responseList];
            if (listaBloques.length >= 2) listaBloques.reverse();

            const bloquesClausura = listaBloques.filter(b =>
                (b.league?.name || "").toLowerCase().includes("clausura")
            );
            if (bloquesClausura.length > 0) {
                listaBloques = bloquesClausura;
            } else if (listaBloques.length > 1) {
                listaBloques = listaBloques.slice(0, 1);
            }

            listaBloques = listaBloques.map(bloqueObj => {
                const standings = bloqueObj.league?.standings || [];
                const filtrados = standings.filter(group => {
                    if (!Array.isArray(group) || group.length === 0) return false;
                    return !(group[0]?.group || "").toLowerCase().includes("apertura");
                });
                if (filtrados.length < standings.length) {
                    return { ...bloqueObj, league: { ...bloqueObj.league, standings: filtrados } };
                }
                return bloqueObj;
            });

            const bloquesApertura = listaBloques.filter(b =>
                (b.league?.name || "").toLowerCase().includes("apertura")
            );
            if (bloquesApertura.length > 0 && bloquesApertura.length < listaBloques.length) {
                listaBloques = listaBloques.filter(b =>
                    !(b.league?.name || "").toLowerCase().includes("apertura")
                );
            }

            listaBloques.forEach((leagueObj) => {
                const standingsRounds = leagueObj.league?.standings || [];

                standingsRounds.forEach((group, idx) => {
                    if (!Array.isArray(group) || group.length === 0) return;

                    const rawGroupName = group[0]?.group || `Zona ${idx === 0 ? 'A' : 'B'}`;
                    const zoneMatch = rawGroupName.match(/\b([A-Z])\s*$/i) || rawGroupName.match(/zona\s+([A-Z])/i);
                    const zoneLetter = zoneMatch ? zoneMatch[1].toUpperCase() : String.fromCharCode(65 + idx);
                    const tituloSeccion = `GRUPO ${zoneLetter}`;

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
                        intRank: "---", isHeader: true, strTeam: tituloSeccion, strBadge: "",
                        intPoints: "-", intPlayed: "-", intGoalsFor: "-", intGoalsAgainst: "-",
                        intGoalDifference: "-", intWin: "-", intDraw: "-", intLoss: "-"
                    });
                    tablaPlana.push(...equipos);
                    gruposSeparados[tituloSeccion] = equipos;
                });
            });

            const resultado = { table: tablaPlana, standings: tablaPlana, groups: gruposSeparados, leagueLogo: LEAGUE_LOGO };
            cache.set(cacheKey, resultado, cache.TTL.STANDINGS);
            return resultado;
        } catch (error) {
            return { table: [], standings: [], groups: {}, leagueLogo: LEAGUE_LOGO };
        }
    }

    async getFixtures({ round = null, date = null, bypassCache = false } = {}) {
        const cacheKey = `partidos_arg_seguro_v7_${LEAGUE_ID}_${this.season}`;
        const posicionesKey = `posiciones_arg_seguro_v9_${this.season}`;

        if (bypassCache) {
            const cached = cache.get(cacheKey);
            if (cached) {
                const hadFinished = cached.some(f => ["FT", "AET", "PEN"].includes(f.fixture?.status?.short));
                if (hadFinished) cache.del(posicionesKey);
            }
        }

        const cachedFixtures = cache.get(cacheKey);
        let allFixtures = cachedFixtures;
        if (bypassCache || !allFixtures) {
            try {
                const { data } = await api.get(`/fixtures?league=${LEAGUE_ID}&season=${this.season}`);
                const freshFixtures = data.response || [];
                if (freshFixtures.length > 0) {
                    allFixtures = freshFixtures;
                    cache.set(cacheKey, allFixtures, cache.TTL.FIXTURES);
                }

                const bloquePorRound = {};
                allFixtures.forEach(f => {
                    const rawRound = f.league?.round || f.fixture?.round || "";
                    const match = rawRound.match(/^[^\d\-–—]+/);
                    const blockKey = (match ? match[0].trim() : rawRound || "UNK").toUpperCase();
                    bloquePorRound[blockKey] = bloquePorRound[blockKey] || [];
                    bloquePorRound[blockKey].push(f);
                });

                let chosenBlockKey = Object.keys(bloquePorRound)[0] || "UNK";
                let latestDate = 0;
                Object.entries(bloquePorRound).forEach(([key, fixtures]) => {
                    const maxDate = Math.max(...fixtures.map(x => new Date(x.fixture?.date || 0).getTime()));
                    if (maxDate > latestDate) { latestDate = maxDate; chosenBlockKey = key; }
                });

                if (chosenBlockKey && Object.keys(bloquePorRound).length > 1) {
                    allFixtures = bloquePorRound[chosenBlockKey] || allFixtures;
                }
            } catch (error) {
                allFixtures = cachedFixtures || [];
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

        const rounds = Object.keys(roundsMap).sort((a, b) => {
            const numA = parseInt((a.match(/\d+/) || [NaN])[0], 10);
            const numB = parseInt((b.match(/\d+/) || [NaN])[0], 10);
            if (isNaN(numA) || isNaN(numB)) return a.localeCompare(b);
            return numA - numB;
        });

        let currentRound = round;
        if (!currentRound || !rounds.includes(currentRound)) {
            const enVivo = allFixtures.find(f => ["1H", "2H", "HT", "ET", "P"].includes(f.fixture?.status?.short));
            if (enVivo && rounds.includes(enVivo.league?.round || enVivo.fixture?.round)) {
                currentRound = enVivo.league?.round || enVivo.fixture?.round;
            } else {
                const prox = allFixtures.find(f => f.fixture?.status?.short === "NS" && rounds.includes(f.league?.round || f.fixture?.round));
                currentRound = prox ? (prox.league?.round || prox.fixture?.round) : rounds[0];
            }
        }

        const partidosJornada = date
            ? allFixtures.filter(f => obtenerFechaArgentina(f.fixture?.date) === date)
            : allFixtures.filter(f => (f.league?.round || f.fixture?.round) === currentRound);

        const events = await Promise.all(
            partidosJornada.map(item => this.normalizeMatch(item, currentRound, bypassCache))
        );

        return { rounds, currentRound, events };
    }

    async normalizeMatch(item, currentRound = null, bypassCache = false) {
        const statusShort = item.fixture?.status?.short;
        let statusMapped = "SCHEDULED";
        if (["1H", "2H", "HT", "ET", "P"].includes(statusShort)) statusMapped = "IN_PLAY";
        if (["FT", "AET", "PEN"].includes(statusShort)) statusMapped = "FINISHED";
        if (["SUSP", "ABD", "CANC", "AWD", "WO"].includes(statusShort)) statusMapped = "CANCELLED";

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
            dateEvent: item.fixture?.date ? obtenerFechaArgentina(item.fixture.date) : "",
            strTime: item.fixture?.date ? convertirHoraAArgentina(item.fixture.date) : "00:00",
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

module.exports = ArgentinaLeagueAdapter;