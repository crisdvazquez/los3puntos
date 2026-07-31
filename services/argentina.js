const BASE_URL = "https://www.thesportsdb.com/api/v1/json/3";
const ARGENTINA_LEAGUE_ID = "4356";

async function obtenerPartidos(season) {
    try {
        const s = season || "2025-2026";
        const res = await fetch(`${BASE_URL}/eventsseason.php?id=${ARGENTINA_LEAGUE_ID}&s=${s}`);

        if (!res.ok) throw new Error(`Status ${res.status}`);
        const data = await res.json();

        if (!data.events || data.events.length === 0) {
            const resNext = await fetch(`${BASE_URL}/eventsnextleague.php?id=${ARGENTINA_LEAGUE_ID}`);
            const dataNext = await resNext.json();
            return { events: dataNext.events || [] };
        }

        return { events: data.events || [] };
    } catch (error) {
        console.error("Error en argentinaService.obtenerPartidos:", error.message);
        return { events: [] };
    }
}

async function obtenerPosiciones(season) {
    try {
        const s = season || "2025-2026";
        const res = await fetch(`${BASE_URL}/lookuptable.php?l=${ARGENTINA_LEAGUE_ID}&s=${s}`);

        if (!res.ok) throw new Error(`Status ${res.status}`);
        const data = await res.json();

        return { table: data.table || [] };
    } catch (error) {
        console.error("Error en argentinaService.obtenerPosiciones:", error.message);
        return { table: [] };
    }
}

module.exports = {
    obtenerPartidos,
    obtenerPosiciones
};