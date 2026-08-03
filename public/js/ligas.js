export const CONFIG_LIGAS = {
    'ARG':  { nombre: 'Liga Profesional' },
    'COPA': { nombre: 'Copa Argentina' },
    'PN':   { nombre: 'Primera Nacional' },
    'LIB':  { nombre: 'Libertadores' },
    'SUD':  { nombre: 'Sudamericana' },
    'PL':   { nombre: 'Premier League' },
    'PD':   { nombre: 'LaLiga' },
    'SA':   { nombre: 'Serie A' },
    'BL1':  { nombre: 'Bundesliga' },
    'FL1':  { nombre: 'Ligue 1' },
    'CL':   { nombre: 'Champions' },
    'EL':   { nombre: 'Europa League' },
    'CONF': { nombre: 'Conference League' }
};

export function obtenerEndpointsLiga(codigoLiga) {
    // Todas las ligas usan el mismo patrón de rutas: /api/posiciones/<COD> y /api/partidos/<COD>
    return {
        posiciones: `/api/posiciones/${codigoLiga}`,
        partidos: `/api/partidos/${codigoLiga}`
    };
}
