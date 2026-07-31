const axios = require('axios');
const cheerio = require('cheerio');

const BASE_URL_PROMIEDOS = 'https://www.promiedos.com.ar';

/**
 * Petición HTTP con User-Agent de navegador real para evitar bloqueos
 */
async function fetchHTML(url) {
    const { data } = await axios.get(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
    });
    return cheerio.load(data);
}

/**
 * Extrae los partidos y fixtures de la Liga Argentina / Copa de la Liga
 */
async function obtenerPartidos() {
    try {
        const $ = await fetchHTML(`${BASE_URL_PROMIEDOS}/primerad`);
        const eventos = [];

        // Promiedos organiza las fechas en tablas con id o clases de fixture
        $('.fixturein, .fixtab, table.puntos').find('tr').each((i, el) => {
            const local = $(el).find('.game-t1, .t1, td:nth-child(2)').text().trim();
            const visitante = $(el).find('.game-t2, .t2, td:nth-child(4)').text().trim();
            const estadoTexto = $(el).find('.game-r, .r, td:nth-child(3)').text().trim();
            const escudoLocal = $(el).find('.game-t1 img, .t1 img').attr('src');
            const escudoVisitante = $(el).find('.game-t2 img, .t2 img').attr('src');

            if (local && visitante) {
                // Detectamos si está en juego (ej: '35'', 'PT', 'ST') o si ya finalizó
                const enVivo = estadoTexto.includes("'") || estadoTexto.includes("PT") || estadoTexto.includes("ST");
                const finalizado = estadoTexto.includes("-") && !enVivo;

                eventos.push({
                    intRound: "1",
                    dateEvent: new Date().toISOString().split('T')[0],
                    strTime: estadoTexto,
                    strHomeTeam: local,
                    strHomeTeamBadge: escudoLocal ? `${BASE_URL_PROMIEDOS}/${escudoLocal.replace(/^\//, '')}` : "",
                    strAwayTeam: visitante,
                    strAwayTeamBadge: escudoVisitante ? `${BASE_URL_PROMIEDOS}/${escudoVisitante.replace(/^\//, '')}` : "",
                    strStatus: enVivo ? "IN_PLAY" : (finalizado ? "FINISHED" : "SCHEDULED"),
                    intHomeScore: finalizado || enVivo ? estadoTexto.split('-')[0]?.trim() : null,
                    intAwayScore: finalizado || enVivo ? estadoTexto.split('-')[1]?.trim() : null
                });
            }
        });

        return { events: eventos };
    } catch (error) {
        console.error("Error en scraper de partidos Argentina:", error.message);
        return { events: [] };
    }
}

/**
 * Extrae la tabla de posiciones de la Liga Argentina (Zonas o General)
 */
async function obtenerPosiciones() {
    try {
        const $ = await fetchHTML(`${BASE_URL_PROMIEDOS}/primerad`);
        const tablaConsolidada = [];

        $('table.posiciones, table.puntos').each((indexTabla, tablaEl) => {
            let ranking = 1;

            $(tablaEl).find('tr').each((i, el) => {
                const columnas = $(el).find('td');
                if (columnas.length < 5) return; // Saltea encabezados

                const equipoNombre = $(el).find('.t1, .team-name, td:nth-child(2)').text().trim();
                const escudoRelativo = $(el).find('img').attr('src');
                const pj = parseInt($(columnas[2]).text().trim()) || 0;
                const dif = parseInt($(columnas[7]).text().trim()) || 0;
                const pts = parseInt($(columnas[1]).text().trim()) || 0;

                if (equipoNombre) {
                    tablaConsolidada.push({
                        intRank: ranking++,
                        strTeam: equipoNombre,
                        strBadge: escudoRelativo ? `${BASE_URL_PROMIEDOS}/${escudoRelativo.replace(/^\//, '')}` : "",
                        intPlayed: pj,
                        intGoalDifference: dif,
                        intPoints: pts
                    });
                }
            });
        });

        return { table: tablaConsolidada };
    } catch (error) {
        console.error("Error en scraper de posiciones Argentina:", error.message);
        return { table: [] };
    }
}

module.exports = {
    obtenerPartidos,
    obtenerPosiciones
};