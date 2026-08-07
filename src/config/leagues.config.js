// src/config/leagues.config.js

const NOMBRES_LIGAS = {
    ARG: 'Liga Profesional Argentina',
    COPA: 'Copa Argentina',
    PN: 'Primera Nacional',
    PBM: 'Primera B Metropolitana',
    PCM: 'Primera C Metropolitana',
    FAA: 'Argentino A',
    LIB: 'CONMEBOL Libertadores',
    SUD: 'CONMEBOL Sudamericana',
    PL: 'Premier League',
    PD: 'LaLiga',
    SA: 'Serie A',
    BL1: 'Bundesliga',
    FL1: 'Ligue 1',
    CL: 'Champions League',
    EL: 'Europa League',
    CONF: 'Conference League',
    URU: 'Primera División',
    PAR: 'Copa de Primera',
    COL: 'Liga BetPlay',
    MEX: 'Liga MX',
    MLS: 'MLS',
    BRA: 'Brasileirão',
    CHI: 'Primera División',
    POR: 'Primeira Liga'
};

const LOGOS_LIGAS = {
    ARG: 'https://media.api-sports.io/football/leagues/128.png',
    PL: 'https://media.api-sports.io/football/leagues/39.png',
    PD: 'https://media.api-sports.io/football/leagues/140.png',
    SA: 'https://media.api-sports.io/football/leagues/135.png',
    BL1: 'https://media.api-sports.io/football/leagues/78.png',
    FL1: 'https://media.api-sports.io/football/leagues/61.png',
    CL: 'https://media.api-sports.io/football/leagues/2.png',
    EL: 'https://media.api-sports.io/football/leagues/3.png',
    CONF: 'https://media.api-sports.io/football/leagues/848.png',
    PN: 'https://media.api-sports.io/football/leagues/129.png',
    LIB: 'https://media.api-sports.io/football/leagues/13.png',
    SUD: 'https://media.api-sports.io/football/leagues/11.png',
    COPA: 'https://media.api-sports.io/football/leagues/130.png',
    PBM: 'https://media.api-sports.io/football/leagues/131.png',
    PCM: 'https://media.api-sports.io/football/leagues/132.png',
    FAA: 'https://media.api-sports.io/football/leagues/133.png',
    URU: 'https://media.api-sports.io/football/leagues/268.png',
    PAR: 'https://media.api-sports.io/football/leagues/250.png',
    COL: 'https://media.api-sports.io/football/leagues/239.png',
    MEX: 'https://media.api-sports.io/football/leagues/262.png',
    CHI: 'https://media.api-sports.io/football/leagues/265.png',
    MLS: 'https://media.api-sports.io/football/leagues/253.png',
    BRA: 'https://media.api-sports.io/football/leagues/71.png',
    POR: 'https://media.api-sports.io/football/leagues/94.png'
};

const TZ_ARGENTINA = 'America/Argentina/Buenos_Aires';

module.exports = { NOMBRES_LIGAS, LOGOS_LIGAS, TZ_ARGENTINA };