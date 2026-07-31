// Configuración de las ligas soportadas
const CONFIG_LIGAS = {
    ARG: { id: 'ARG', nombre: 'Liga Profesional Argentina', tipo: 'ARG' },
    PL:  { id: 'PL',  nombre: 'Premier League', tipo: 'EUR' },
    PD:  { id: 'PD',  nombre: 'LaLiga', tipo: 'EUR' },
    SA:  { id: 'SA',  nombre: 'Serie A', tipo: 'EUR' },
    BL1: { id: 'BL1', nombre: 'Bundesliga', tipo: 'EUR' },
    FL1: { id: 'FL1', nombre: 'Ligue 1', tipo: 'EUR' },
    CL:  { id: 'CL',  nombre: 'UEFA Champions League', tipo: 'EUR' }
};

function obtenerEndpointsLiga(codigoLiga) {
    if (codigoLiga === 'ARG') {
        return {
            posiciones: '/api/arg/posiciones',
            partidos: '/api/arg/partidos'
        };
    }
    return {
        posiciones: `/api/posiciones?liga=${codigoLiga}`,
        partidos: `/api/partidos?liga=${codigoLiga}`
    };
}