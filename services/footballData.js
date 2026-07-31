const BASE_URL = "https://api.football-data.org/v4";

async function consultar(endpoint) {
    const API_KEY = process.env.API_KEY;

    if (!API_KEY) {
        throw new Error("Falta API_KEY en el archivo .env");
    }

    const response = await fetch(`${BASE_URL}${endpoint}`, {
        headers: {
            "X-Auth-Token": API_KEY,
            "User-Agent": "Los3Puntos"
        }
    });

    if (!response.ok) {
        throw new Error(`FootballData respondió con estado ${response.status}`);
    }

    return await response.json();
}

async function obtenerPartidos(liga, season) {
    // Si la API rechaza seasons futuras en plan free, se puede omitir el parámetro
    const temporada = season ? `&season=${season}` : "";
    return consultar(`/competitions/${liga}/matches?limit=100${temporada}`);
}

async function obtenerPosiciones(liga, season) {
    const temporada = season ? `?season=${season}` : "";
    return consultar(`/competitions/${liga}/standings${temporada}`);
}

async function obtenerEquipos(liga) {
    return consultar(`/competitions/${liga}/teams`);
}

module.exports = {
    obtenerPartidos,
    obtenerPosiciones,
    obtenerEquipos
};