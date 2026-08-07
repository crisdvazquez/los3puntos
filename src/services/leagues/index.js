// src/services/leagues/index.js
const { StandardLeagueAdapter, LIGAS_MAP } = require("./StandardLeagueAdapter");
const ArgentinaLeagueAdapter = require("./ArgentinaLeagueAdapter");

const adapters = {};

Object.keys(LIGAS_MAP).forEach(code => {
    adapters[code] = new StandardLeagueAdapter(code);
});

adapters['ARG'] = new ArgentinaLeagueAdapter();

function getLeagueAdapter(leagueCode) {
    const adapter = adapters[leagueCode];
    if (!adapter) throw new Error(`Liga no soportada: ${leagueCode}`);
    return adapter;
}

module.exports = getLeagueAdapter;