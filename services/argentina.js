const axios = require("axios");
const NodeCache = require("node-cache");

// Configuración de API-Football (Liga Profesional Argentina es ID: 128)
const API_KEY = process.env.API_FOOTBALL_KEY || "TU_API_KEY_AQUI";
const LEAGUE_ID = 128; 

const cache = new NodeCache();

const api = axios.create({
    baseURL: "https://v3.football.api-sports.io",
    headers: {
        "x-apisports-key": API_KEY
    }
});

/**
 * Obtiene las posiciones formateadas con separador visual entre Zonas A y B
 */
async function obtenerPosiciones(season = "2026") {
    const cacheKey = `posiciones_${LEAGUE_ID}_${season}`;
    const cachedData = cache.get(cacheKey);
    
    if (cachedData) {
        return cachedData;
    }

    try {
        const { data } = await api.get(`/standings?league=${LEAGUE_ID}&season=${season}`);
        const standingsRounds = data.response?.[0]?.league?.standings || [];

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
                intPlayed: item.all?.played || 0,
                intGoalDifference: item.goalsDiff || 0,
                intPoints: item.points || 0
            }));

            // Encabezado separador para la UI
            tablaPlana.push({
                intRank: "---",
                isHeader: true,
                strTeam: `=== ${groupName.toUpperCase()} ===`,
                strBadge: "",
                intPlayed: "-",
                intGoalDifference: "-",
                intPoints: "-"
            });

            tablaPlana.push(...equipos);
            gruposSeparados[groupName] = equipos;
        });

        const resultado = {
            table: tablaPlana,
            standings: tablaPlana,
            groups: gruposSeparados
        };

        // Guardar en caché por 1 hora (3600 segundos)
        cache.set(cacheKey, resultado, 3600);
        return resultado;

    } catch (error) {
        console.error("Error en API-Football obtenerPosiciones:", error.response?.data || error.message);
        return { table: [], standings: [], groups: {} };
    }
}

/**
 * Obtiene el fixture/partidos de la fecha activa con Caché Dinámico para partidos en vivo
 */
async function obtenerPartidos(params = {}) {
    const season = params.season || "2026";
    const cacheKey = `partidos_${LEAGUE_ID}_${season}`;
    const cachedData = cache.get(cacheKey);

    if (cachedData) {
        return cachedData;
    }

    try {
        // Pedimos los fixtures de la temporada
        const { data } = await api.get(`/fixtures?league=${LEAGUE_ID}&season=${season}`);
        const fixtures = data.response || [];

        if (fixtures.length === 0) {
            return { currentWeek: "1", labelJornada: "Fecha 1", events: [] };
        }

        // Buscar la fecha/jornada actual o filtrar
        const enVivo = fixtures.filter(f => ["1H", "2H", "HT", "ET", "P"].includes(f.fixture?.status?.short));
        
        let roundActual = fixtures[0]?.league?.round || "Regular Season - 1";
        if (enVivo.length > 0) {
            roundActual = enVivo[0].league?.round;
        } else {
            const proximos = fixtures.find(f => f.fixture?.status?.short === "NS");
            if (proximos) roundActual = proximos.league?.round;
        }

        // Obtener el número de fecha (Ej: "Regular Season - 5" -> "5")
        const numeroFecha = roundActual.match(/\d+/) ? roundActual.match(/\d+/)[0] : "1";
        const labelFecha = `Fecha ${numeroFecha}`;

        // Filtrar partidos de esa jornada
        const partidosJornada = fixtures.filter(f => f.league?.round === roundActual);

        const eventos = partidosJornada.map(item => {
            const statusShort = item.fixture?.status?.short;
            let statusMapped = "SCHEDULED";
            if (["1H", "2H", "HT", "ET", "P"].includes(statusShort)) statusMapped = "IN_PLAY";
            if (["FT", "AET", "PEN"].includes(statusShort)) statusMapped = "FINISHED";

            return {
                intRound: String(numeroFecha),
                strRoundName: labelFecha,
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

        const resultado = {
            currentWeek: String(numeroFecha),
            labelJornada: labelFecha,
            events: eventos
        };

        // CACHÉ DINÁMICO: Si hay partido en vivo refresca en 2 min (120s), sino en 30 min (1800s)
        const hayPartidoEnVivo = eventos.some(e => e.strStatus === "IN_PLAY");
        const ttl = hayPartidoEnVivo ? 120 : 1800;

        cache.set(cacheKey, resultado, ttl);
        return resultado;

    } catch (error) {
        console.error("Error en API-Football obtenerPartidos:", error.response?.data || error.message);
        return { currentWeek: "1", labelJornada: "Fecha 1", events: [] };
    }
}

module.exports = {
    obtenerPartidos,
    obtenerPosiciones
};