const BASE_URL = "https://www.thesportsdb.com/api/v1/json/3";
// ID de la Liga Profesional Argentina en TheSportsDB
const ARGENTINA_LEAGUE_ID = "4356"; 

/**
 * Consulta la lista de partidos / eventos de la Liga Argentina.
 */
async function obtenerPartidos(season = "2026") {
    try {
        // Consultamos eventos pasados y próximos de la liga
        const res = await fetch(`${BASE_URL}/eventsseason.php?id=${ARGENTINA_LEAGUE_ID}&s=${season}`);
        
        if (!res.ok) {
            throw new Error(`TheSportsDB respondió con estado ${res.status}`);
        }

        const data = await res.json();

        // Estructura adaptada que espera app.js
        return {
            events: data.events || []
        };
    } catch (error) {
        console.error("Error en argentinaService.obtenerPartidos:", error.message);
        return { events: [] };
    }
}

/**
 * Consulta la tabla de posiciones de la Liga Argentina.
 */
async function obtenerPosiciones(season = "2026") {
    try {
        const res = await fetch(`${BASE_URL}/lookuptable.php?l=${ARGENTINA_LEAGUE_ID}&s=${season}`);

        if (!res.ok) {
            throw new Error(`TheSportsDB respondió con estado ${res.status}`);
        }

        const data = await res.json();

        return {
            table: data.table || []
        };
    } catch (error) {
        console.error("Error en argentinaService.obtenerPosiciones:", error.message);
        return { table: [] };
    }
}

module.exports = {
    obtenerPartidos,
    obtenerPosiciones
};