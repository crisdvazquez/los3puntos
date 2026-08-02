export const CONFIG_LIGAS = {
    'PL': { nombre: 'Premier League' },
    'PD': { nombre: 'LaLiga' },
    'SA': { nombre: 'Serie A' },
    'BL1': { nombre: 'Bundesliga' },
    'FL1': { nombre: 'Ligue 1' },
    'CL': { nombre: 'Champions League' },
    'ARG': { nombre: 'Liga Profesional Argentina' }
};

export function obtenerEndpointsLiga(codigoLiga) {
    // Para mantener compatibilidad con las rutas del backend:
    // - Argentina usa rutas /api/arg/posiciones y /api/arg/partidos
    // - Otras ligas usan /api/posiciones/<COD> y /api/partidos/<COD>
    if (codigoLiga === 'ARG') {
        return {
            posiciones: `/api/arg/posiciones`,
            partidos: `/api/arg/partidos`
        };
    }

    return {
        posiciones: `/api/posiciones/${codigoLiga}`,
        partidos: `/api/partidos/${codigoLiga}`
    };
}
