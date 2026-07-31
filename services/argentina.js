const BASE_URL = "https://www.thesportsdb.com/api/v1/json/3";

// ID oficial de la Liga Profesional Argentina en TheSportsDB: 4356
const ARGENTINA_LEAGUE_ID = "4356";

/**
 * Obtiene los partidos de la Liga Argentina
 */
async function obtenerPartidos(season) {
    try {
        // Intentamos pedir los próximos partidos o el fixture de la liga específica
        let res = await fetch(`${BASE_URL}/eventsnextleague.php?id=${ARGENTINA_LEAGUE_ID}`);
        let data = await res.json();

        let eventos = data.events || [];

        // Si no hay partidos próximos directos, buscamos por los últimos eventos jugados
        if (eventos.length === 0) {
            res = await fetch(`${BASE_URL}/eventspastleague.php?id=${ARGENTINA_LEAGUE_ID}`);
            data = await res.json();
            eventos = data.events || [];
        }

        // Filtramos para asegurarnos de que el deporte sea fútbol y corresponda a Argentina
        const eventosFiltrados = eventos.filter(ev => 
            ev.strSport === "Soccer" && 
            (ev.strLeague?.includes("Argentine") || ev.strLeague?.includes("Primera") || ev.idLeague === ARGENTINA_LEAGUE_ID)
        );

        return { events: eventosFiltrados.length > 0 ? eventosFiltrados : eventos };
    } catch (error) {
        console.error("Error en argentinaService.obtenerPartidos:", error.message);
        return { events: [] };
    }
}

/**
 * Obtiene o simula la tabla de posiciones de la Liga Argentina
 */
async function obtenerPosiciones(season) {
    try {
        // Intentamos consultar la tabla oficial
        const res = await fetch(`${BASE_URL}/lookuptable.php?l=${ARGENTINA_LEAGUE_ID}&s=2024`);
        const data = await res.json();

        if (data.table && data.table.length > 0) {
            return { table: data.table };
        }

        // Si TheSportsDB no devuelve la tabla, consultamos la lista de equipos de la liga para armar la vista
        const resEquipos = await fetch(`${BASE_URL}/lookup_all_teams.php?id=${ARGENTINA_LEAGUE_ID}`);
        const dataEquipos = await resEquipos.json();

        if (dataEquipos.teams && dataEquipos.teams.length > 0) {
            // Generamos la lista de equipos mapeada al formato de la tabla
            const tablaEquipos = dataEquipos.teams.map((team, index) => ({
                intRank: index + 1,
                strTeam: team.strTeam,
                strBadge: team.strBadge || "",
                intPlayed: 0,
                intGoalDifference: 0,
                intPoints: 0
            }));

            return { table: tablaEquipos };
        }

        return { table: [] };
    } catch (error) {
        console.error("Error en argentinaService.obtenerPosiciones:", error.message);
        return { table: [] };
    }
}

module.exports = {
    obtenerPartidos,
    obtenerPosiciones
};