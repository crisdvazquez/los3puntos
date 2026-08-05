export const CONFIG_LIGAS = {
    'ARG':  { nombre: 'Liga Profesional', seccion: 'argentina', slug: 'liga-profesional' },
    'COPA': { nombre: 'Copa Argentina', seccion: 'argentina', slug: 'copa-argentina' },
    'PN':   { nombre: 'Primera Nacional', seccion: 'argentina', slug: 'primera-nacional' },
    'PBM':  { nombre: 'Primera B Metropolitana', seccion: 'argentina', slug: 'primera-b-metropolitana' },
    'PCM':  { nombre: 'Primera C Metropolitana', seccion: 'argentina', slug: 'primera-c-metropolitana' },
    'FAA':  { nombre: 'Argentino A', seccion: 'argentina', slug: 'argentino-a' },
    'LIB':  { nombre: 'Libertadores', seccion: 'copas-internacionales', slug: 'libertadores' },
    'SUD':  { nombre: 'Sudamericana', seccion: 'copas-internacionales', slug: 'sudamericana' },
    'PL':   { nombre: 'Premier League', seccion: 'europa', slug: 'premier-league' },
    'PD':   { nombre: 'LaLiga', seccion: 'europa', slug: 'laliga' },
    'SA':   { nombre: 'Serie A', seccion: 'europa', slug: 'serie-a' },
    'BL1':  { nombre: 'Bundesliga', seccion: 'europa', slug: 'bundesliga' },
    'FL1':  { nombre: 'Ligue 1', seccion: 'europa', slug: 'ligue-1' },
    'CL':   { nombre: 'Champions', seccion: 'copas-internacionales', slug: 'champions-league' },
    'EL':   { nombre: 'Europa League', seccion: 'copas-internacionales', slug: 'europa-league' },
    'CONF': { nombre: 'Conference League', seccion: 'copas-internacionales', slug: 'conference-league' },
    'URU':  { nombre: 'Primera División', seccion: 'sudamerica', slug: 'primera-division-uruguay' },
    'PAR':  { nombre: 'Copa de Primera', seccion: 'sudamerica', slug: 'copa-de-primera' },
    'COL':  { nombre: 'Liga BetPlay', seccion: 'sudamerica', slug: 'liga-betplay' },
    'MEX':  { nombre: 'Liga MX', seccion: 'concacaf', slug: 'liga-mx' },
    'MLS':  { nombre: 'MLS', seccion: 'concacaf', slug: 'mls' },
    'BRA':  { nombre: 'Brasileirão', seccion: 'sudamerica', slug: 'brasileirao' },
    'CHI':  { nombre: 'Primera División', seccion: 'sudamerica', slug: 'primera-division-chile' },
    'POR':  { nombre: 'Primeira Liga', seccion: 'europa', slug: 'primeira-liga' }
};

export function obtenerRutaLiga(codigoLiga) {
    const config = CONFIG_LIGAS[codigoLiga];
    return config ? `/liga/${config.seccion}/${config.slug}` : '/';
}

export function obtenerLigaDesdeRuta() {
    const partes = window.location.pathname.split('/').filter(Boolean);
    if (partes.length !== 3 || partes[0] !== 'liga') return 'HOME';
    return Object.entries(CONFIG_LIGAS).find(([, config]) =>
        config.seccion === partes[1] && config.slug === partes[2]
    )?.[0] || 'HOME';
}

export function obtenerEndpointsLiga(codigoLiga) {
    // Todas las ligas usan el mismo patrón de rutas: /api/posiciones/<COD> y /api/partidos/<COD>
    return {
        posiciones: `/api/posiciones/${codigoLiga}`,
        partidos: `/api/partidos/${codigoLiga}`
    };
}
